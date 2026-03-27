const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth());

// GET all cities
router.get('/', (req, res) => {
  const cities = db.prepare('SELECT * FROM cities ORDER BY order_idx, name').all();
  res.json(cities);
});

// POST create city (admin/manager)
router.post('/', requireAuth(['admin', 'manager']), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const maxOrder = db.prepare('SELECT COALESCE(MAX(order_idx),0) as m FROM cities').get().m;
    const result = db.prepare('INSERT INTO cities (name, order_idx) VALUES (?, ?)').run(name.trim(), maxOrder + 1);
    res.json({ id: result.lastInsertRowid, name: name.trim(), order_idx: maxOrder + 1 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'City already exists' });
    res.status(500).json({ error: e.message });
  }
});

// PUT rename city (admin/manager)
router.put('/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    db.prepare('UPDATE cities SET name=? WHERE id=?').run(name.trim(), req.params.id);
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'City already exists' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE city (admin only) — unassigns users first
router.delete('/:id', requireAuth(['admin']), (req, res) => {
  db.prepare('UPDATE users SET city_id=NULL WHERE city_id=?').run(req.params.id);
  db.prepare('DELETE FROM cities WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
