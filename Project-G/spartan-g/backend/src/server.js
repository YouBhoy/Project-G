import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readDb, writeDb } from './storage/index.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'spartan-g-dev-secret';

const DASS_SUBSCALES = {
  D: [3, 5, 10, 13, 16, 17, 21],
  A: [2, 4, 7, 9, 15, 19, 20],
  S: [1, 6, 8, 11, 12, 14, 18]
};

const DASS_QUESTIONS = Array.from({ length: 21 }, (_, i) => {
  const itemNumber = i + 1;
  const subscale = Object.keys(DASS_SUBSCALES).find((k) => DASS_SUBSCALES[k].includes(itemNumber));
  return {
    itemNumber,
    subscale,
    text: `Dummy DASS-21 Question ${itemNumber}: Over the past week, I felt sample statement ${itemNumber}.`
  };
});

function nowIso() {
  return new Date().toISOString();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing auth token.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid auth token.' });
  }
}

function requireRole(expectedRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== expectedRole) {
      return res.status(403).json({ success: false, message: 'Forbidden for this role.' });
    }
    return next();
  };
}

function pseudonymizeStudentId(studentId) {
  const seed = `${studentId || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const token = Math.abs(hash).toString(36).toUpperCase().slice(0, 6).padStart(6, '0');
  return `STU-${token}`;
}

async function ensureConsent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Student access only.' });
  }
  const db = await readDb();
  const student = db.students.find((s) => s.studentId === req.user.studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }
  if (!student.consentFlag) {
    return res.status(403).json({ success: false, message: 'Consent required before assessments.' });
  }
  next();
}

function ensureCycle(db, studentId) {
  const active = db.assessmentCycles.find((c) => c.studentId === studentId && c.status === 'Active');
  if (active) return active;

  const newCycle = {
    cycleId: db.counters.cycleId++,
    studentId,
    startDate: todayDate(),
    endDate: null,
    status: 'Active'
  };
  db.assessmentCycles.push(newCycle);
  return newCycle;
}

function severityLabel(subscale, score) {
  if (subscale === 'D') {
    if (score <= 9) return 'Normal';
    if (score <= 13) return 'Mild';
    if (score <= 20) return 'Moderate';
    if (score <= 27) return 'Severe';
    return 'Extremely Severe';
  }
  if (subscale === 'A') {
    if (score <= 7) return 'Normal';
    if (score <= 9) return 'Mild';
    if (score <= 14) return 'Moderate';
    if (score <= 19) return 'Severe';
    return 'Extremely Severe';
  }
  if (score <= 14) return 'Normal';
  if (score <= 18) return 'Mild';
  if (score <= 25) return 'Moderate';
  if (score <= 33) return 'Severe';
  return 'Extremely Severe';
}

function riskFromSeverityMap(labels) {
  const allNormal = Object.values(labels).every((v) => v === 'Normal');
  if (allNormal) return 'Low';

  const anySevere = Object.values(labels).some((v) => v === 'Severe' || v === 'Extremely Severe');
  if (anySevere) return 'High';

  return 'Moderate';
}

function computeSlope(points) {
  if (points.length < 2) return 0;
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i + 1;
    const y = points[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denominator = (n * sumXX) - (sumX * sumX);
  if (!denominator) return 0;
  return ((n * sumXY) - (sumX * sumY)) / denominator;
}

function consecutiveLowDays(entries) {
  const byDay = new Map();
  entries.forEach((e) => {
    const day = e.promptTime.slice(0, 10);
    const avg = (e.moodScore + e.energyScore) / 2;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(avg);
  });

  const daily = Array.from(byDay.entries())
    .map(([day, values]) => ({ day, avg: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => a.day.localeCompare(b.day));

  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i -= 1) {
    if (daily[i].avg < 4) streak += 1;
    else break;
  }
  return streak;
}

function trajectoryFromEsm(entries) {
  const ordered = [...entries].sort((a, b) => a.promptTime.localeCompare(b.promptTime));
  const last7Days = ordered.filter((e) => {
    const t = new Date(e.promptTime).getTime();
    const diff = Date.now() - t;
    return diff <= (7 * 24 * 60 * 60 * 1000);
  });

  const moodSlope = computeSlope(last7Days.map((e) => e.moodScore));
  const energySlope = computeSlope(last7Days.map((e) => e.energyScore));
  const combinedSlope = Math.min(moodSlope, energySlope);
  const lowStreak = consecutiveLowDays(last7Days);

  if (combinedSlope < -0.8 || lowStreak >= 3) {
    return { label: 'At-Risk', moodSlope, energySlope, combinedSlope, lowStreak };
  }
  if (combinedSlope < -0.3) {
    return { label: 'Deteriorating', moodSlope, energySlope, combinedSlope, lowStreak };
  }
  return { label: 'Stable', moodSlope, energySlope, combinedSlope, lowStreak };
}

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

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.post('/api/auth/signup', async (req, res) => {
  const {
    role = 'student',
    studentId,
    name,
    email,
    password,
    college,
    yearLevel,
    sex,
    assignedCollege
  } = req.body || {};

  const normalizedRole = `${role}`.toLowerCase();
  const db = await readDb();

  if (normalizedRole === 'student') {
    if (!studentId || !name || !password || !college || !yearLevel || !sex) {
      return res.status(400).json({ success: false, message: 'Missing required student signup fields.' });
    }

    const exists = db.students.find((s) => s.studentId === studentId || (email && s.email === email));
    if (exists) {
      return res.status(409).json({ success: false, message: 'Student already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.students.push({
      studentId,
      name,
      email: email || null,
      passwordHash,
      college,
      yearLevel: Number(yearLevel),
      sex,
      consentFlag: false,
      registeredAt: nowIso()
    });

    await writeDb(db);
    return res.status(201).json({ success: true, message: 'Student signup successful.' });
  }

  if (normalizedRole === 'ogc') {
    if (!name || !email || !password || !assignedCollege) {
      return res.status(400).json({ success: false, message: 'Missing required OGC signup fields.' });
    }

    const facilitatorExists = db.facilitators.find((f) => `${f.email}`.toLowerCase() === `${email}`.toLowerCase());
    if (facilitatorExists) {
      return res.status(409).json({ success: false, message: 'OGC account already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nextFacilitatorId = db.facilitators.reduce((maxId, f) => Math.max(maxId, Number(f.facilitatorId) || 0), 0) + 1;
    db.facilitators.push({
      facilitatorId: nextFacilitatorId,
      name,
      assignedCollege,
      email,
      passwordHash
    });

    await writeDb(db);
    return res.status(201).json({ success: true, message: 'OGC signup successful.' });
  }

  return res.status(400).json({ success: false, message: 'Unsupported role value.' });
});

app.post('/api/auth/login', async (req, res) => {
  const { role = 'student', studentId, email, password } = req.body || {};
  const normalizedRole = `${role}`.toLowerCase();
  const db = await readDb();

  if (normalizedRole === 'student') {
    if (!studentId || !password) {
      return res.status(400).json({ success: false, message: 'studentId and password are required for student login.' });
    }

    const student = db.students.find((s) => s.studentId === studentId);
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const ok = await bcrypt.compare(password, student.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ studentId: student.studentId, role: 'student' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({
      success: true,
      data: {
        token,
        role: 'student',
        student: {
          studentId: student.studentId,
          name: student.name,
          college: student.college,
          yearLevel: student.yearLevel,
          sex: student.sex,
          consentFlag: student.consentFlag
        }
      }
    });
  }

  if (normalizedRole === 'ogc') {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required for OGC login.' });
    }

    const facilitator = db.facilitators.find((f) => `${f.email}`.toLowerCase() === `${email}`.toLowerCase());
    if (!facilitator || !facilitator.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid OGC credentials.' });
    }

    const ok = await bcrypt.compare(password, facilitator.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid OGC credentials.' });
    }

    const token = jwt.sign({ facilitatorId: facilitator.facilitatorId, role: 'ogc' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({
      success: true,
      data: {
        token,
        role: 'ogc',
        facilitator: {
          facilitatorId: facilitator.facilitatorId,
          name: facilitator.name,
          assignedCollege: facilitator.assignedCollege,
          email: facilitator.email
        }
      }
    });
  }

  return res.status(400).json({ success: false, message: 'Unsupported role value.' });
});

app.get('/api/student/me', auth, requireRole('student'), async (req, res) => {
  const db = await readDb();
  const student = db.students.find((s) => s.studentId === req.user.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  return res.json({
    success: true,
    data: {
      studentId: student.studentId,
      name: student.name,
      college: student.college,
      yearLevel: student.yearLevel,
      sex: student.sex,
      consentFlag: student.consentFlag
    }
  });
});

app.post('/api/student/consent', auth, requireRole('student'), async (req, res) => {
  const { consent } = req.body || {};
  if (typeof consent !== 'boolean') {
    return res.status(400).json({ success: false, message: 'consent must be boolean.' });
  }
  const db = await readDb();
  const student = db.students.find((s) => s.studentId === req.user.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  student.consentFlag = consent;
  await writeDb(db);

  return res.json({
    success: true,
    data: {
      consentFlag: student.consentFlag,
      message: consent ? 'Consent acknowledged.' : 'Consent withdrawn. Assessments blocked until re-consent.'
    }
  });
});

app.get('/api/student/dass21/questions', auth, ensureConsent, async (req, res) => {
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

app.post('/api/student/dass21/submit', auth, ensureConsent, async (req, res) => {
  const started = Date.now();
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
  const cycle = ensureCycle(db, req.user.studentId);

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

  const elapsedMs = Date.now() - started;
  return res.json({
    success: true,
    data: {
      riskLevel,
      subscaleScores: { depression, anxiety, stress },
      subscaleLabels: labels,
      generatedWithin3Seconds: elapsedMs < 3000,
      referralTriggered: true
    }
  });
});

app.post('/api/student/phq9/submit', auth, ensureConsent, async (req, res) => {
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
  const cycle = ensureCycle(db, req.user.studentId);

  db.assessments.push({
    assessmentId: db.counters.assessmentId++,
    studentId: req.user.studentId,
    type: 'PHQ9',
    submittedAt: nowIso(),
    cycleId: cycle.cycleId
  });

  let riskLevel = 'Low';
  if (totalScore >= 20) riskLevel = 'Crisis';
  else if (totalScore >= 15) riskLevel = 'High';
  else if (totalScore >= 10) riskLevel = 'Moderate';

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

app.post('/api/student/gad7/submit', auth, ensureConsent, async (req, res) => {
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
  const cycle = ensureCycle(db, req.user.studentId);

  db.assessments.push({
    assessmentId: db.counters.assessmentId++,
    studentId: req.user.studentId,
    type: 'GAD7',
    submittedAt: nowIso(),
    cycleId: cycle.cycleId
  });

  let riskLevel = 'Low';
  if (totalScore >= 15) riskLevel = 'Crisis';
  else if (totalScore >= 10) riskLevel = 'High';
  else if (totalScore >= 5) riskLevel = 'Moderate';

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

app.post('/api/student/esm/submit', auth, ensureConsent, async (req, res) => {
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
    const cycle = ensureCycle(db, req.user.studentId);
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

app.get('/api/student/dashboard', auth, requireRole('student'), async (req, res) => {
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

app.get('/api/ogc/me', auth, requireRole('ogc'), async (req, res) => {
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

app.get('/api/ogc/dashboard', auth, requireRole('ogc'), async (req, res) => {
  const db = await readDb();
  const facilitator = db.facilitators.find((f) => Number(f.facilitatorId) === Number(req.user.facilitatorId));
  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  const facilitatorScope = `${facilitator.assignedCollege || ''}`.trim().toLowerCase();
  const studentsInScope = db.students.filter((s) => {
    if (!facilitatorScope || facilitatorScope === 'all') return true;
    return `${s.college || ''}`.trim().toLowerCase() === facilitatorScope;
  });

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
          studentId: student.studentId,
          name: student.name,
          email: student.email
        }
      : {
          canContact: false
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

app.post('/api/ogc/contact', auth, requireRole('ogc'), async (req, res) => {
  const { studentId, channel = 'Email', note = '' } = req.body || {};
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'studentId is required.' });
  }

  const db = await readDb();
  const facilitator = db.facilitators.find((f) => Number(f.facilitatorId) === Number(req.user.facilitatorId));
  if (!facilitator) {
    return res.status(404).json({ success: false, message: 'Facilitator not found.' });
  }

  const student = db.students.find((s) => s.studentId === studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
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

  createNotification(
    db,
    latestClassification.classificationId,
    `OGC outreach started for ${student.name} (${student.studentId}) via ${channel}. ${note}`.trim(),
    false
  );

  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Contact workflow logged successfully.',
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email
      }
    }
  });
});

// GABAY MODULE - Availability Slots (OGC only)

app.post('/api/ogc/availability/create', auth, requireRole('ogc'), async (req, res) => {
  const { slotDate, startTime, endTime, maxSlots = 1 } = req.body || {};
  if (!slotDate || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'slotDate, startTime, endTime are required.' });
  }

  const db = await readDb();
  const slot = {
    slotId: db.counters.slotId++,
    facilitatorId: req.user.facilitatorId,
    slotDate,
    startTime,
    endTime,
    maxSlots: Number(maxSlots),
    bookedCount: 0,
    status: 'Available',
    createdAt: nowIso()
  };

  db.availabilitySlots.push(slot);
  await writeDb(db);

  return res.status(201).json({
    success: true,
    data: {
      message: 'Availability slot created successfully.',
      slot
    }
  });
});

app.get('/api/ogc/availability/list', auth, requireRole('ogc'), async (req, res) => {
  const db = await readDb();
  const slots = db.availabilitySlots.filter((s) => Number(s.facilitatorId) === Number(req.user.facilitatorId));

  return res.json({
    success: true,
    data: {
      totalSlots: slots.length,
      slots
    }
  });
});

app.delete('/api/ogc/availability/:slotId', auth, requireRole('ogc'), async (req, res) => {
  const slotId = Number(req.params.slotId);
  const db = await readDb();
  const slotIndex = db.availabilitySlots.findIndex(
    (s) => s.slotId === slotId && Number(s.facilitatorId) === Number(req.user.facilitatorId)
  );

  if (slotIndex === -1) {
    return res.status(404).json({ success: false, message: 'Slot not found or you lack permission.' });
  }

  const hasBookings = db.appointments.some((a) => a.slotId === slotId && a.status !== 'Cancelled');
  if (hasBookings) {
    return res.status(400).json({ success: false, message: 'Cannot delete slot with active bookings.' });
  }

  db.availabilitySlots.splice(slotIndex, 1);
  await writeDb(db);

  return res.json({
    success: true,
    data: { message: 'Availability slot deleted successfully.' }
  });
});

// GABAY MODULE - Appointments (Student)

app.get('/api/student/appointments/available', auth, requireRole('student'), async (req, res) => {
  const db = await readDb();
  const today = todayDate();

  const availableSlots = db.availabilitySlots
    .filter((s) => s.slotDate >= today && s.status === 'Available' && s.bookedCount < s.maxSlots)
    .map((s) => ({
      slotId: s.slotId,
      facilitatorId: s.facilitatorId,
      slotDate: s.slotDate,
      startTime: s.startTime,
      endTime: s.endTime,
      facilitatorName: db.facilitators.find((f) => f.facilitatorId === s.facilitatorId)?.name || 'Unknown'
    }))
    .sort((a, b) => a.slotDate.localeCompare(b.slotDate) || a.startTime.localeCompare(b.startTime));

  return res.json({
    success: true,
    data: {
      availableSlots
    }
  });
});

app.post('/api/student/appointments/book', auth, requireRole('student'), async (req, res) => {
  const { slotId, studentNotes = '' } = req.body || {};
  if (!slotId) {
    return res.status(400).json({ success: false, message: 'slotId is required.' });
  }

  const db = await readDb();
  const slot = db.availabilitySlots.find((s) => s.slotId === slotId);
  if (!slot) {
    return res.status(404).json({ success: false, message: 'Slot not found.' });
  }

  if (slot.bookedCount >= slot.maxSlots) {
    return res.status(400).json({ success: false, message: 'Slot is full.' });
  }

  const hasConflict = db.appointments.some(
    (a) => a.studentId === req.user.studentId && a.appointmentDate === slot.slotDate && a.status !== 'Cancelled'
  );
  if (hasConflict) {
    return res.status(400).json({ success: false, message: 'You already have an appointment on this date.' });
  }

  const appointment = {
    appointmentId: db.counters.appointmentId++,
    studentId: req.user.studentId,
    facilitatorId: slot.facilitatorId,
    slotId,
    appointmentDate: slot.slotDate,
    appointmentTime: slot.startTime,
    status: 'Requested',
    studentNotes: studentNotes || null,
    ogcNotes: null,
    rejectionReason: null,
    requestedAt: nowIso(),
    approvedAt: null,
    rejectedAt: null,
    completedAt: null
  };

  slot.bookedCount += 1;
  if (slot.bookedCount >= slot.maxSlots) {
    slot.status = 'Full';
  }

  db.appointments.push(appointment);
  await writeDb(db);

  return res.status(201).json({
    success: true,
    data: {
      message: 'Appointment booking requested successfully.',
      appointment
    }
  });
});

app.get('/api/student/appointments', auth, requireRole('student'), async (req, res) => {
  const db = await readDb();
  const appointments = db.appointments
    .filter((a) => a.studentId === req.user.studentId)
    .map((a) => {
      const facilitator = db.facilitators.find((f) => f.facilitatorId === a.facilitatorId);
      return {
        ...a,
        facilitatorName: facilitator?.name || 'Unknown',
        facilitatorEmail: facilitator?.email || null
      };
    });

  return res.json({
    success: true,
    data: {
      appointments
    }
  });
});

app.delete('/api/student/appointments/:appointmentId', auth, requireRole('student'), async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const db = await readDb();
  const appointment = db.appointments.find((a) => a.appointmentId === appointmentId);

  if (!appointment || appointment.studentId !== req.user.studentId) {
    return res.status(404).json({ success: false, message: 'Appointment not found or you lack permission.' });
  }

  if (appointment.status === 'Cancelled' || appointment.status === 'Completed') {
    return res.status(400).json({ success: false, message: `Cannot cancel a ${appointment.status} appointment.` });
  }

  const slot = db.availabilitySlots.find((s) => s.slotId === appointment.slotId);
  if (slot) {
    slot.bookedCount = Math.max(0, slot.bookedCount - 1);
    if (slot.bookedCount < slot.maxSlots) {
      slot.status = 'Available';
    }
  }

  appointment.status = 'Cancelled';
  await writeDb(db);

  return res.json({
    success: true,
    data: { message: 'Appointment cancelled successfully.' }
  });
});

// GABAY MODULE - Appointments (OGC)

app.get('/api/ogc/appointments', auth, requireRole('ogc'), async (req, res) => {
  const db = await readDb();
  const appointments = db.appointments
    .filter((a) => Number(a.facilitatorId) === Number(req.user.facilitatorId))
    .map((a) => {
      const student = db.students.find((s) => s.studentId === a.studentId);
      return {
        ...a,
        studentName: student?.name || 'Unknown',
        studentCollege: student?.college || null,
        pseudoId: pseudonymizeStudentId(a.studentId)
      };
    })
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const appointmentCounts = {
    Requested: appointments.filter((a) => a.status === 'Requested').length,
    Approved: appointments.filter((a) => a.status === 'Approved').length,
    Rejected: appointments.filter((a) => a.status === 'Rejected').length,
    Completed: appointments.filter((a) => a.status === 'Completed').length,
    Cancelled: appointments.filter((a) => a.status === 'Cancelled').length
  };

  return res.json({
    success: true,
    data: {
      totalAppointments: appointments.length,
      appointmentCounts,
      appointments
    }
  });
});

app.post('/api/ogc/appointments/:appointmentId/approve', auth, requireRole('ogc'), async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const { ogcNotes = '' } = req.body || {};
  const db = await readDb();
  const appointment = db.appointments.find((a) => a.appointmentId === appointmentId);

  if (!appointment || Number(appointment.facilitatorId) !== Number(req.user.facilitatorId)) {
    return res.status(404).json({ success: false, message: 'Appointment not found or you lack permission.' });
  }

  if (appointment.status !== 'Requested') {
    return res.status(400).json({ success: false, message: `Cannot approve a ${appointment.status} appointment.` });
  }

  appointment.status = 'Approved';
  appointment.approvedAt = nowIso();
  appointment.ogcNotes = ogcNotes || null;
  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Appointment approved successfully.',
      appointment
    }
  });
});

app.post('/api/ogc/appointments/:appointmentId/reject', auth, requireRole('ogc'), async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const { rejectionReason = '' } = req.body || {};
  const db = await readDb();
  const appointment = db.appointments.find((a) => a.appointmentId === appointmentId);

  if (!appointment || Number(appointment.facilitatorId) !== Number(req.user.facilitatorId)) {
    return res.status(404).json({ success: false, message: 'Appointment not found or you lack permission.' });
  }

  if (appointment.status !== 'Requested') {
    return res.status(400).json({ success: false, message: `Cannot reject a ${appointment.status} appointment.` });
  }

  const slot = db.availabilitySlots.find((s) => s.slotId === appointment.slotId);
  if (slot) {
    slot.bookedCount = Math.max(0, slot.bookedCount - 1);
    if (slot.bookedCount < slot.maxSlots) {
      slot.status = 'Available';
    }
  }

  appointment.status = 'Rejected';
  appointment.rejectedAt = nowIso();
  appointment.rejectionReason = rejectionReason || null;
  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Appointment rejected successfully.',
      appointment
    }
  });
});

app.post('/api/ogc/appointments/:appointmentId/complete', auth, requireRole('ogc'), async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const { ogcNotes = '' } = req.body || {};
  const db = await readDb();
  const appointment = db.appointments.find((a) => a.appointmentId === appointmentId);

  if (!appointment || Number(appointment.facilitatorId) !== Number(req.user.facilitatorId)) {
    return res.status(404).json({ success: false, message: 'Appointment not found or you lack permission.' });
  }

  if (appointment.status !== 'Approved') {
    return res.status(400).json({ success: false, message: `Can only complete Approved appointments.` });
  }

  appointment.status = 'Completed';
  appointment.completedAt = nowIso();
  appointment.ogcNotes = ogcNotes || null;
  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Appointment marked as complete.',
      appointment
    }
  });
});

// GABAY MODULE - Emergency Contacts

app.get('/api/emergency-contacts', async (req, res) => {
  const db = await readDb();
  return res.json({
    success: true,
    data: {
      emergencyContacts: db.emergencyContacts
    }
  });
});

app.post('/api/admin/emergency-contacts', async (req, res) => {
  const { contactType, name, description, phone, email, website, available24_7 = false, priority = 0 } = req.body || {};
  if (!contactType || !name || !phone) {
    return res.status(400).json({ success: false, message: 'contactType, name, phone are required.' });
  }

  const db = await readDb();
  const contact = {
    contactId: db.counters.contactId++,
    contactType,
    name,
    description: description || null,
    phone,
    email: email || null,
    website: website || null,
    available24_7: Boolean(available24_7),
    priority: Number(priority),
    createdAt: nowIso()
  };

  db.emergencyContacts.push(contact);
  await writeDb(db);

  return res.status(201).json({
    success: true,
    data: {
      message: 'Emergency contact created successfully.',
      contact
    }
  });
});

app.put('/api/admin/emergency-contacts/:contactId', async (req, res) => {
  const contactId = Number(req.params.contactId);
  const { contactType, name, description, phone, email, website, available24_7, priority } = req.body || {};
  const db = await readDb();
  const contact = db.emergencyContacts.find((c) => c.contactId === contactId);

  if (!contact) {
    return res.status(404).json({ success: false, message: 'Emergency contact not found.' });
  }

  if (contactType) contact.contactType = contactType;
  if (name) contact.name = name;
  if (description !== undefined) contact.description = description;
  if (phone) contact.phone = phone;
  if (email !== undefined) contact.email = email;
  if (website !== undefined) contact.website = website;
  if (available24_7 !== undefined) contact.available24_7 = Boolean(available24_7);
  if (priority !== undefined) contact.priority = Number(priority);

  await writeDb(db);

  return res.json({
    success: true,
    data: {
      message: 'Emergency contact updated successfully.',
      contact
    }
  });
});

app.delete('/api/admin/emergency-contacts/:contactId', async (req, res) => {
  const contactId = Number(req.params.contactId);
  const db = await readDb();
  const index = db.emergencyContacts.findIndex((c) => c.contactId === contactId);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Emergency contact not found.' });
  }

  db.emergencyContacts.splice(index, 1);
  await writeDb(db);

  return res.json({
    success: true,
    data: { message: 'Emergency contact deleted successfully.' }
  });
});

app.listen(PORT, () => {
  console.log(`SPARTAN-G backend running on http://localhost:${PORT}`);
});
