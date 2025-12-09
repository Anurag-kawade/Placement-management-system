const express = require('express');
const { adminAuth } = require('../middleware/auth');
const { connection } = require('../config/database');

const router = express.Router();

// Get placement statistics
router.get('/placement-stats', adminAuth, (req, res) => {
  const { year } = req.query;

  const statsQuery = `
    SELECT 
      COUNT(*) as total_applications,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_applications,
      AVG(CASE WHEN status = 'approved' THEN p.package ELSE NULL END) as avg_package,
      MAX(CASE WHEN status = 'approved' THEN p.package ELSE 0 END) as highest_package,
      COUNT(DISTINCT CASE WHEN status = 'approved' THEN a.company END) as companies_visited
    FROM applications a
    JOIN placements p ON a.placement_id = p.id
    WHERE YEAR(a.applied_date) = ?
  `;

  connection.query(statsQuery, [year], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    const stats = results[0];
    const placementRate = stats.total_applications > 0 
      ? Math.round((stats.approved_applications / stats.total_applications) * 100) 
      : 0;

    res.json({
      placementRate: `${placementRate}%`,
      avgPackage: `₹${stats.avg_package || 0} LPA`,
      highestPackage: `₹${stats.highest_package || 0} LPA`,
      companiesVisited: stats.companies_visited
    });
  });
});

// Get branch-wise statistics
router.get('/branch-stats', adminAuth, (req, res) => {
  const { year } = req.query;

  const branchQuery = `
    SELECT 
      u.branch,
      COUNT(*) as total_applications,
      SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as offers
    FROM applications a
    JOIN users u ON a.student_id = u.id
    WHERE YEAR(a.applied_date) = ?
    GROUP BY u.branch
  `;

  connection.query(branchQuery, [year], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(results);
  });
});

// Get detailed placement report
router.get('/detailed-report', adminAuth, (req, res) => {
  const { year } = req.query;

  const reportQuery = `
    SELECT 
      a.company,
      p.branches,
      COUNT(*) as offers,
      AVG(p.package) as avg_package,
      MAX(p.package) as highest_package
    FROM applications a
    JOIN placements p ON a.placement_id = p.id
    WHERE a.status = 'approved' AND YEAR(a.applied_date) = ?
    GROUP BY a.company, p.branches
    ORDER BY offers DESC
  `;

  connection.query(reportQuery, [year], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    const report = results.map(row => ({
      ...row,
      branches: JSON.parse(row.branches).join(', ')
    }));

    res.json(report);
  });
});

module.exports = router;