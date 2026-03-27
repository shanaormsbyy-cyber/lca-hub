const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth());

router.get('/conversations', (req, res) => {
  const uid = req.user.id;
  const partners = db.prepare(`
    SELECT DISTINCT
      CASE WHEN from_user_id=? THEN to_user_id ELSE from_user_id END as partner_id
    FROM messages WHERE from_user_id=? OR to_user_id=?
  `).all(uid, uid, uid).map(r => r.partner_id);

  const conversations = partners.map(pid => {
    const partner = db.prepare('SELECT id, name, avatar_color, role FROM users WHERE id=?').get(pid);
    const last = db.prepare(`
      SELECT * FROM messages
      WHERE (from_user_id=? AND to_user_id=?) OR (from_user_id=? AND to_user_id=?)
      ORDER BY created_at DESC LIMIT 1
    `).get(uid, pid, pid, uid);
    const unread = db.prepare('SELECT COUNT(*) as cnt FROM messages WHERE from_user_id=? AND to_user_id=? AND is_read=0').get(pid, uid).cnt;
    return { partner, last, unread };
  }).filter(c => c.partner).sort((a, b) => (b.last?.created_at || '').localeCompare(a.last?.created_at || ''));

  res.json(conversations);
});

router.get('/:userId', (req, res) => {
  const uid = req.user.id;
  const pid = parseInt(req.params.userId);
  const msgs = db.prepare(`
    SELECT m.*, u.name as from_name, u.avatar_color as from_color
    FROM messages m JOIN users u ON u.id=m.from_user_id
    WHERE (m.from_user_id=? AND m.to_user_id=?) OR (m.from_user_id=? AND m.to_user_id=?)
    ORDER BY m.created_at ASC
  `).all(uid, pid, pid, uid);
  // Mark as read
  db.prepare('UPDATE messages SET is_read=1 WHERE from_user_id=? AND to_user_id=? AND is_read=0').run(pid, uid);
  res.json(msgs);
});

router.post('/:userId', (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Message body required' });
  const result = db.prepare('INSERT INTO messages (from_user_id, to_user_id, body) VALUES (?, ?, ?)').run(req.user.id, parseInt(req.params.userId), body.trim());
  res.json({ id: result.lastInsertRowid });
});

module.exports = router;
