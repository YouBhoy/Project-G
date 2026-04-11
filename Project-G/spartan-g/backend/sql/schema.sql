CREATE DATABASE IF NOT EXISTS spartan_g;
USE spartan_g;

CREATE TABLE IF NOT EXISTS Student (
  student_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  college VARCHAR(50) NOT NULL,
  year_level TINYINT NOT NULL,
  sex ENUM('M', 'F') NOT NULL,
  consent_flag BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AssessmentCycle (
  cycle_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('Active', 'Complete') NOT NULL DEFAULT 'Active',
  FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Assessment (
  assessment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  type ENUM('DASS21', 'CSSRS', 'ESM') NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cycle_id INT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES AssessmentCycle(cycle_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DASS21Response (
  response_id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  item_number TINYINT NOT NULL,
  score TINYINT NOT NULL,
  subscale ENUM('D', 'A', 'S') NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES Assessment(assessment_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ESMEntry (
  entry_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  prompt_time DATETIME NOT NULL,
  mood_score TINYINT NOT NULL,
  energy_score TINYINT NOT NULL,
  stressor_category VARCHAR(20) NOT NULL,
  physical_symptom BOOLEAN NOT NULL,
  help_intent BOOLEAN NOT NULL,
  FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS RiskClassification (
  classification_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  cycle_id INT NOT NULL,
  risk_level ENUM('Low', 'Moderate', 'High', 'Crisis') NOT NULL,
  trajectory ENUM('Stable', 'Deteriorating', 'At-Risk') NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES AssessmentCycle(cycle_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ReferralAction (
  action_id INT AUTO_INCREMENT PRIMARY KEY,
  classification_id INT NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  dispatched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME NULL,
  FOREIGN KEY (classification_id) REFERENCES RiskClassification(classification_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS OGCFacilitator (
  facilitator_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  assigned_college VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Notification (
  notif_id INT AUTO_INCREMENT PRIMARY KEY,
  facilitator_id INT NOT NULL,
  classification_id INT NOT NULL,
  anonymized_flag BOOLEAN NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  message TEXT NOT NULL,
  FOREIGN KEY (facilitator_id) REFERENCES OGCFacilitator(facilitator_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (classification_id) REFERENCES RiskClassification(classification_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- Security operation references (execute in ops scripts):
-- 1) Encrypt PII columns at rest using MySQL enterprise/keyring-backed AES strategy.
-- 2) Enforce role-based GRANTs for Student / OGC / Admin database users.
-- 3) Daily backup via mysqldump and weekly restore verification jobs.
CREATE TABLE IF NOT EXISTS Student (
  student_id VARCHAR(20) PRIMARY KEY,
  college VARCHAR(50) NOT NULL,
  year_level TINYINT NOT NULL,
  sex ENUM('M', 'F') NOT NULL,
  consent_flag BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AssessmentCycle (
  cycle_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  status ENUM('Active', 'Complete') NOT NULL DEFAULT 'Active',
  CONSTRAINT fk_assessment_cycle_student
    FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Assessment (
  assessment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  type ENUM('DASS21', 'CSSRS', 'ESM') NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cycle_id INT DEFAULT NULL,
  CONSTRAINT fk_assessment_student
    FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_assessment_cycle
    FOREIGN KEY (cycle_id) REFERENCES AssessmentCycle(cycle_id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS DASS21Response (
  response_id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  item_number TINYINT NOT NULL,
  score TINYINT NOT NULL,
  subscale ENUM('D', 'A', 'S') NOT NULL,
  CONSTRAINT fk_dass21_response_assessment
    FOREIGN KEY (assessment_id) REFERENCES Assessment(assessment_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ESMEntry (
  entry_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  prompt_time DATETIME NOT NULL,
  mood_score TINYINT NOT NULL,
  energy_score TINYINT NOT NULL,
  stressor_category VARCHAR(20) NOT NULL,
  physical_symptom BOOLEAN NOT NULL DEFAULT FALSE,
  help_intent BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_esm_student
    FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS RiskClassification (
  classification_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  cycle_id INT DEFAULT NULL,
  risk_level ENUM('Low', 'Moderate', 'High', 'Crisis') NOT NULL,
  trajectory ENUM('Stable', 'Deteriorating', 'At-Risk') NOT NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_risk_student
    FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_risk_cycle
    FOREIGN KEY (cycle_id) REFERENCES AssessmentCycle(cycle_id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ReferralAction (
  action_id INT AUTO_INCREMENT PRIMARY KEY,
  classification_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  dispatched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_referral_classification
    FOREIGN KEY (classification_id) REFERENCES RiskClassification(classification_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS OGCFacilitator (
  facilitator_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  assigned_college VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Notification (
  notif_id INT AUTO_INCREMENT PRIMARY KEY,
  facilitator_id INT NOT NULL,
  classification_id INT NOT NULL,
  anonymized_flag BOOLEAN NOT NULL DEFAULT TRUE,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  message TEXT NOT NULL,
  acknowledged_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_notification_facilitator
    FOREIGN KEY (facilitator_id) REFERENCES OGCFacilitator(facilitator_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_notification_classification
    FOREIGN KEY (classification_id) REFERENCES RiskClassification(classification_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SafetyPlan (
  plan_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  plan_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_safety_plan_student (student_id),
  CONSTRAINT fk_safety_plan_student
    FOREIGN KEY (student_id) REFERENCES Student(student_id)
    ON DELETE CASCADE
);
