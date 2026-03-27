const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'lca-hub-dev-secret';

function requireAuth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, SECRET);
      const user = db.prepare('SELECT id, username, name, role, department, avatar_color FROM users WHERE id=?').get(payload.id);
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = { requireAuth, SECRET };
