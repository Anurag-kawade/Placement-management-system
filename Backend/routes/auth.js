const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connection } = require('../config/database');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, branch, adminCode } = req.body;

    // Check if user already exists
    const checkUserQuery = 'SELECT id FROM users WHERE email = ?';
    connection.query(checkUserQuery, [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Validate admin code
      if (role === 'admin' && adminCode !== 'admin123') {
        return res.status(400).json({ message: 'Invalid admin code' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate student ID if student
      let studentId = null;
      if (role === 'student') {
        const countQuery = 'SELECT COUNT(*) as count FROM users WHERE role = "student" AND branch = ?';
        connection.query(countQuery, [branch], (err, countResults) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }
          
          const count = countResults[0].count + 1;
          studentId = `${branch.toUpperCase()}2023${count.toString().padStart(3, '0')}`;
          
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
            return res.status(500).json({ message: 'Database error' });
          }

          const token = jwt.sign(
            { userId: results.insertId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.status(201).json({
            message: 'User registered successfully',
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password, role } = req.body;

    const query = 'SELECT * FROM users WHERE email = ? AND role = ?';
    connection.query(query, [email, role], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
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
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;