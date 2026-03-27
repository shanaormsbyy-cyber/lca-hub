const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth());

router.get('/', (req, res) => {
  const { month } = req.query; // 'YYYY-MM'
  const rows = month
    ? db.prepare(`SELECT e.*, u.name as creator_name FROM events e JOIN users u ON u.id=e.created_by WHERE e.start_date LIKE ? ORDER BY e.start_date, e.start_time`).all(`${month}%`)
    : db.prepare(`SELECT e.*, u.name as creator_name FROM events e JOIN users u ON u.id=e.created_by ORDER BY e.start_date, e.start_time`).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT e.*, u.name as creator_name FROM events e JOIN users u ON u.id=e.created_by WHERE e.id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', requireAuth(['admin', 'manager']), (req, res) => {
  const { title, description, start_date, end_date, start_time, end_time, event_type, color } = req.body;
  if (!title?.trim() || !start_date) return res.status(400).json({ error: 'Title and start_date required' });
  const result = db.prepare('INSERT INTO events (title, description, start_date, end_date, start_time, end_time, event_type, color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(title.trim(), description || '', start_date, end_date || null, start_time || null, end_time || null, event_type || 'general', color || '#3AB5D9', req.user.id);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const { title, description, start_date, end_date, start_time, end_time, event_type, color } = req.body;
  db.prepare('UPDATE events SET title=?, description=?, start_date=?, end_date=?, start_time=?, end_time=?, event_type=?, color=? WHERE id=?')
    .run(title, description || '', start_date, end_date || null, start_time || null, end_time || null, event_type || 'general', color || '#3AB5D9', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth(['admin', 'manager']), (req, res) => {
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
