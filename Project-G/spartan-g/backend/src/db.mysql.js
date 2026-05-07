import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const DEFAULT_FACILITATOR = {
  facilitatorId: 1,
  name: 'Default OGC',
  assignedCollege: 'All',
  email: 'ogc@campus.local',
  passwordHash: null
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
      {
        facilitatorId: DEFAULT_FACILITATOR.facilitatorId,
        name: DEFAULT_FACILITATOR.name,
        assignedCollege: DEFAULT_FACILITATOR.assignedCollege,
        email: DEFAULT_FACILITATOR.email,
        passwordHash: DEFAULT_FACILITATOR.passwordHash
      }
    ],
    notifications: []
  };
}

function toBool(value) {
  return Boolean(Number(value));
}

function fromBool(value) {
  return value ? 1 : 0;
}

function buildPoolOptions() {
  if (process.env.MYSQL_URL) {
    return {
      uri: process.env.MYSQL_URL,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_POOL_LIMIT || 10)
    };
  }

  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'spartan_g',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_LIMIT || 10)
  };
}

const pool = mysql.createPool(buildPoolOptions());

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const result = await work(connection);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback errors.
    }
    throw error;
  } finally {
    connection.release();
  }
}

function mapStudent(row) {
  return {
    studentId: row.student_id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    college: row.college,
    yearLevel: Number(row.year_level),
    sex: row.sex,
    consentFlag: toBool(row.consent_flag),
    registeredAt: row.registered_at
  };
}

function mapCycle(row) {
  return {
    cycleId: row.cycle_id,
    studentId: row.student_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status
  };
}

function mapAssessment(row) {
  return {
    assessmentId: row.assessment_id,
    studentId: row.student_id,
    type: row.type,
    submittedAt: row.submitted_at,
    cycleId: row.cycle_id
  };
}

function mapResponse(row) {
  return {
    responseId: row.response_id,
    assessmentId: row.assessment_id,
    itemNumber: row.item_number,
    score: row.score,
    subscale: row.subscale
  };
}

function mapEsm(row) {
  return {
    entryId: row.entry_id,
    studentId: row.student_id,
    promptTime: row.prompt_time,
    moodScore: row.mood_score,
    energyScore: row.energy_score,
    stressorCategory: row.stressor_category,
    physicalSymptom: toBool(row.physical_symptom),
    helpIntent: toBool(row.help_intent)
  };
}

function mapClassification(row) {
  return {
    classificationId: row.classification_id,
    studentId: row.student_id,
    cycleId: row.cycle_id,
    riskLevel: row.risk_level,
    trajectory: row.trajectory,
    generatedAt: row.generated_at,
    meta: row.meta_json ? JSON.parse(row.meta_json) : {}
  };
}

function mapAction(row) {
  return {
    actionId: row.action_id,
    classificationId: row.classification_id,
    actionType: row.action_type,
    dispatchedAt: row.dispatched_at,
    acknowledgedAt: row.acknowledged_at
  };
}

function mapFacilitator(row) {
  return {
    facilitatorId: row.facilitator_id,
    name: row.name,
    assignedCollege: row.assigned_college,
    email: row.email,
    passwordHash: row.password_hash
  };
}

function mapNotification(row) {
  return {
    notifId: row.notif_id,
    facilitatorId: row.facilitator_id,
    classificationId: row.classification_id,
    anonymizedFlag: toBool(row.anonymized_flag),
    sentAt: row.sent_at,
    message: row.message
  };
}

export async function readDb() {
  const snapshot = defaultDb();

  snapshot.students = (await query('SELECT * FROM students ORDER BY student_id')).map(mapStudent);
  snapshot.assessmentCycles = (await query('SELECT * FROM assessment_cycles ORDER BY cycle_id')).map(mapCycle);
  snapshot.assessments = (await query('SELECT * FROM assessments ORDER BY assessment_id')).map(mapAssessment);
  snapshot.dass21Responses = (await query('SELECT * FROM dass21_responses ORDER BY response_id')).map(mapResponse);
  snapshot.esmEntries = (await query('SELECT * FROM esm_entries ORDER BY entry_id')).map(mapEsm);
  snapshot.riskClassifications = (await query('SELECT * FROM risk_classifications ORDER BY classification_id')).map(mapClassification);
  snapshot.referralActions = (await query('SELECT * FROM referral_actions ORDER BY action_id')).map(mapAction);
  snapshot.facilitators = (await query('SELECT * FROM facilitators ORDER BY facilitator_id')).map(mapFacilitator);
  snapshot.notifications = (await query('SELECT * FROM notifications ORDER BY notif_id')).map(mapNotification);

  if (snapshot.facilitators.length === 0) {
    snapshot.facilitators = [
      {
        facilitatorId: DEFAULT_FACILITATOR.facilitatorId,
        name: DEFAULT_FACILITATOR.name,
        assignedCollege: DEFAULT_FACILITATOR.assignedCollege,
        email: DEFAULT_FACILITATOR.email,
        passwordHash: DEFAULT_FACILITATOR.passwordHash
      }
    ];
  }

  snapshot.counters = {
    cycleId: Number((await query('SELECT COALESCE(MAX(cycle_id), 0) + 1 AS nextId FROM assessment_cycles'))[0].nextId || 1),
    assessmentId: Number((await query('SELECT COALESCE(MAX(assessment_id), 0) + 1 AS nextId FROM assessments'))[0].nextId || 1),
    responseId: Number((await query('SELECT COALESCE(MAX(response_id), 0) + 1 AS nextId FROM dass21_responses'))[0].nextId || 1),
    esmEntryId: Number((await query('SELECT COALESCE(MAX(entry_id), 0) + 1 AS nextId FROM esm_entries'))[0].nextId || 1),
    classificationId: Number((await query('SELECT COALESCE(MAX(classification_id), 0) + 1 AS nextId FROM risk_classifications'))[0].nextId || 1),
    actionId: Number((await query('SELECT COALESCE(MAX(action_id), 0) + 1 AS nextId FROM referral_actions'))[0].nextId || 1),
    notifId: Number((await query('SELECT COALESCE(MAX(notif_id), 0) + 1 AS nextId FROM notifications'))[0].nextId || 1)
  };

  return snapshot;
}

export async function writeDb(snapshot) {
  await withTransaction(async (connection) => {
    const tables = [
      'notifications',
      'referral_actions',
      'risk_classifications',
      'esm_entries',
      'dass21_responses',
      'assessments',
      'assessment_cycles',
      'students',
      'facilitators'
    ];

    for (const tableName of tables) {
      await connection.query(`TRUNCATE TABLE ${tableName}`);
    }

    for (const student of snapshot.students || []) {
      await connection.query(
        'INSERT INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [student.studentId, student.name, student.email, student.passwordHash, student.college, student.yearLevel, student.sex, fromBool(student.consentFlag), student.registeredAt]
      );
    }

    for (const cycle of snapshot.assessmentCycles || []) {
      await connection.query(
        'INSERT INTO assessment_cycles (cycle_id, student_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
        [cycle.cycleId, cycle.studentId, cycle.startDate, cycle.endDate, cycle.status]
      );
    }

    for (const assessment of snapshot.assessments || []) {
      await connection.query(
        'INSERT INTO assessments (assessment_id, student_id, type, submitted_at, cycle_id) VALUES (?, ?, ?, ?, ?)',
        [assessment.assessmentId, assessment.studentId, assessment.type, assessment.submittedAt, assessment.cycleId]
      );
    }

    for (const response of snapshot.dass21Responses || []) {
      await connection.query(
        'INSERT INTO dass21_responses (response_id, assessment_id, item_number, score, subscale) VALUES (?, ?, ?, ?, ?)',
        [response.responseId, response.assessmentId, response.itemNumber, response.score, response.subscale]
      );
    }

    for (const entry of snapshot.esmEntries || []) {
      await connection.query(
        'INSERT INTO esm_entries (entry_id, student_id, prompt_time, mood_score, energy_score, stressor_category, physical_symptom, help_intent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [entry.entryId, entry.studentId, entry.promptTime, entry.moodScore, entry.energyScore, entry.stressorCategory, fromBool(entry.physicalSymptom), fromBool(entry.helpIntent)]
      );
    }

    for (const classification of snapshot.riskClassifications || []) {
      await connection.query(
        'INSERT INTO risk_classifications (classification_id, student_id, cycle_id, risk_level, trajectory, generated_at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [classification.classificationId, classification.studentId, classification.cycleId, classification.riskLevel, classification.trajectory, classification.generatedAt, JSON.stringify(classification.meta || {})]
      );
    }

    for (const action of snapshot.referralActions || []) {
      await connection.query(
        'INSERT INTO referral_actions (action_id, classification_id, action_type, dispatched_at, acknowledged_at) VALUES (?, ?, ?, ?, ?)',
        [action.actionId, action.classificationId, action.actionType, action.dispatchedAt, action.acknowledgedAt]
      );
    }

    for (const facilitator of snapshot.facilitators || [DEFAULT_FACILITATOR]) {
      await connection.query(
        'INSERT INTO facilitators (facilitator_id, name, assigned_college, email, password_hash) VALUES (?, ?, ?, ?, ?)',
        [facilitator.facilitatorId, facilitator.name, facilitator.assignedCollege, facilitator.email, facilitator.passwordHash || null]
      );
    }

    for (const notification of snapshot.notifications || []) {
      await connection.query(
        'INSERT INTO notifications (notif_id, facilitator_id, classification_id, anonymized_flag, sent_at, message) VALUES (?, ?, ?, ?, ?, ?)',
        [notification.notifId, notification.facilitatorId, notification.classificationId, fromBool(notification.anonymizedFlag), notification.sentAt, notification.message]
      );
    }
  });
}
