import express from 'express';
import { readDb, writeDb } from '../../storage/index.js';
import { auth, requireRole, ensureConsent } from '../../middleware/auth.js';
import { nowIso, todayDate, DASS_QUESTIONS, DASS_SUBSCALES } from '../../utils/helpers.js';
import {
  severityLabel,
  riskFromSeverityMap,
  ensureCycle,
  scorePhq9,
  scoreGad7,
  trajectoryFromEsm
} from '../../utils/scoring.js';

const router = express.Router();

// Helper: Create classification and notification
function createClassification(db, studentId, cycleId, riskLevel, trajectory = null, meta = {}) {
  const classification = {
    classificationId: db.counters.classificationId++,
    studentId,
    cycleId,
    riskLevel,
    trajectory,
    generatedAt: nowIso(),
    meta
  };
  db.riskClassifications.push(classification);

  const actionType = riskLevel === 'Low'
    ? 'Show Ginhawa psychoeducational content'
    : riskLevel === 'Moderate'
      ? 'Prompt repeat DASS-21 and show OGC appointment scheduler'
      : riskLevel === 'High'
        ? 'Send anonymized OGC notification'
        : 'Send priority alert with identity + show hotline';

  db.referralActions.push({
    actionId: db.counters.actionId++,
    classificationId: classification.classificationId,
    actionType,
    dispatchedAt: nowIso(),
    acknowledgedAt: null
  });

  return classification;
}

function createNotification(db, classificationId, message, anonymizedFlag) {
  const facilitator = db.facilitators[0];
  db.notifications.push({
    notifId: db.counters.notifId++,
    facilitatorId: facilitator.facilitatorId,
    classificationId,
    anonymizedFlag,
    sentAt: nowIso(),
    message
  });
}

// DASS-21 Questions
router.get('/dass21/questions', auth, ensureConsent, async (req, res) => {
  return res.json({
    success: true,
    data: {
      scale: [
        { value: 0, label: 'Did not apply to me at all' },
        { value: 1, label: 'Applied to me to some degree / some of the time' },
        { value: 2, label: 'Applied to me to a considerable degree / a good part of time' },
        { value: 3, label: 'Applied to me very much / most of the time' }
      ],
      questions: DASS_QUESTIONS
    }
  });
});

// DASS-21 Submit
router.post('/dass21/submit', auth, ensureConsent, async (req, res) => {
  const { responses } = req.body || {};
  if (!Array.isArray(responses) || responses.length !== 21) {
    return res.status(400).json({ success: false, message: 'Exactly 21 responses are required.' });
  }

  const scoresByItem = new Map();
  for (const r of responses) {
    const itemNumber = Number(r.itemNumber);
    const score = Number(r.score);
    if (itemNumber < 1 || itemNumber > 21 || Number.isNaN(score) || score < 0 || score > 3) {
      return res.status(400).json({ success: false, message: 'Each response must have valid itemNumber (1-21) and score (0-3).' });
    }
    scoresByItem.set(itemNumber, score);
  }

  if (scoresByItem.size !== 21) {
    return res.status(400).json({ success: false, message: 'Responses must include all 21 unique items.' });
  }

  const db = await readDb();
  const cycle = ensureCycle(db, req.user.studentId, todayDate);

  const assessment = {
    assessmentId: db.counters.assessmentId++,
    studentId: req.user.studentId,
    type: 'DASS21',
    submittedAt: nowIso(),
    cycleId: cycle.cycleId
  };
  db.assessments.push(assessment);

  DASS_QUESTIONS.forEach((q) => {
    db.dass21Responses.push({
      responseId: db.counters.responseId++,
      assessmentId: assessment.assessmentId,
      itemNumber: q.itemNumber,
      score: scoresByItem.get(q.itemNumber),
      subscale: q.subscale
    });
  });

  const rawDepression = DASS_SUBSCALES.D.reduce((sum, n) => sum + scoresByItem.get(n), 0);
  const rawAnxiety = DASS_SUBSCALES.A.reduce((sum, n) => sum + scoresByItem.get(n), 0);
  const rawStress = DASS_SUBSCALES.S.reduce((sum, n) => sum + scoresByItem.get(n), 0);

  const depression = rawDepression * 2;
  const anxiety = rawAnxiety * 2;
  const stress = rawStress * 2;

  const labels = {
    D: severityLabel('D', depression),
    A: severityLabel('A', anxiety),
    S: severityLabel('S', stress)
  };

  let riskLevel = riskFromSeverityMap(labels);
  if (Object.values(labels).includes('Extremely Severe')) {
    riskLevel = 'Crisis';
  }

  const classification = createClassification(db, req.user.studentId, cycle.cycleId, riskLevel, null, {
    source: 'DASS21',
    subscaleScores: { depression, anxiety, stress },
    subscaleLabels: labels
  });

  if (riskLevel === 'High') {
    createNotification(
      db,
      classification.classificationId,
      `High risk (anonymized): StudentID=${req.user.studentId}, DASS summary D=${depression}, A=${anxiety}, S=${stress}`,
      true
    );
  }

  if (riskLevel === 'Crisis') {
    const student = db.students.find((s) => s.studentId === req.user.studentId);
    createNotification(
      db,
      classification.classificationId,
      `CRISIS alert: ${student.name} (${student.studentId}) reached extremely severe DASS threshold.`,
      false
    );
  }

  await writeDb(db);

  return res.json({
    success: true,
    data: {
      riskLevel,
      subscaleScores: { depression, anxiety, stress },
      subscaleLabels: labels,
      referralTriggered: true
    }
  });
});

// PHQ-9 Submit
router.post('/phq9/submit', auth, ensureConsent, async (req, res) => {
  const { scores } = req.body || {};
  if (!Array.isArray(scores) || scores.length !== 9) {
    return res.status(400).json({ success: false, message: 'Exactly 9 PHQ-9 scores are required.' });
  }

  const scoresByItem = new Map();
  let totalScore = 0;
  for (const s of scores) {
    const itemNumber = Number(s.itemNumber);
    const score = Number(s.score);
    if (itemNumber < 1 || itemNumber > 9 || Number.isNaN(score) || score < 0 || score > 3) {
      return res.status(400).json({ success: false, message: 'Each score must have valid itemNumber (1-9) and score (0-3).' });
    }
    scoresByItem.set(itemNumber, score);
    totalScore += score;
  }

  if (scoresByItem.size !== 9) {
    return res.status(400).json({ success: false, message: 'Responses must include all 9 unique items.' });
  }

  const db = await readDb();
  const cycle = ensureCycle(db, req.user.studentId, todayDate);

  db.assessments.push({
    assessmentId: db.counters.assessmentId++,
    studentId: req.user.studentId,
    type: 'PHQ9',
    submittedAt: nowIso(),
    cycleId: cycle.cycleId
  });

  const { severity: riskLevel } = scorePhq9(Object.fromEntries(scoresByItem));

  const classification = createClassification(db, req.user.studentId, cycle.cycleId, riskLevel, null, {
    source: 'PHQ9',
    totalScore,
    items: Object.fromEntries(scoresByItem)
  });

  if (riskLevel === 'Crisis' || riskLevel === 'High') {
    const student = db.students.find((s) => s.studentId === req.user.studentId);
    createNotification(
      db,
      classification.classificationId,
      `${riskLevel} depression risk: ${student.name} (${student.studentId}) PHQ-9 score=${totalScore}.`,
      true
    );
  }

  await writeDb(db);
  return res.json({
    success: true,
    data: {
      riskLevel,
      totalScore,
      referralTriggered: riskLevel !== 'Low'
    }
  });
});

// GAD-7 Submit
router.post('/gad7/submit', auth, ensureConsent, async (req, res) => {
  const { scores } = req.body || {};
  if (!Array.isArray(scores) || scores.length !== 7) {
    return res.status(400).json({ success: false, message: 'Exactly 7 GAD-7 scores are required.' });
  }

  const scoresByItem = new Map();
  let totalScore = 0;
  for (const s of scores) {
    const itemNumber = Number(s.itemNumber);
    const score = Number(s.score);
    if (itemNumber < 1 || itemNumber > 7 || Number.isNaN(score) || score < 0 || score > 3) {
      return res.status(400).json({ success: false, message: 'Each score must have valid itemNumber (1-7) and score (0-3).' });
    }
    scoresByItem.set(itemNumber, score);
    totalScore += score;
  }

  if (scoresByItem.size !== 7) {
    return res.status(400).json({ success: false, message: 'Responses must include all 7 unique items.' });
  }

  const db = await readDb();
  const cycle = ensureCycle(db, req.user.studentId, todayDate);

  db.assessments.push({
    assessmentId: db.counters.assessmentId++,
    studentId: req.user.studentId,
    type: 'GAD7',
    submittedAt: nowIso(),
    cycleId: cycle.cycleId
  });

  const { severity: riskLevel } = scoreGad7(Object.fromEntries(scoresByItem));

  const classification = createClassification(db, req.user.studentId, cycle.cycleId, riskLevel, null, {
    source: 'GAD7',
    totalScore,
    items: Object.fromEntries(scoresByItem)
  });

  if (riskLevel === 'Crisis' || riskLevel === 'High') {
    const student = db.students.find((s) => s.studentId === req.user.studentId);
    createNotification(
      db,
      classification.classificationId,
      `${riskLevel} anxiety risk: ${student.name} (${student.studentId}) GAD-7 score=${totalScore}.`,
      true
    );
  }

  await writeDb(db);
  return res.json({
    success: true,
    data: {
      riskLevel,
      totalScore,
      referralTriggered: riskLevel !== 'Low'
    }
  });
});

// ESM Submit
router.post('/esm/submit', auth, ensureConsent, async (req, res) => {
  const { moodScore, energyScore, stressorCategory, physicalSymptom, helpIntent } = req.body || {};
  if (
    Number.isNaN(Number(moodScore)) || Number(moodScore) < 1 || Number(moodScore) > 10 ||
    Number.isNaN(Number(energyScore)) || Number(energyScore) < 1 || Number(energyScore) > 10 ||
    !stressorCategory || typeof physicalSymptom !== 'boolean' || typeof helpIntent !== 'boolean'
  ) {
    return res.status(400).json({ success: false, message: 'Invalid ESM payload.' });
  }

  const db = await readDb();
  db.esmEntries.push({
    entryId: db.counters.esmEntryId++,
    studentId: req.user.studentId,
    promptTime: nowIso(),
    moodScore: Number(moodScore),
    energyScore: Number(energyScore),
    stressorCategory,
    physicalSymptom,
    helpIntent
  });

  const studentEntries = db.esmEntries.filter((e) => e.studentId === req.user.studentId);
  const trajectory = trajectoryFromEsm(studentEntries);

  const latestRisk = [...db.riskClassifications]
    .filter((c) => c.studentId === req.user.studentId)
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
    .pop();

  let generatedNotification = false;
  if (trajectory.label === 'At-Risk' && latestRisk && latestRisk.riskLevel === 'High') {
    const cycle = ensureCycle(db, req.user.studentId, todayDate);
    const classification = createClassification(db, req.user.studentId, cycle.cycleId, 'High', trajectory.label, {
      source: 'ESM',
      slopes: trajectory
    });
    createNotification(
      db,
      classification.classificationId,
      `At-Risk trajectory + existing High risk (anonymized): StudentID=${req.user.studentId}`,
      true
    );
    generatedNotification = true;
  }

  await writeDb(db);
  return res.json({ success: true, data: { trajectory, generatedNotification } });
});

// Dashboard
router.get('/dashboard', auth, requireRole('student'), async (req, res) => {
  const db = await readDb();
  const student = db.students.find((s) => s.studentId === req.user.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  const latestClassification = [...db.riskClassifications]
    .filter((c) => c.studentId === req.user.studentId)
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
    .pop() || null;

  const moodSeries = db.esmEntries
    .filter((e) => e.studentId === req.user.studentId)
    .sort((a, b) => a.promptTime.localeCompare(b.promptTime))
    .map((e) => ({
      promptTime: e.promptTime,
      moodScore: e.moodScore,
      energyScore: e.energyScore
    }));

  const riskLevel = latestClassification?.riskLevel || 'Low';
  const triggerActions = {
    Low: 'Shows Ginhawa psychoeducational content',
    Moderate: 'Prompts another DASS-21 + shows OGC appointment scheduler',
    High: 'Sends anonymized OGC notification',
    Crisis: 'Sends priority alert with identity to OGC + shows hotline on student screen'
  };

  return res.json({
    success: true,
    data: {
      student: {
        studentId: student.studentId,
        name: student.name,
        consentFlag: student.consentFlag
      },
      latestClassification,
      riskLevel,
      nextAction: triggerActions[riskLevel],
      moodSeries
    }
  });
});

export default router;
