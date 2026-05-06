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
  FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessments (
  assessment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DASS21', 'CSSRS', 'ESM')),
  submitted_at TEXT NOT NULL,
  cycle_id INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES assessment_cycles(cycle_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dass21_responses (
  response_id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL,
  item_number INTEGER NOT NULL,
  score INTEGER NOT NULL,
  subscale TEXT NOT NULL CHECK (subscale IN ('D', 'A', 'S')),
  FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id)
    ON UPDATE CASCADE ON DELETE CASCADE
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
  FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS risk_classifications (
  classification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  cycle_id INTEGER NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Moderate', 'High', 'Crisis')),
  trajectory TEXT,
  generated_at TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES assessment_cycles(cycle_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS referral_actions (
  action_id INTEGER PRIMARY KEY AUTOINCREMENT,
  classification_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  dispatched_at TEXT NOT NULL,
  acknowledged_at TEXT,
  FOREIGN KEY (classification_id) REFERENCES risk_classifications(classification_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS facilitators (
  facilitator_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  assigned_college TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  notif_id INTEGER PRIMARY KEY AUTOINCREMENT,
  facilitator_id INTEGER NOT NULL,
  classification_id INTEGER NOT NULL,
  anonymized_flag INTEGER NOT NULL,
  sent_at TEXT NOT NULL,
  message TEXT NOT NULL,
  FOREIGN KEY (facilitator_id) REFERENCES facilitators(facilitator_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (classification_id) REFERENCES risk_classifications(classification_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);
