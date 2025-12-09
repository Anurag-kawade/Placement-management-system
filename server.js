const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Configuration
const PORT = 5000;
const DB_HOST = "localhost";
const DB_USER = "root";
const DB_PASSWORD = "Madhu@2006";
const DB_NAME = "placement_management";
const JWT_SECRET = "placement_management_secret_key_2024";

// MySQL Connection
const connection = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error("? Error connecting to MySQL:", err.message);
    console.log("?? Please make sure:");
    console.log("   1. MySQL server is running");
    console.log("   2. Database '" + DB_NAME + "' exists");
    console.log("   3. MySQL password is correct");
    console.log("   4. Create database with: CREATE DATABASE " + DB_NAME + ";");
    return;
  }
  console.log("? Connected to MySQL database");
  createTables();
});

// Create tables if they don't exist
const createTables = () => {
  console.log("?? Creating database tables...");

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
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      console.error("? Error creating users table:", err.message);
    } else {
      console.log("? Users table ready");
    }
  });

  connection.query(placementsTable, (err) => {
    if (err) {
      console.error("? Error creating placements table:", err.message);
    } else {
      console.log("? Placements table ready");
    }
  });

  connection.query(applicationsTable, (err) => {
    if (err) {
      console.error("? Error creating applications table:", err.message);
    } else {
      console.log("? Applications table ready");
    }
  });
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth Middleware
const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const query = "SELECT id, name, email, role, branch, student_id, cgpa, phone, address FROM users WHERE id = ?";
    connection.query(query, [decoded.userId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ message: "Token is not valid" });
      }

      req.user = results[0];
      next();
    });
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }
    next();
  });
};

// Routes

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, branch, adminCode } = req.body;

    // Check if user already exists
    const checkUserQuery = "SELECT id FROM users WHERE email = ?";
    connection.query(checkUserQuery, [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Validate admin code
      if (role === "admin" && adminCode !== "admin123") {
        return res.status(400).json({ message: "Invalid admin code" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate student ID if student
      let studentId = null;
      if (role === "student") {
        const countQuery = "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND branch = ?";
        connection.query(countQuery, [branch], (err, countResults) => {
          if (err) {
            return res.status(500).json({ message: "Database error" });
          }
          
          const count = countResults[0].count + 1;
          studentId = branch.toUpperCase() + "2023" + count.toString().padStart(3, "0");
          
          insertUser();
        });
      } else {
        insertUser();
      }

      function insertUser() {
        const insertQuery = `
          INSERT INTO users (name, email, password, role, branch, student_id) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        connection.query(insertQuery, [name, email, hashedPassword, role, branch, studentId], (err, results) => {
          if (err) {
            return res.status(500).json({ message: "Database error" });
          }

          const token = jwt.sign(
            { userId: results.insertId },
            JWT_SECRET,
            { expiresIn: "24h" }
          );

          res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
              id: results.insertId,
              name,
              email,
              role,
              branch,
              studentId
            }
          });
        });
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password, role } = req.body;

    const query = "SELECT * FROM users WHERE email = ? AND role = ?";
    connection.query(query, [email, role], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branch: user.branch,
          studentId: user.student_id,
          cgpa: user.cgpa,
          phone: user.phone,
          address: user.address
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Placements Routes
app.get("/api/placements", auth, (req, res) => {
  const { user } = req;

  let query = `
    SELECT p.*, u.name as created_by_name 
    FROM placements p 
    LEFT JOIN users u ON p.created_by = u.id 
    WHERE p.status = 'active'
  `;
  const params = [];

  // For students, only show placements for their branch
  if (user.role === "student") {
    query += " AND JSON_CONTAINS(p.branches, ?)";
    params.push(JSON.stringify(user.branch));
  }

  query += " ORDER BY p.deadline ASC";

  connection.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error" });
    }

    // Parse JSON branches
    const placements = results.map(placement => ({
      ...placement,
      branches: JSON.parse(placement.branches)
    }));

    res.json(placements);
  });
});

app.post("/api/placements", adminAuth, (req, res) => {
  const { company, position, package, eligibility, description, deadline, branches } = req.body;
  const createdBy = req.user.id;

  const query = `
    INSERT INTO placements (company, position, package, eligibility, description, deadline, branches, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  connection.query(query, [
    company, 
    position, 
    package, 
    eligibility, 
    description, 
    deadline, 
    JSON.stringify(branches), 
    createdBy
  ], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error" });
    }

    res.status(201).json({
      message: "Placement created successfully",
      placement: {
        id: results.insertId,
        company,
        position,
        package,
        eligibility,
        description,
        deadline,
        branches
      }
    });
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({ 
    message: "Placement Management API is running!",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login"
      },
      placements: {
        get: "GET /api/placements",
        create: "POST /api/placements (admin only)"
      }
    }
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  console.log("?? Server is running on port " + PORT);
  console.log("?? API URL: http://localhost:" + PORT + "/api");
  console.log("??  Health check: http://localhost:" + PORT + "/api/health");
  console.log("?? Default admin code: admin123");
  console.log("?? Make sure MySQL is running and database '" + DB_NAME + "' exists");
});
