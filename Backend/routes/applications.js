const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { connection } = require('../config/database');

const router = express.Router();

// Get all applications (Admin only)
router.get('/', adminAuth, (req, res) => {
  const query = `
    SELECT a.*, u.name as student_name, u.student_id, p.position, p.company
    FROM applications a
    JOIN users u ON a.student_id = u.id
    JOIN placements p ON a.placement_id = p.id
    ORDER BY a.created_at DESC
  `;

  connection.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(results);
  });
});

// Get student's applications
router.get('/my-applications', auth, (req, res) => {
  const studentId = req.user.id;

  const query = `
    SELECT a.*, p.company, p.position, p.package
    FROM applications a
    JOIN placements p ON a.placement_id = p.id
    WHERE a.student_id = ?
    ORDER BY a.applied_date DESC
  `;

  connection.query(query, [studentId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(results);
  });
});

// Apply for placement
router.post('/', auth, (req, res) => {
  const { placementId, coverLetter } = req.body;
  const studentId = req.user.id;

  // Check if placement exists and is active
  const placementQuery = 'SELECT * FROM placements WHERE id = ? AND status = "active"';
  connection.query(placementQuery, [placementId], (err, placementResults) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (placementResults.length === 0) {
      return res.status(404).json({ message: 'Placement not found or inactive' });
    }

    const placement = placementResults[0];
    const branches = JSON.parse(placement.branches);

    // Check if student's branch is eligible
    if (req.user.role === 'student' && !branches.includes(req.user.branch)) {
      return res.status(400).json({ message: 'Your branch is not eligible for this placement' });
    }

    // Check if deadline has passed
    const today = new Date();
    const deadline = new Date(placement.deadline);
    if (deadline < today) {
      return res.status(400).json({ message: 'Application deadline has passed' });
    }

    // Check if already applied
    const checkQuery = 'SELECT id FROM applications WHERE student_id = ? AND placement_id = ?';
    connection.query(checkQuery, [studentId, placementId], (err, checkResults) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (checkResults.length > 0) {
        return res.status(400).json({ message: 'You have already applied for this placement' });
      }

      // Create application
      const insertQuery = `
        INSERT INTO applications (student_id, placement_id, company, position, cover_letter) 
        VALUES (?, ?, ?, ?, ?)
      `;

      connection.query(insertQuery, [
        studentId, 
        placementId, 
        placement.company, 
        placement.position, 
        coverLetter
      ], (err, results) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        res.status(201).json({
          message: 'Application submitted successfully',
          application: {
            id: results.insertId,
            company: placement.company,
            position: placement.position,
            appliedDate: new Date().toISOString().split('T')[0],
            status: 'pending'
          }
        });
      });
    });
  });
});

// Update application status (Admin only)
router.put('/:id/status', adminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const query = 'UPDATE applications SET status = ? WHERE id = ?';
  connection.query(query, [status, id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ message: `Application ${status} successfully` });
  });
});

// Withdraw application
router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;

  const query = 'DELETE FROM applications WHERE id = ? AND student_id = ?';
  connection.query(query, [id, studentId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ message: 'Application withdrawn successfully' });
  });
});

module.exports = router;