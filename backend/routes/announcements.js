const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth());

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, u.name as author_name
    FROM announcements a
    JOIN users u ON u.id = a.author_id
    WHERE a.is_active = 1
      AND a.id NOT IN (
        SELECT announcement_id FROM announcement_dismissals WHERE user_id=?
      )
    ORDER BY a.created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

router.get('/all', requireAuth(['admin', 'manager']), (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, u.name as author_name FROM announcements a
    JOIN users u ON u.id = a.author_id ORDER BY a.created_at DESC
  `).all();
  res.json(rows);
});

router.post('/', requireAuth(['admin', 'manager']), (req, res) => {
  const { title, body } = req.body;
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Title and body required' });
  const result = db.prepare('INSERT INTO announcements (author_id, title, body) VALUES (?, ?, ?)').run(req.user.id, title.trim(), body.trim());
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const { title, body, is_active } = req.body;
  db.prepare('UPDATE announcements SET title=?, body=?, is_active=? WHERE id=?').run(title, body, is_active ?? 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth(['admin', 'manager']), (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/dismiss', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO announcement_dismissals (announcement_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
