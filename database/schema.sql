CREATE DATABASE IF NOT EXISTS smart_citizen_portal;
USE smart_citizen_portal;

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  national_id VARCHAR(40),
  role ENUM('citizen','staff','admin') DEFAULT 'citizen',
  gender VARCHAR(40),
  province VARCHAR(120),
  district VARCHAR(120),
  sector VARCHAR(120),
  cell VARCHAR(120),
  village VARCHAR(120),
  address VARCHAR(240),
  preferred_language VARCHAR(40) DEFAULT 'English',
  avatar TEXT,
  office_id BIGINT,
  status ENUM('active','suspended','pending') DEFAULT 'active',
  reset_token_hash VARCHAR(255),
  reset_token_expiry DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE complaint_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  default_priority ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
  sla_days INT DEFAULT 3,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE offices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL UNIQUE,
  contact_person VARCHAR(160),
  phone VARCHAR(40),
  email VARCHAR(190),
  active BOOLEAN DEFAULT TRUE,
  is_sector_executive BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_office
  FOREIGN KEY (office_id) REFERENCES offices(id);

CREATE TABLE routing_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL UNIQUE,
  category_id BIGINT NOT NULL,
  office_id BIGINT NOT NULL,
  location VARCHAR(180) DEFAULT 'Kacyiru',
  priority ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
  sla_days INT DEFAULT 3,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_routing_category FOREIGN KEY (category_id) REFERENCES complaint_categories(id),
  CONSTRAINT fk_routing_office FOREIGN KEY (office_id) REFERENCES offices(id)
);

CREATE TABLE complaints (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tracking_number VARCHAR(40) NOT NULL UNIQUE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  citizen_id BIGINT,
  category_id BIGINT NOT NULL,
  office_id BIGINT NOT NULL,
  citizen_name VARCHAR(160) NOT NULL,
  citizen_phone VARCHAR(40),
  description TEXT NOT NULL,
  location VARCHAR(240),
  cell VARCHAR(120),
  village VARCHAR(120),
  priority ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
  status ENUM('Assigned','In Review','Waiting for Citizen','Resolved','Closed','Escalated') DEFAULT 'Assigned',
  assigned_to VARCHAR(160),
  escalated_to VARCHAR(180),
  channel VARCHAR(80) DEFAULT 'Web Portal',
  submission_mode VARCHAR(80) DEFAULT 'Typed form',
  evidence_type VARCHAR(40),
  attachment_name VARCHAR(220),
  attachment_path VARCHAR(255),
  evidence_link VARCHAR(500),
  voice_note_name VARCHAR(220),
  voice_note_path VARCHAR(255),
  voice_note_type VARCHAR(40),
  due_date DATE,
  chat_opened_at DATETIME,
  escalation_requested_at DATETIME,
  resolved_at DATETIME,
  closed_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_complaints_citizen FOREIGN KEY (citizen_id) REFERENCES users(id),
  CONSTRAINT fk_complaints_category FOREIGN KEY (category_id) REFERENCES complaint_categories(id),
  CONSTRAINT fk_complaints_office FOREIGN KEY (office_id) REFERENCES offices(id),
  INDEX idx_complaints_status (status),
  INDEX idx_complaints_due_date (due_date),
  INDEX idx_complaints_created_at (created_at)
);

CREATE TABLE complaint_responses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  complaint_id BIGINT NOT NULL,
  responder_id BIGINT,
  responder VARCHAR(180) NOT NULL,
  response_text TEXT NOT NULL,
  status_update ENUM('Assigned','In Review','Waiting for Citizen','Resolved','Closed','Escalated') NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_responses_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_responses_user FOREIGN KEY (responder_id) REFERENCES users(id)
);

-- The private conversation between a citizen and the office holding their case. It only
-- opens once that office has answered, which is why chat_opened_at lives on complaints.
CREATE TABLE complaint_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  complaint_id BIGINT NOT NULL,
  sender_id BIGINT,
  sender_name VARCHAR(180) NOT NULL,
  sender_role ENUM('citizen','staff','admin') NOT NULL,
  body TEXT NOT NULL,
  read_by_citizen BOOLEAN DEFAULT FALSE,
  read_by_office BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_messages_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  INDEX idx_messages_complaint (complaint_id, created_at)
);

CREATE TABLE satisfaction_ratings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  complaint_id BIGINT NOT NULL UNIQUE,
  score INT NOT NULL,
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  rated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_ratings_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);

CREATE TABLE complaint_notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  complaint_id BIGINT,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  `read` BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notifications_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor VARCHAR(160),
  action VARCHAR(220) NOT NULL,
  metadata JSON,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE counters (
  `key` VARCHAR(60) PRIMARY KEY,
  value INT DEFAULT 0
);
