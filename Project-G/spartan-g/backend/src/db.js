import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SQLITE_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'spartan-g.sqlite');
const LEGACY_JSON_PATH = path.join(DATA_DIR, 'db.json');

const db = new Database(SQLITE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    college TEXT NOT NULL,
    year_level INTEGER NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
    consent_flag INTEGER NOT NULL DEFAULT 0,
    registered_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assessment_cycles (
    cycle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Complete')) DEFAULT 'Active',
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assessments (
    assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('DASS21', 'PHQ9', 'GAD7', 'ESM')),
    submitted_at TEXT NOT NULL,
    cycle_id INTEGER NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES assessment_cycles(cycle_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dass21_responses (
    response_id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL,
    item_number INTEGER NOT NULL,
    score INTEGER NOT NULL,
    subscale TEXT NOT NULL CHECK (subscale IN ('D', 'A', 'S')),
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS esm_entries (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    prompt_time TEXT NOT NULL,
    mood_score INTEGER NOT NULL,
    energy_score INTEGER NOT NULL,
    stressor_category TEXT NOT NULL,
    physical_symptom INTEGER NOT NULL,
    help_intent INTEGER NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS risk_classifications (
    classification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    cycle_id INTEGER NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Moderate', 'High', 'Crisis')),
    trajectory TEXT,
    generated_at TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES assessment_cycles(cycle_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS referral_actions (
    action_id INTEGER PRIMARY KEY AUTOINCREMENT,
    classification_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    dispatched_at TEXT NOT NULL,
    acknowledged_at TEXT,
    FOREIGN KEY (classification_id) REFERENCES risk_classifications(classification_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS facilitators (
    facilitator_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    assigned_college TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    notif_id INTEGER PRIMARY KEY AUTOINCREMENT,
    facilitator_id INTEGER NOT NULL,
    classification_id INTEGER NOT NULL,
    anonymized_flag INTEGER NOT NULL,
    sent_at TEXT NOT NULL,
    message TEXT NOT NULL,
    FOREIGN KEY (facilitator_id) REFERENCES facilitators(facilitator_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (classification_id) REFERENCES risk_classifications(classification_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS availability_slots (
    slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
    facilitator_id INTEGER NOT NULL,
    slot_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    max_slots INTEGER NOT NULL DEFAULT 1,
    booked_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('Available', 'Full', 'Blocked')) DEFAULT 'Available',
    created_at TEXT NOT NULL,
    FOREIGN KEY (facilitator_id) REFERENCES facilitators(facilitator_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    facilitator_id INTEGER NOT NULL,
    slot_id INTEGER NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Requested', 'Approved', 'Rejected', 'Completed', 'Cancelled')) DEFAULT 'Requested',
    student_notes TEXT,
    ogc_notes TEXT,
    rejection_reason TEXT,
    requested_at TEXT NOT NULL,
    approved_at TEXT,
    rejected_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (facilitator_id) REFERENCES facilitators(facilitator_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES availability_slots(slot_id) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS emergency_contacts (
    contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_type TEXT NOT NULL CHECK (contact_type IN ('Hotline', 'Campus Service', 'Emergency Service', 'Mental Health Service')),
    name TEXT NOT NULL,
    description TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    website TEXT,
    available_24_7 INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

const facilitatorColumns = db.prepare('PRAGMA table_info(facilitators)').all();
const hasFacilitatorPasswordHash = facilitatorColumns.some((column) => column.name === 'password_hash');
if (!hasFacilitatorPasswordHash) {
  db.exec('ALTER TABLE facilitators ADD COLUMN password_hash TEXT');
}

const DEFAULT_FACILITATOR = {
  facilitator_id: 1,
  name: 'Default OGC',
  assigned_college: 'All',
  email: 'ogc@campus.local',
  password_hash: null
};

function defaultDb() {
  return {
    counters: {
      cycleId: 1,
      assessmentId: 1,
      responseId: 1,
      esmEntryId: 1,
      classificationId: 1,
      actionId: 1,
      notifId: 1,
      slotId: 1,
      appointmentId: 1,
      contactId: 1
    },
    students: [],
    assessmentCycles: [],
    assessments: [],
    dass21Responses: [],
    esmEntries: [],
    riskClassifications: [],
    referralActions: [],
    availabilitySlots: [],
    appointments: [],
    emergencyContacts: [],
    facilitators: [
      {
        facilitatorId: DEFAULT_FACILITATOR.facilitator_id,
        name: DEFAULT_FACILITATOR.name,
        assignedCollege: DEFAULT_FACILITATOR.assigned_college,
        email: DEFAULT_FACILITATOR.email,
        passwordHash: DEFAULT_FACILITATOR.password_hash
      }
    ],
    notifications: []
  };
}

function toBool(value) {
  return Boolean(value);
}

function fromBool(value) {
  return value ? 1 : 0;
}

function nextId(tableName, idColumn) {
  const row = db.prepare(`SELECT COALESCE(MAX(${idColumn}), 0) + 1 AS nextId FROM ${tableName}`).get();
  return Number(row.nextId || 1);
}

function updateSequence(tableName, idColumn) {
  const maxRow = db.prepare(`SELECT COALESCE(MAX(${idColumn}), 0) AS maxId FROM ${tableName}`).get();
  const maxId = Number(maxRow.maxId || 0);
  if (!Number.isFinite(maxId) || maxId <= 0) return;
  const updated = db.prepare('UPDATE sqlite_sequence SET seq = ? WHERE name = ?').run(maxId, tableName);
  if (!updated.changes) {
    db.prepare('INSERT INTO sqlite_sequence(name, seq) VALUES (?, ?)').run(tableName, maxId);
  }
}

function readLegacyDb() {
  if (!fs.existsSync(LEGACY_JSON_PATH)) return null;
  const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

function seedFromLegacyIfNeeded() {
  const hasStudents = db.prepare('SELECT COUNT(*) AS count FROM students').get().count > 0;
  if (hasStudents) return;

  const legacy = readLegacyDb();
  if (!legacy) {
    db.prepare('INSERT OR IGNORE INTO facilitators (facilitator_id, name, assigned_college, email, password_hash) VALUES (?, ?, ?, ?, ?)')
      .run(
        DEFAULT_FACILITATOR.facilitator_id,
        DEFAULT_FACILITATOR.name,
        DEFAULT_FACILITATOR.assigned_college,
        DEFAULT_FACILITATOR.email,
        DEFAULT_FACILITATOR.password_hash
      );
    updateSequence('facilitators', 'facilitator_id');
    return;
  }

  const insertStudent = db.prepare(`
    INSERT INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag, registered_at)
    VALUES (@student_id, @name, @email, @password_hash, @college, @year_level, @sex, @consent_flag, @registered_at)
  `);
  const insertCycle = db.prepare(`
    INSERT INTO assessment_cycles (cycle_id, student_id, start_date, end_date, status)
    VALUES (@cycle_id, @student_id, @start_date, @end_date, @status)
  `);
  const insertAssessment = db.prepare(`
    INSERT INTO assessments (assessment_id, student_id, type, submitted_at, cycle_id)
    VALUES (@assessment_id, @student_id, @type, @submitted_at, @cycle_id)
  `);
  const insertResponse = db.prepare(`
    INSERT INTO dass21_responses (response_id, assessment_id, item_number, score, subscale)
    VALUES (@response_id, @assessment_id, @item_number, @score, @subscale)
  `);
  const insertEsm = db.prepare(`
    INSERT INTO esm_entries (entry_id, student_id, prompt_time, mood_score, energy_score, stressor_category, physical_symptom, help_intent)
    VALUES (@entry_id, @student_id, @prompt_time, @mood_score, @energy_score, @stressor_category, @physical_symptom, @help_intent)
  `);
  const insertClassification = db.prepare(`
    INSERT INTO risk_classifications (classification_id, student_id, cycle_id, risk_level, trajectory, generated_at, meta_json)
    VALUES (@classification_id, @student_id, @cycle_id, @risk_level, @trajectory, @generated_at, @meta_json)
  `);
  const insertAction = db.prepare(`
    INSERT INTO referral_actions (action_id, classification_id, action_type, dispatched_at, acknowledged_at)
    VALUES (@action_id, @classification_id, @action_type, @dispatched_at, @acknowledged_at)
  `);
  const insertFacilitator = db.prepare(`
    INSERT INTO facilitators (facilitator_id, name, assigned_college, email, password_hash)
    VALUES (@facilitator_id, @name, @assigned_college, @email, @password_hash)
  `);
  const insertNotification = db.prepare(`
    INSERT INTO notifications (notif_id, facilitator_id, classification_id, anonymized_flag, sent_at, message)
    VALUES (@notif_id, @facilitator_id, @classification_id, @anonymized_flag, @sent_at, @message)
  `);

  const seed = db.transaction(() => {
    for (const student of legacy.students || []) {
      insertStudent.run({
        student_id: student.studentId,
        name: student.name,
        email: student.email,
        password_hash: student.passwordHash,
        college: student.college,
        year_level: student.yearLevel,
        sex: student.sex,
        consent_flag: fromBool(student.consentFlag),
        registered_at: student.registeredAt
      });
    }

    for (const cycle of legacy.assessmentCycles || []) {
      insertCycle.run({
        cycle_id: cycle.cycleId,
        student_id: cycle.studentId,
        start_date: cycle.startDate,
        end_date: cycle.endDate,
        status: cycle.status
      });
    }

    for (const assessment of legacy.assessments || []) {
      insertAssessment.run({
        assessment_id: assessment.assessmentId,
        student_id: assessment.studentId,
        type: assessment.type,
        submitted_at: assessment.submittedAt,
        cycle_id: assessment.cycleId
      });
    }

    for (const response of legacy.dass21Responses || []) {
      insertResponse.run({
        response_id: response.responseId,
        assessment_id: response.assessmentId,
        item_number: response.itemNumber,
        score: response.score,
        subscale: response.subscale
      });
    }

    for (const entry of legacy.esmEntries || []) {
      insertEsm.run({
        entry_id: entry.entryId,
        student_id: entry.studentId,
        prompt_time: entry.promptTime,
        mood_score: entry.moodScore,
        energy_score: entry.energyScore,
        stressor_category: entry.stressorCategory,
        physical_symptom: fromBool(entry.physicalSymptom),
        help_intent: fromBool(entry.helpIntent)
      });
    }

    for (const classification of legacy.riskClassifications || []) {
      insertClassification.run({
        classification_id: classification.classificationId,
        student_id: classification.studentId,
        cycle_id: classification.cycleId,
        risk_level: classification.riskLevel,
        trajectory: classification.trajectory,
        generated_at: classification.generatedAt,
        meta_json: JSON.stringify(classification.meta || {})
      });
    }

    for (const action of legacy.referralActions || []) {
      insertAction.run({
        action_id: action.actionId,
        classification_id: action.classificationId,
        action_type: action.actionType,
        dispatched_at: action.dispatchedAt,
        acknowledged_at: action.acknowledgedAt
      });
    }

    const facilitators = legacy.facilitators?.length
      ? legacy.facilitators
      : [
          {
            facilitatorId: DEFAULT_FACILITATOR.facilitator_id,
            name: DEFAULT_FACILITATOR.name,
            assignedCollege: DEFAULT_FACILITATOR.assigned_college,
            email: DEFAULT_FACILITATOR.email,
            passwordHash: DEFAULT_FACILITATOR.password_hash
          }
        ];

    for (const facilitator of facilitators) {
      insertFacilitator.run({
        facilitator_id: facilitator.facilitatorId,
        name: facilitator.name,
        assigned_college: facilitator.assignedCollege,
        email: facilitator.email,
        password_hash: facilitator.passwordHash || null
      });
    }

    for (const notification of legacy.notifications || []) {
      insertNotification.run({
        notif_id: notification.notifId,
        facilitator_id: notification.facilitatorId,
        classification_id: notification.classificationId,
        anonymized_flag: fromBool(notification.anonymizedFlag),
        sent_at: notification.sentAt,
        message: notification.message
      });
    }
  });

  seed();

}

seedFromLegacyIfNeeded();

export function defaultDbSnapshot() {
  return defaultDb();
}

export function readDb() {
  const snapshot = defaultDb();

  snapshot.students = db.prepare('SELECT * FROM students ORDER BY student_id').all().map((row) => ({
    studentId: row.student_id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    college: row.college,
    yearLevel: Number(row.year_level),
    sex: row.sex,
    consentFlag: toBool(row.consent_flag),
    registeredAt: row.registered_at
  }));

  snapshot.assessmentCycles = db.prepare('SELECT * FROM assessment_cycles ORDER BY cycle_id').all().map((row) => ({
    cycleId: row.cycle_id,
    studentId: row.student_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status
  }));

  snapshot.assessments = db.prepare('SELECT * FROM assessments ORDER BY assessment_id').all().map((row) => ({
    assessmentId: row.assessment_id,
    studentId: row.student_id,
    type: row.type,
    submittedAt: row.submitted_at,
    cycleId: row.cycle_id
  }));

  snapshot.dass21Responses = db.prepare('SELECT * FROM dass21_responses ORDER BY response_id').all().map((row) => ({
    responseId: row.response_id,
    assessmentId: row.assessment_id,
    itemNumber: row.item_number,
    score: row.score,
    subscale: row.subscale
  }));

  snapshot.esmEntries = db.prepare('SELECT * FROM esm_entries ORDER BY entry_id').all().map((row) => ({
    entryId: row.entry_id,
    studentId: row.student_id,
    promptTime: row.prompt_time,
    moodScore: row.mood_score,
    energyScore: row.energy_score,
    stressorCategory: row.stressor_category,
    physicalSymptom: toBool(row.physical_symptom),
    helpIntent: toBool(row.help_intent)
  }));

  snapshot.riskClassifications = db.prepare('SELECT * FROM risk_classifications ORDER BY classification_id').all().map((row) => ({
    classificationId: row.classification_id,
    studentId: row.student_id,
    cycleId: row.cycle_id,
    riskLevel: row.risk_level,
    trajectory: row.trajectory,
    generatedAt: row.generated_at,
    meta: row.meta_json ? JSON.parse(row.meta_json) : {}
  }));

  snapshot.referralActions = db.prepare('SELECT * FROM referral_actions ORDER BY action_id').all().map((row) => ({
    actionId: row.action_id,
    classificationId: row.classification_id,
    actionType: row.action_type,
    dispatchedAt: row.dispatched_at,
    acknowledgedAt: row.acknowledged_at
  }));

  snapshot.facilitators = db.prepare('SELECT * FROM facilitators ORDER BY facilitator_id').all().map((row) => ({
    facilitatorId: row.facilitator_id,
    name: row.name,
    assignedCollege: row.assigned_college,
    email: row.email,
    passwordHash: row.password_hash
  }));

  snapshot.notifications = db.prepare('SELECT * FROM notifications ORDER BY notif_id').all().map((row) => ({
    notifId: row.notif_id,
    facilitatorId: row.facilitator_id,
    classificationId: row.classification_id,
    anonymizedFlag: toBool(row.anonymized_flag),
    sentAt: row.sent_at,
    message: row.message
  }));

  snapshot.availabilitySlots = db.prepare('SELECT * FROM availability_slots ORDER BY slot_id').all().map((row) => ({
    slotId: row.slot_id,
    facilitatorId: row.facilitator_id,
    slotDate: row.slot_date,
    startTime: row.start_time,
    endTime: row.end_time,
    maxSlots: Number(row.max_slots),
    bookedCount: Number(row.booked_count),
    status: row.status,
    createdAt: row.created_at
  }));

  snapshot.appointments = db.prepare('SELECT * FROM appointments ORDER BY appointment_id').all().map((row) => ({
    appointmentId: row.appointment_id,
    studentId: row.student_id,
    facilitatorId: row.facilitator_id,
    slotId: row.slot_id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    status: row.status,
    studentNotes: row.student_notes,
    ogcNotes: row.ogc_notes,
    rejectionReason: row.rejection_reason,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    completedAt: row.completed_at
  }));

  snapshot.emergencyContacts = db.prepare('SELECT * FROM emergency_contacts ORDER BY priority DESC, contact_id').all().map((row) => ({
    contactId: row.contact_id,
    contactType: row.contact_type,
    name: row.name,
    description: row.description,
    phone: row.phone,
    email: row.email,
    website: row.website,
    available24_7: toBool(row.available_24_7),
    priority: Number(row.priority),
    createdAt: row.created_at
  }));

  snapshot.counters = {
    cycleId: nextId('assessment_cycles', 'cycle_id'),
    assessmentId: nextId('assessments', 'assessment_id'),
    responseId: nextId('dass21_responses', 'response_id'),
    esmEntryId: nextId('esm_entries', 'entry_id'),
    classificationId: nextId('risk_classifications', 'classification_id'),
    actionId: nextId('referral_actions', 'action_id'),
    notifId: nextId('notifications', 'notif_id'),
    slotId: nextId('availability_slots', 'slot_id'),
    appointmentId: nextId('appointments', 'appointment_id'),
    contactId: nextId('emergency_contacts', 'contact_id')
  };

  if (snapshot.facilitators.length === 0) {
    snapshot.facilitators = [
      {
        facilitatorId: DEFAULT_FACILITATOR.facilitator_id,
        name: DEFAULT_FACILITATOR.name,
        assignedCollege: DEFAULT_FACILITATOR.assigned_college,
        email: DEFAULT_FACILITATOR.email
      }
    ];
  }

  return snapshot;
}

export function writeDb(snapshot) {
  const persist = db.transaction((state) => {
    db.exec('PRAGMA foreign_keys = OFF');
    try {
      for (const tableName of [
        'notifications',
        'appointments',
        'availability_slots',
        'referral_actions',
        'risk_classifications',
        'esm_entries',
        'dass21_responses',
        'assessments',
        'assessment_cycles',
        'students',
        'facilitators'
      ]) {
        db.prepare(`DELETE FROM ${tableName}`).run();
      }

      const insertStudent = db.prepare(`
        INSERT INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag, registered_at)
        VALUES (@student_id, @name, @email, @password_hash, @college, @year_level, @sex, @consent_flag, @registered_at)
      `);
      const insertCycle = db.prepare(`
        INSERT INTO assessment_cycles (cycle_id, student_id, start_date, end_date, status)
        VALUES (@cycle_id, @student_id, @start_date, @end_date, @status)
      `);
      const insertAssessment = db.prepare(`
        INSERT INTO assessments (assessment_id, student_id, type, submitted_at, cycle_id)
        VALUES (@assessment_id, @student_id, @type, @submitted_at, @cycle_id)
      `);
      const insertResponse = db.prepare(`
        INSERT INTO dass21_responses (response_id, assessment_id, item_number, score, subscale)
        VALUES (@response_id, @assessment_id, @item_number, @score, @subscale)
      `);
      const insertEsm = db.prepare(`
        INSERT INTO esm_entries (entry_id, student_id, prompt_time, mood_score, energy_score, stressor_category, physical_symptom, help_intent)
        VALUES (@entry_id, @student_id, @prompt_time, @mood_score, @energy_score, @stressor_category, @physical_symptom, @help_intent)
      `);
      const insertClassification = db.prepare(`
        INSERT INTO risk_classifications (classification_id, student_id, cycle_id, risk_level, trajectory, generated_at, meta_json)
        VALUES (@classification_id, @student_id, @cycle_id, @risk_level, @trajectory, @generated_at, @meta_json)
      `);
      const insertAction = db.prepare(`
        INSERT INTO referral_actions (action_id, classification_id, action_type, dispatched_at, acknowledged_at)
        VALUES (@action_id, @classification_id, @action_type, @dispatched_at, @acknowledged_at)
      `);
      const insertFacilitator = db.prepare(`
        INSERT INTO facilitators (facilitator_id, name, assigned_college, email, password_hash)
        VALUES (@facilitator_id, @name, @assigned_college, @email, @password_hash)
      `);
      const insertNotification = db.prepare(`
        INSERT INTO notifications (notif_id, facilitator_id, classification_id, anonymized_flag, sent_at, message)
        VALUES (@notif_id, @facilitator_id, @classification_id, @anonymized_flag, @sent_at, @message)
      `);
      const insertSlot = db.prepare(`
        INSERT INTO availability_slots (slot_id, facilitator_id, slot_date, start_time, end_time, max_slots, booked_count, status, created_at)
        VALUES (@slot_id, @facilitator_id, @slot_date, @start_time, @end_time, @max_slots, @booked_count, @status, @created_at)
      `);
      const insertAppointment = db.prepare(`
        INSERT INTO appointments (appointment_id, student_id, facilitator_id, slot_id, appointment_date, appointment_time, status, student_notes, ogc_notes, rejection_reason, requested_at, approved_at, rejected_at, completed_at)
        VALUES (@appointment_id, @student_id, @facilitator_id, @slot_id, @appointment_date, @appointment_time, @status, @student_notes, @ogc_notes, @rejection_reason, @requested_at, @approved_at, @rejected_at, @completed_at)
      `);
      const insertContact = db.prepare(`
        INSERT INTO emergency_contacts (contact_id, contact_type, name, description, phone, email, website, available_24_7, priority, created_at)
        VALUES (@contact_id, @contact_type, @name, @description, @phone, @email, @website, @available_24_7, @priority, @created_at)
      `);

      for (const student of state.students || []) {
        insertStudent.run({
          student_id: student.studentId,
          name: student.name,
          email: student.email,
          password_hash: student.passwordHash,
          college: student.college,
          year_level: student.yearLevel,
          sex: student.sex,
          consent_flag: fromBool(student.consentFlag),
          registered_at: student.registeredAt
        });
      }

      for (const cycle of state.assessmentCycles || []) {
        insertCycle.run({
          cycle_id: cycle.cycleId,
          student_id: cycle.studentId,
          start_date: cycle.startDate,
          end_date: cycle.endDate,
          status: cycle.status
        });
      }

      for (const assessment of state.assessments || []) {
        insertAssessment.run({
          assessment_id: assessment.assessmentId,
          student_id: assessment.studentId,
          type: assessment.type,
          submitted_at: assessment.submittedAt,
          cycle_id: assessment.cycleId
        });
      }

      for (const response of state.dass21Responses || []) {
        insertResponse.run({
          response_id: response.responseId,
          assessment_id: response.assessmentId,
          item_number: response.itemNumber,
          score: response.score,
          subscale: response.subscale
        });
      }

      for (const entry of state.esmEntries || []) {
        insertEsm.run({
          entry_id: entry.entryId,
          student_id: entry.studentId,
          prompt_time: entry.promptTime,
          mood_score: entry.moodScore,
          energy_score: entry.energyScore,
          stressor_category: entry.stressorCategory,
          physical_symptom: fromBool(entry.physicalSymptom),
          help_intent: fromBool(entry.helpIntent)
        });
      }

      for (const classification of state.riskClassifications || []) {
        insertClassification.run({
          classification_id: classification.classificationId,
          student_id: classification.studentId,
          cycle_id: classification.cycleId,
          risk_level: classification.riskLevel,
          trajectory: classification.trajectory,
          generated_at: classification.generatedAt,
          meta_json: JSON.stringify(classification.meta || {})
        });
      }

      for (const action of state.referralActions || []) {
        insertAction.run({
          action_id: action.actionId,
          classification_id: action.classificationId,
          action_type: action.actionType,
          dispatched_at: action.dispatchedAt,
          acknowledged_at: action.acknowledgedAt
        });
      }

      for (const facilitator of state.facilitators || [DEFAULT_FACILITATOR]) {
        insertFacilitator.run({
          facilitator_id: facilitator.facilitatorId,
          name: facilitator.name,
          assigned_college: facilitator.assignedCollege,
          email: facilitator.email,
          password_hash: facilitator.passwordHash || null
        });
      }

      for (const notification of state.notifications || []) {
        insertNotification.run({
          notif_id: notification.notifId,
          facilitator_id: notification.facilitatorId,
          classification_id: notification.classificationId,
          anonymized_flag: fromBool(notification.anonymizedFlag),
          sent_at: notification.sentAt,
          message: notification.message
        });
      }

      for (const slot of state.availabilitySlots || []) {
        insertSlot.run({
          slot_id: slot.slotId,
          facilitator_id: slot.facilitatorId,
          slot_date: slot.slotDate,
          start_time: slot.startTime,
          end_time: slot.endTime,
          max_slots: slot.maxSlots,
          booked_count: slot.bookedCount,
          status: slot.status,
          created_at: slot.createdAt
        });
      }

      for (const appointment of state.appointments || []) {
        insertAppointment.run({
          appointment_id: appointment.appointmentId,
          student_id: appointment.studentId,
          facilitator_id: appointment.facilitatorId,
          slot_id: appointment.slotId,
          appointment_date: appointment.appointmentDate,
          appointment_time: appointment.appointmentTime,
          status: appointment.status,
          student_notes: appointment.studentNotes || null,
          ogc_notes: appointment.ogcNotes || null,
          rejection_reason: appointment.rejectionReason || null,
          requested_at: appointment.requestedAt,
          approved_at: appointment.approvedAt || null,
          rejected_at: appointment.rejectedAt || null,
          completed_at: appointment.completedAt || null
        });
      }

      for (const contact of state.emergencyContacts || []) {
        insertContact.run({
          contact_id: contact.contactId,
          contact_type: contact.contactType,
          name: contact.name,
          description: contact.description || null,
          phone: contact.phone,
          email: contact.email || null,
          website: contact.website || null,
          available_24_7: fromBool(contact.available24_7),
          priority: contact.priority,
          created_at: contact.createdAt
        });
      }

    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  });

  persist(snapshot);
}
