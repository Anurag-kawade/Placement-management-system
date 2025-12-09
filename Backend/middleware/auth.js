const jwt = require('jsonwebtoken');
const { connection } = require('../config/database');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const query = 'SELECT id, name, email, role, branch, student_id, cgpa, phone, address FROM users WHERE id = ?';
    connection.query(query, [decoded.userId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ message: 'Token is not valid' });
      }

      req.user = results[0];
      next();
    });
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    next();
  });
};

module.exports = { auth, adminAuth };