const express = require('express');
const bcrypt = require('bcryptjs');
const { auth, adminAuth } = require('../middleware/auth');
const { connection } = require('../config/database');

const router = express.Router();

// Get all students (Admin only)
router.get('/students', adminAuth, (req, res) => {
  const { branch } = req.query;
  
  let query = 'SELECT id, name, email, branch, student_id, cgpa, phone, address FROM users WHERE role = "student"';
  const params = [];
  
  if (branch && branch !== 'all') {
    query += ' AND branch = ?';
    params.push(branch);
  }

  connection.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    // Add status based on applications
    const studentsWithStatus = results.map(student => {
      return new Promise((resolve) => {
        const statusQuery = `
          SELECT COUNT(*) as application_count 
          FROM applications 
          WHERE student_id = ? AND status = 'approved'
        `;
        
        connection.query(statusQuery, [student.id], (err, appResults) => {
          if (err) {
            student.status = 'searching';
          } else {
            student.status = appResults[0].application_count > 0 ? 'placed' : 'searching';
          }
          resolve(student);
        });
      });
    });

    Promise.all(studentsWithStatus).then(students => {
      res.json(students);
    });
  });
});

// Add student (Admin only)
router.post('/students', adminAuth, async (req, res) => {
  const { name, email, branch, studentId, cgpa } = req.body;

  try {
    // Check if user already exists
    const checkQuery = 'SELECT id FROM users WHERE email = ?';
    connection.query(checkQuery, [email], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      const defaultPassword = 'password123';
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
      
      const insertQuery = `
        INSERT INTO users (name, email, password, role, branch, student_id, cgpa) 
        VALUES (?, ?, ?, 'student', ?, ?, ?)
      `;

      connection.query(insertQuery, [name, email, hashedPassword, branch, studentId, cgpa], (err, results) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        res.status(201).json({
          message: 'Student added successfully',
          student: {
            id: results.insertId,
            name,
            email,
            branch,
            studentId,
            cgpa
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/profile', auth, (req, res) => {
  const { name, email, phone, address, cgpa } = req.body;
  const userId = req.user.id;

  const query = `
    UPDATE users 
    SET name = ?, email = ?, phone = ?, address = ?, cgpa = ? 
    WHERE id = ?
  `;

  connection.query(query, [name, email, phone, address, cgpa, userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json({ message: 'Profile updated successfully' });
  });
});

module.exports = router;