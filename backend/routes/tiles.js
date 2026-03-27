const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth());

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM app_tiles ORDER BY order_idx, id').all());
});

router.post('/', requireAuth(['admin']), (req, res) => {
  const { name, url, icon, color, order_idx } = req.body;
  if (!name?.trim() || !url?.trim()) return res.status(400).json({ error: 'Name and URL required' });
  const result = db.prepare('INSERT INTO app_tiles (name, url, icon, color, order_idx, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(name.trim(), url.trim(), icon || '🔗', color || '#3AB5D9', order_idx ?? 99, req.user.id);
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', requireAuth(['admin']), (req, res) => {
  const { name, url, icon, color, order_idx } = req.body;
  db.prepare('UPDATE app_tiles SET name=?, url=?, icon=?, color=?, order_idx=? WHERE id=?').run(name, url, icon || '🔗', color || '#3AB5D9', order_idx ?? 99, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth(['admin']), (req, res) => {
  db.prepare('DELETE FROM app_tiles WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

router.patch('/reorder', requireAuth(['admin']), (req, res) => {
  const { ids } = req.body;
  ids.forEach((id, i) => db.prepare('UPDATE app_tiles SET order_idx=? WHERE id=?').run(i, id));
  res.json({ ok: true });
});

module.exports = router;
