const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Madhu@2006',
  database: process.env.DB_NAME || 'placement_management'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Create tables if they don't exist
const createTables = () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('student', 'admin') NOT NULL,
      branch ENUM('cs', 'it', 'ece', 'me', 'ce'),
      student_id VARCHAR(50),
      cgpa DECIMAL(3,2) DEFAULT 0.00,
      phone VARCHAR(20) DEFAULT '',
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  const placementsTable = `
    CREATE TABLE IF NOT EXISTS placements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company VARCHAR(255) NOT NULL,
      position VARCHAR(255) NOT NULL,
      package DECIMAL(10,2) NOT NULL,
      eligibility TEXT NOT NULL,
      description TEXT NOT NULL,
      deadline DATE NOT NULL,
      branches JSON NOT NULL,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `;

  const applicationsTable = `
    CREATE TABLE IF NOT EXISTS applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      placement_id INT NOT NULL,
      company VARCHAR(255) NOT NULL,
      position VARCHAR(255) NOT NULL,
      applied_date DATE DEFAULT CURRENT_DATE,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      cover_letter TEXT,
      resume VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (placement_id) REFERENCES placements(id),
      UNIQUE KEY unique_application (student_id, placement_id)
    )
  `;

  connection.query(usersTable, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table ready');
    }
  });

  connection.query(placementsTable, (err) => {
    if (err) {
      console.error('Error creating placements table:', err);
    } else {
      console.log('Placements table ready');
    }
  });

  connection.query(applicationsTable, (err) => {
    if (err) {
      console.error('Error creating applications table:', err);
    } else {
      console.log('Applications table ready');
    }
  });
};

module.exports = { connection, createTables };