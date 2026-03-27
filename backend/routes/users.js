const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth());

router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.name, u.role, u.department, u.avatar_color, u.phone, u.working_days, u.city_id, c.name as city_name, u.created_at
    FROM users u LEFT JOIN cities c ON c.id = u.city_id
    ORDER BY u.name
  `).all();
  res.json(users);
});

router.get('/:id', (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.name, u.role, u.department, u.avatar_color, u.phone, u.working_days, u.city_id, c.name as city_name, u.created_at
    FROM users u LEFT JOIN cities c ON c.id = u.city_id
    WHERE u.id=?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.post('/', requireAuth(['admin']), (req, res) => {
  const { username, password, name, role, department, avatar_color } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'username, password and name required' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare('INSERT INTO users (username, password_hash, name, role, department, avatar_color) VALUES (?, ?, ?, ?, ?, ?)').run(username.toLowerCase().trim(), hash, name, role || 'staff', department || '', avatar_color || '#3AB5D9');
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth(['admin']), (req, res) => {
  const { name, role, department, avatar_color, phone, working_days, city_id } = req.body;
  db.prepare('UPDATE users SET name=?, role=?, department=?, avatar_color=?, phone=?, working_days=?, city_id=? WHERE id=?')
    .run(name, role, department || '', avatar_color || '#3AB5D9', phone || '', working_days || '', city_id || null, req.params.id);
  res.json({ ok: true });
});

router.put('/:id/profile', requireAuth(), (req, res) => {
  // Users can update their own profile; admins can update any
  if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { name, department, avatar_color, phone, working_days } = req.body;
  db.prepare('UPDATE users SET name=?, department=?, avatar_color=?, phone=?, working_days=? WHERE id=?')
    .run(name, department || '', avatar_color || '#3AB5D9', phone || '', working_days || '', req.params.id);
  res.json({ ok: true });
});

router.put('/:id/password', requireAuth(['admin']), (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth(['admin']), (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
