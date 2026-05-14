-- SPARTAN-G Database Schema & Seed Data
-- Import this file directly into phpMyAdmin or via MySQL CLI
-- MySQL will auto-create the 'spartan_g' database if it doesn't exist

CREATE DATABASE IF NOT EXISTS `spartan_g` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `spartan_g`;

-- ============================================
-- TABLE: students
-- ============================================
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

-- ============================================
-- TABLE: assessment_cycles
-- ============================================
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

-- ============================================
-- TABLE: assessments
-- ============================================
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

-- ============================================
-- TABLE: dass21_responses
-- ============================================
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

-- ============================================
-- TABLE: esm_entries
-- ============================================
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

-- ============================================
-- TABLE: risk_classifications
-- ============================================
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

-- ============================================
-- TABLE: referral_actions
-- ============================================
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

-- ============================================
-- TABLE: facilitators
-- ============================================
CREATE TABLE IF NOT EXISTS facilitators (
  facilitator_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  assigned_college VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (facilitator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default OGC facilitator
INSERT IGNORE INTO facilitators (facilitator_id, name, assigned_college, email)
VALUES (1, 'Default OGC', 'All', 'ogc@campus.local');

-- ============================================
-- TABLE: notifications
-- ============================================
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

-- ============================================
-- TABLE: availability_slots
-- ============================================
CREATE TABLE IF NOT EXISTS availability_slots (
  slot_id INT NOT NULL AUTO_INCREMENT,
  facilitator_id INT NOT NULL,
  slot_date VARCHAR(40) NOT NULL,
  start_time VARCHAR(8) NOT NULL,
  end_time VARCHAR(8) NOT NULL,
  max_slots INT NOT NULL DEFAULT 1,
  booked_count INT NOT NULL DEFAULT 0,
  status ENUM('Available', 'Full', 'Blocked') NOT NULL DEFAULT 'Available',
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (slot_id),
  KEY idx_availability_slots_facilitator_id (facilitator_id),
  KEY idx_availability_slots_slot_date (slot_date),
  CONSTRAINT fk_availability_slots_facilitators
    FOREIGN KEY (facilitator_id) REFERENCES facilitators(facilitator_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: appointments
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INT NOT NULL AUTO_INCREMENT,
  student_id VARCHAR(128) NOT NULL,
  facilitator_id INT NOT NULL,
  slot_id INT NOT NULL,
  appointment_date VARCHAR(40) NOT NULL,
  appointment_time VARCHAR(8) NOT NULL,
  status ENUM('Requested', 'Approved', 'Rejected', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Requested',
  student_notes TEXT DEFAULT NULL,
  ogc_notes TEXT DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  requested_at VARCHAR(40) NOT NULL,
  approved_at VARCHAR(40) DEFAULT NULL,
  rejected_at VARCHAR(40) DEFAULT NULL,
  completed_at VARCHAR(40) DEFAULT NULL,
  PRIMARY KEY (appointment_id),
  KEY idx_appointments_student_id (student_id),
  KEY idx_appointments_facilitator_id (facilitator_id),
  KEY idx_appointments_status (status),
  KEY idx_appointments_appointment_date (appointment_date),
  CONSTRAINT fk_appointments_students
    FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_appointments_facilitators
    FOREIGN KEY (facilitator_id) REFERENCES facilitators(facilitator_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_appointments_slots
    FOREIGN KEY (slot_id) REFERENCES availability_slots(slot_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: emergency_contacts
-- ============================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  contact_id INT NOT NULL AUTO_INCREMENT,
  contact_type ENUM('Hotline', 'Campus Service', 'Emergency Service', 'Mental Health Service') NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  website VARCHAR(255) DEFAULT NULL,
  available_24_7 TINYINT(1) NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0,
  created_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (contact_id),
  KEY idx_emergency_contacts_type (contact_type),
  KEY idx_emergency_contacts_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SEED DATA: Test Students
-- ============================================
INSERT IGNORE INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag, registered_at) VALUES
('STU001', 'Alice Johnson', 'alice@campus.edu', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUbye/Ei', 'CICS', 3, 'F', 1, '2026-01-15T10:30:00Z'),
('STU002', 'Bob Smith', 'bob@campus.edu', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUbye/Ei', 'CICS', 2, 'M', 1, '2026-01-16T11:45:00Z'),
('STU003', 'Carol White', 'carol@campus.edu', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUbye/Ei', 'CBM', 4, 'F', 1, '2026-01-17T09:20:00Z'),
('STU004', 'David Brown', 'david@campus.edu', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUbye/Ei', 'CAS', 1, 'M', 1, '2026-01-18T14:15:00Z'),
('STU005', 'Emma Davis', 'emma@campus.edu', '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUbye/Ei', 'CICS', 3, 'F', 1, '2026-01-19T12:00:00Z');

-- ============================================
-- SEED DATA: Emergency Contacts
-- ============================================
INSERT IGNORE INTO emergency_contacts (contact_type, name, description, phone, email, website, available_24_7, priority, created_at) VALUES
('Hotline', 'National Crisis Hotline', 'Immediate mental health crisis support', '1-800-273-8255', NULL, 'https://suicidepreventionlifeline.org', 1, 1, '2026-01-01T00:00:00Z'),
('Campus Service', 'Campus Health Center', 'On-campus medical and counseling services', '555-0100', 'health@campus.edu', 'https://campus.edu/health', 0, 2, '2026-01-01T00:00:00Z'),
('Mental Health Service', 'Student Wellness Center', 'Counseling and peer support programs', '555-0101', 'wellness@campus.edu', 'https://campus.edu/wellness', 0, 2, '2026-01-01T00:00:00Z'),
('Emergency Service', 'Emergency Medical Services', 'Emergency medical response', '911', NULL, NULL, 1, 1, '2026-01-01T00:00:00Z');

-- ============================================
-- SEED DATA: Test OGC Account
-- ============================================
UPDATE facilitators SET email = 'ogc@campus.edu', password_hash = '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUbye/Ei' WHERE facilitator_id = 1;

-- ============================================
-- END OF SETUP
-- ============================================
-- NOTE: Password hash is bcrypt of 'password123' for all test accounts
-- Collaborators should reset these passwords in production!
