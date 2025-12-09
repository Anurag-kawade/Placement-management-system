const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { connection } = require('../config/database');

const router = express.Router();

// Get all placements
router.get('/', auth, (req, res) => {
  const { user } = req;
  const today = new Date().toISOString().split('T')[0];

  let query = `
    SELECT p.*, u.name as created_by_name 
    FROM placements p 
    LEFT JOIN users u ON p.created_by = u.id 
    WHERE p.status = 'active'
  `;
  const params = [];

  // For students, only show placements for their branch
  if (user.role === 'student') {
    query += ' AND JSON_CONTAINS(p.branches, ?)';
    params.push(JSON.stringify(user.branch));
  }

  query += ' ORDER BY p.deadline ASC';

  connection.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    // Parse JSON branches
    const placements = results.map(placement => ({
      ...placement,
      branches: JSON.parse(placement.branches)
    }));

    res.json(placements);
  });
});

// Get placement by ID
router.get('/:id', auth, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT p.*, u.name as created_by_name 
    FROM placements p 
    LEFT JOIN users u ON p.created_by = u.id 
    WHERE p.id = ?
  `;

  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Placement not found' });
    }

    const placement = {
      ...results[0],
      branches: JSON.parse(results[0].branches)
    };

    res.json(placement);
  });
});

// Create placement (Admin only)
router.post('/', adminAuth, (req, res) => {
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
      return res.status(500).json({ message: 'Database error' });
    }

    res.status(201).json({
      message: 'Placement created successfully',
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

// Update placement (Admin only)
router.put('/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { company, position, package, eligibility, description, deadline, branches } = req.body;

  const query = `
    UPDATE placements 
    SET company = ?, position = ?, package = ?, eligibility = ?, description = ?, deadline = ?, branches = ? 
    WHERE id = ?
  `;

  connection.query(query, [
    company, 
    position, 
    package, 
    eligibility, 
    description, 
    deadline, 
    JSON.stringify(branches), 
    id
  ], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Placement not found' });
    }

    res.json({ message: 'Placement updated successfully' });
  });
});

// Delete placement (Admin only)
router.delete('/:id', adminAuth, (req, res) => {
  const { id } = req.params;

  // Check if there are applications for this placement
  const checkQuery = 'SELECT COUNT(*) as app_count FROM applications WHERE placement_id = ?';
  connection.query(checkQuery, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (results[0].app_count > 0) {
      return res.status(400).json({ message: 'Cannot delete placement with existing applications' });
    }

    const deleteQuery = 'DELETE FROM placements WHERE id = ?';
    connection.query(deleteQuery, [id], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Placement not found' });
      }

      res.json({ message: 'Placement deleted successfully' });
    });
  });
});

module.exports = router;