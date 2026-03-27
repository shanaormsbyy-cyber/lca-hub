const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ROLE_ORDER = ['staff', 'manager', 'admin'];

// GET /api/access — public (called on login to build nav)
router.get('/', requireAuth(), (req, res) => {
  const rows = db.prepare('SELECT section, min_role FROM section_access ORDER BY section').all();
  res.json(rows);
});

// PUT /api/access/:section — admin only
router.put('/:section', requireAuth(['admin']), (req, res) => {
  const { section } = req.params;
  const { min_role } = req.body;

  if (!ROLE_ORDER.includes(min_role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  // Prevent locking admin out of admin panel
  if (section === 'admin' && min_role !== 'admin') {
    return res.status(400).json({ error: 'Admin section must remain admin-only' });
  }
  // Prevent locking everyone out of dashboard
  if (section === 'dashboard' && min_role !== 'staff') {
    return res.status(400).json({ error: 'Dashboard must remain accessible to all staff' });
  }

  db.prepare('UPDATE section_access SET min_role=? WHERE section=?').run(min_role, section);
  res.json({ ok: true });
});

module.exports = router;
