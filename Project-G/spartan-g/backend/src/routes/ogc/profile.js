import express from 'express';
import { readDb, writeDb } from '../../storage/index.js';
import { auth, requireRole } from '../../middleware/auth.js';
import { pseudonymizeStudentId, nowIso } from '../../utils/helpers.js';
import { getAuthorizedStudents, resolveAuthorizedStudent } from '../../utils/ogcScope.js';

const router = express.Router();

// Get OGC profile
router.get('/me', auth, requireRole('ogc'), async (req, res) => {
  const db = await readDb();
  const facilitator = db.facilitators.find((f) => Number(f.facilitatorId) === Number(req.user.facilitatorId));
  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  return res.json({
    success: true,
    data: {
      facilitatorId: facilitator.facilitatorId,
      name: facilitator.name,
      assignedCollege: facilitator.assignedCollege,
      email: facilitator.email
    }
  });
});

// Get OGC dashboard
router.get('/dashboard', auth, requireRole('ogc'), async (req, res) => {
  const db = await readDb();
  const facilitator = db.facilitators.find((f) => Number(f.facilitatorId) === Number(req.user.facilitatorId));
  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  const studentsInScope = getAuthorizedStudents(db, facilitator);

  const latestClassifications = new Map();
  for (const student of studentsInScope) {
    const latest = [...db.riskClassifications]
      .filter((c) => c.studentId === student.studentId)
      .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
      .pop() || null;
    latestClassifications.set(student.studentId, latest);
  }

  const students = studentsInScope.map((student) => {
    const latest = latestClassifications.get(student.studentId);
    const moodEntries = db.esmEntries
      .filter((e) => e.studentId === student.studentId)
      .sort((a, b) => b.promptTime.localeCompare(a.promptTime));
    const latestEsm = moodEntries[0] || null;
    const avgMood = moodEntries.length
      ? Number((moodEntries.reduce((sum, e) => sum + e.moodScore, 0) / moodEntries.length).toFixed(2))
      : null;
    const avgEnergy = moodEntries.length
      ? Number((moodEntries.reduce((sum, e) => sum + e.energyScore, 0) / moodEntries.length).toFixed(2))
      : null;

    const contact = latest?.riskLevel === 'Crisis'
      ? {
          canContact: true,
          canRevealContact: Boolean(student.consentFlag),
          pseudoId: pseudonymizeStudentId(student.studentId)
        }
      : {
          canContact: false,
          canRevealContact: false,
          pseudoId: pseudonymizeStudentId(student.studentId)
        };

    return {
      pseudoId: pseudonymizeStudentId(student.studentId),
      college: student.college,
      yearLevel: student.yearLevel,
      consentFlag: student.consentFlag,
      latestRiskLevel: latest?.riskLevel || 'Low',
      latestTrajectory: latest?.trajectory || 'Stable',
      latestClassificationAt: latest?.generatedAt || null,
      averageMood: avgMood,
      averageEnergy: avgEnergy,
      latestEsmAt: latestEsm?.promptTime || null,
      source: latest?.meta?.source || null,
      contact
    };
  });

  const riskCounts = students.reduce((acc, student) => {
    const key = student.latestRiskLevel || 'Low';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { Low: 0, Moderate: 0, High: 0, Crisis: 0 });

  const criticalAlerts = students
    .filter((s) => s.latestRiskLevel === 'Crisis')
    .map((s) => ({
      pseudoId: s.pseudoId,
      latestClassificationAt: s.latestClassificationAt,
      contact: s.contact
    }))
    .sort((a, b) => `${b.latestClassificationAt || ''}`.localeCompare(`${a.latestClassificationAt || ''}`));

  return res.json({
    success: true,
    data: {
      facilitator: {
        facilitatorId: facilitator.facilitatorId,
        name: facilitator.name,
        assignedCollege: facilitator.assignedCollege,
        email: facilitator.email
      },
      summary: {
        totalStudents: students.length,
        riskCounts,
        criticalCount: criticalAlerts.length
      },
      criticalAlerts,
      students
    }
  });
});

// Contact student (crisis action)
router.post('/contact', auth, requireRole('ogc'), async (req, res) => {
  const { studentId, pseudoId, channel = 'Email', note = '' } = req.body || {};
  if (!studentId && !pseudoId) {
    return res.status(400).json({ success: false, message: 'studentId or pseudoId is required.' });
  }

  const db = await readDb();
  const facilitator = db.facilitators.find((f) => Number(f.facilitatorId) === Number(req.user.facilitatorId));
  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  const student = resolveAuthorizedStudent(db, facilitator, studentId || pseudoId);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found or not in your scope.' });
  }

  const latestClassification = [...db.riskClassifications]
    .filter((c) => c.studentId === student.studentId)
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
    .pop();

  if (!latestClassification || latestClassification.riskLevel !== 'Crisis') {
    return res.status(400).json({ success: false, message: 'Contact action is only enabled for Crisis risk level.' });
  }

  db.referralActions.push({
    actionId: db.counters.actionId++,
    classificationId: latestClassification.classificationId,
    actionType: `OGC outreach initiated via ${channel}`,
    dispatchedAt: nowIso(),
    acknowledgedAt: null
  });

  db.notifications.push({
    notifId: db.counters.notifId++,
    facilitatorId: facilitator.facilitatorId,
    classificationId: latestClassification.classificationId,
    anonymizedFlag: false,
    sentAt: nowIso(),
    message: `OGC outreach started for ${student.name} (${student.studentId}) via ${channel}. ${note}`.trim()
  });

  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Contact workflow logged successfully.',
      student: {
        pseudoId: pseudonymizeStudentId(student.studentId),
        canRevealContact: Boolean(student.consentFlag)
      }
    }
  });
});

export default router;
