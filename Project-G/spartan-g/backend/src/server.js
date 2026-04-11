import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'spartan-g-dev-secret';
const DB_PATH = path.resolve('data/db.json');

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

function defaultDb() {
  return {
    counters: {
      cycleId: 1,
      assessmentId: 1,
      responseId: 1,
      esmEntryId: 1,
      classificationId: 1,
      actionId: 1,
      notifId: 1
    },
    students: [],
    assessmentCycles: [],
    assessments: [],
    dass21Responses: [],
    esmEntries: [],
    riskClassifications: [],
    referralActions: [],
    facilitators: [
      { facilitatorId: 1, name: 'Default OGC', assignedCollege: 'All', email: 'ogc@campus.local' }
    ],
    notifications: []
  };
}

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = defaultDb();
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

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

function ensureConsent(req, res, next) {
  const db = readDb();
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
  const { studentId, name, email, password, college, yearLevel, sex } = req.body || {};
  if (!studentId || !name || !password || !college || !yearLevel || !sex) {
    return res.status(400).json({ success: false, message: 'Missing required signup fields.' });
  }

  const db = readDb();
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

  writeDb(db);
  return res.status(201).json({ success: true, message: 'Signup successful.' });
});

app.post('/api/auth/login', async (req, res) => {
  const { studentId, password } = req.body || {};
  if (!studentId || !password) {
    return res.status(400).json({ success: false, message: 'studentId and password are required.' });
  }

  const db = readDb();
  const student = db.students.find((s) => s.studentId === studentId);
  if (!student) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const ok = await bcrypt.compare(password, student.passwordHash);
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const token = jwt.sign({ studentId: student.studentId, role: 'Student' }, JWT_SECRET, { expiresIn: '12h' });
  return res.json({
    success: true,
    data: {
      token,
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
});

app.get('/api/student/me', auth, (req, res) => {
  const db = readDb();
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

app.post('/api/student/consent', auth, (req, res) => {
  const { consent } = req.body || {};
  if (typeof consent !== 'boolean') {
    return res.status(400).json({ success: false, message: 'consent must be boolean.' });
  }
  const db = readDb();
  const student = db.students.find((s) => s.studentId === req.user.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  student.consentFlag = consent;
  writeDb(db);

  return res.json({
    success: true,
    data: {
      consentFlag: student.consentFlag,
      message: consent ? 'Consent acknowledged.' : 'Consent withdrawn. Assessments blocked until re-consent.'
    }
  });
});

app.get('/api/student/dass21/questions', auth, ensureConsent, (req, res) => {
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

app.post('/api/student/dass21/submit', auth, ensureConsent, (req, res) => {
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

  const db = readDb();
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

  writeDb(db);

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

app.post('/api/student/cssrs/submit', auth, ensureConsent, (req, res) => {
  const { item1, item2, item3 } = req.body || {};
  if ([item1, item2, item3].some((v) => typeof v !== 'boolean')) {
    return res.status(400).json({ success: false, message: 'item1, item2, item3 must be boolean.' });
  }

  const db = readDb();
  const cycle = ensureCycle(db, req.user.studentId);

  db.assessments.push({
    assessmentId: db.counters.assessmentId++,
    studentId: req.user.studentId,
    type: 'CSSRS',
    submittedAt: nowIso(),
    cycleId: cycle.cycleId
  });

  if (item3) {
    const classification = createClassification(db, req.user.studentId, cycle.cycleId, 'Crisis', null, {
      source: 'CSSRS',
      cssrs: { item1, item2, item3 }
    });

    const student = db.students.find((s) => s.studentId === req.user.studentId);
    createNotification(
      db,
      classification.classificationId,
      `CRISIS alert (identity revealed per rule): ${student.name} (${student.studentId}) active suicidal ideation item=3 yes.`,
      false
    );

    writeDb(db);
    return res.json({
      success: true,
      data: {
        crisisFlag: true,
        riskLevel: 'Crisis',
        hotline: ['NCMH Crisis Hotline: 1553', 'Hopeline PH: +63 917 558 4673'],
        priorityAlertSent: true
      }
    });
  }

  writeDb(db);
  return res.json({ success: true, data: { crisisFlag: false, message: 'No crisis threshold triggered.' } });
});

app.post('/api/student/esm/submit', auth, ensureConsent, (req, res) => {
  const { moodScore, energyScore, stressorCategory, physicalSymptom, helpIntent } = req.body || {};
  if (
    Number.isNaN(Number(moodScore)) || Number(moodScore) < 1 || Number(moodScore) > 10 ||
    Number.isNaN(Number(energyScore)) || Number(energyScore) < 1 || Number(energyScore) > 10 ||
    !stressorCategory || typeof physicalSymptom !== 'boolean' || typeof helpIntent !== 'boolean'
  ) {
    return res.status(400).json({ success: false, message: 'Invalid ESM payload.' });
  }

  const db = readDb();
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

  writeDb(db);
  return res.json({ success: true, data: { trajectory, generatedNotification } });
});

app.get('/api/student/dashboard', auth, (req, res) => {
  const db = readDb();
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

app.listen(PORT, () => {
  console.log(`SPARTAN-G backend running on http://localhost:${PORT}`);
});
