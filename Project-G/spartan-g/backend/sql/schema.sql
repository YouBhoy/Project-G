CREATE TABLE IF NOT EXISTS students (
  student_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  college VARCHAR(255) NOT NULL,
  year_level INT NOT NULL,
  sex ENUM('M', 'F') NOT NULL,
  consent_flag TINYINT(1) NOT NULL DEFAULT 0,
  registered_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (student_id),
  UNIQUE KEY uq_students_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessment_cycles (
  cycle_id INT NOT NULL AUTO_INCREMENT,
  student_id VARCHAR(128) NOT NULL,
  start_date VARCHAR(40) NOT NULL,
  end_date VARCHAR(40) DEFAULT NULL,
  status ENUM('Active', 'Complete') NOT NULL DEFAULT 'Active',
  PRIMARY KEY (cycle_id),
  KEY idx_assessment_cycles_student_id (student_id),
  CONSTRAINT fk_assessment_cycles_students
    FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessments (
  assessment_id INT NOT NULL AUTO_INCREMENT,
  student_id VARCHAR(128) NOT NULL,
  type ENUM('DASS21', 'PHQ9', 'GAD7', 'ESM') NOT NULL,
  submitted_at VARCHAR(40) NOT NULL,
  cycle_id INT NOT NULL,
  PRIMARY KEY (assessment_id),
  KEY idx_assessments_student_id (student_id),
  KEY idx_assessments_cycle_id (cycle_id),
  CONSTRAINT fk_assessments_students
    FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_assessments_cycles
    FOREIGN KEY (cycle_id) REFERENCES assessment_cycles(cycle_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dass21_responses (
  response_id INT NOT NULL AUTO_INCREMENT,
  assessment_id INT NOT NULL,
  item_number INT NOT NULL,
  score INT NOT NULL,
  subscale ENUM('D', 'A', 'S') NOT NULL,
  PRIMARY KEY (response_id),
  KEY idx_dass21_responses_assessment_id (assessment_id),
  CONSTRAINT fk_dass21_responses_assessments
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS esm_entries (
  entry_id INT NOT NULL AUTO_INCREMENT,
  student_id VARCHAR(128) NOT NULL,
  prompt_time VARCHAR(40) NOT NULL,
  mood_score INT NOT NULL,
  energy_score INT NOT NULL,
  stressor_category VARCHAR(255) NOT NULL,
  physical_symptom TINYINT(1) NOT NULL,
  help_intent TINYINT(1) NOT NULL,
  PRIMARY KEY (entry_id),
  KEY idx_esm_entries_student_id (student_id),
  CONSTRAINT fk_esm_entries_students
    FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS risk_classifications (
  classification_id INT NOT NULL AUTO_INCREMENT,
  student_id VARCHAR(128) NOT NULL,
  cycle_id INT NOT NULL,
  risk_level ENUM('Low', 'Moderate', 'High', 'Crisis') NOT NULL,
  trajectory VARCHAR(255) DEFAULT NULL,
  generated_at VARCHAR(40) NOT NULL,
  meta_json LONGTEXT NOT NULL,
  PRIMARY KEY (classification_id),
  KEY idx_risk_classifications_student_id (student_id),
  KEY idx_risk_classifications_cycle_id (cycle_id),
  CONSTRAINT fk_risk_classifications_students
    FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_risk_classifications_cycles
    FOREIGN KEY (cycle_id) REFERENCES assessment_cycles(cycle_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_actions (
  action_id INT NOT NULL AUTO_INCREMENT,
  classification_id INT NOT NULL,
  action_type VARCHAR(255) NOT NULL,
  dispatched_at VARCHAR(40) NOT NULL,
  acknowledged_at VARCHAR(40) DEFAULT NULL,
  PRIMARY KEY (action_id),
  KEY idx_referral_actions_classification_id (classification_id),
  CONSTRAINT fk_referral_actions_classifications
    FOREIGN KEY (classification_id) REFERENCES risk_classifications(classification_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS facilitators (
  facilitator_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  assigned_college VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (facilitator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO facilitators (facilitator_id, name, assigned_college, email)
VALUES (1, 'Default OGC', 'All', 'ogc@campus.local');

CREATE TABLE IF NOT EXISTS notifications (
  notif_id INT NOT NULL AUTO_INCREMENT,
  facilitator_id INT NOT NULL,
  classification_id INT NOT NULL,
  anonymized_flag TINYINT(1) NOT NULL,
  sent_at VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  PRIMARY KEY (notif_id),
  KEY idx_notifications_facilitator_id (facilitator_id),
  KEY idx_notifications_classification_id (classification_id),
  CONSTRAINT fk_notifications_facilitators
    FOREIGN KEY (facilitator_id) REFERENCES facilitators(facilitator_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_notifications_classifications
    FOREIGN KEY (classification_id) REFERENCES risk_classifications(classification_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
