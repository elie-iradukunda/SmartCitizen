CREATE DATABASE IF NOT EXISTS smart_citizen_portal;
USE smart_citizen_portal;

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(40),
  role ENUM('citizen','reviewer','institution','admin','superadmin') DEFAULT 'citizen',
  gender VARCHAR(40),
  province VARCHAR(120),
  district VARCHAR(120),
  sector VARCHAR(120),
  avatar TEXT,
  badges JSON,
  points INT DEFAULT 0,
  status ENUM('active','suspended','pending') DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#2563eb',
  description TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE ideas (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  public_id VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(220) NOT NULL,
  slug VARCHAR(240) NOT NULL UNIQUE,
  status ENUM('Under Review','Approved','In Progress','Implemented','Rejected') DEFAULT 'Under Review',
  submitted_at DATE,
  votes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  comments INT DEFAULT 0,
  bookmarks INT DEFAULT 0,
  shares INT DEFAULT 0,
  level VARCHAR(120),
  technology TEXT,
  estimated_cost DECIMAL(14,2) DEFAULT 0,
  beneficiaries TEXT,
  location VARCHAR(240),
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  impact TEXT,
  summary TEXT,
  images JSON,
  files JSON,
  score INT DEFAULT 0,
  review_comment TEXT,
  author_id BIGINT,
  category_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE challenges (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL,
  authority VARCHAR(180),
  deadline DATE,
  ideas_count INT DEFAULT 0,
  prize VARCHAR(180),
  status ENUM('Open','Closed','Awarded') DEFAULT 'Open',
  image TEXT,
  category_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE projects (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  stage VARCHAR(80) DEFAULT 'Validation',
  owner VARCHAR(160),
  progress INT DEFAULT 0,
  target_amount DECIMAL(14,2) DEFAULT 0,
  raised_amount DECIMAL(14,2) DEFAULT 0,
  partners JSON,
  idea_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (idea_id) REFERENCES ideas(id)
);

CREATE TABLE events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  type VARCHAR(80),
  event_date DATE NOT NULL,
  location VARCHAR(220),
  capacity INT DEFAULT 0,
  registered INT DEFAULT 0,
  description TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  thread_id VARCHAR(100) NOT NULL,
  `from` VARCHAR(160) NOT NULL,
  `to` VARCHAR(160),
  text TEXT NOT NULL,
  mine BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(80),
  `read` BOOLEAN DEFAULT FALSE,
  user_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE badges (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  icon VARCHAR(80),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE achievements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  progress INT DEFAULT 0,
  icon VARCHAR(80),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE funding (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  investor VARCHAR(180) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  status ENUM('Committed','Released','Cancelled') DEFAULT 'Committed',
  funded_at DATE,
  project_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  type VARCHAR(80) NOT NULL,
  owner VARCHAR(160),
  created_on DATE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor VARCHAR(160),
  action VARCHAR(220) NOT NULL,
  metadata JSON,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

