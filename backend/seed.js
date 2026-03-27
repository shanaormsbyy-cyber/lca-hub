const bcrypt = require('bcryptjs');
const db = require('./db');

const hash = bcrypt.hashSync('lca2026', 10);
db.prepare('INSERT OR IGNORE INTO users (username, password_hash, name, role, avatar_color) VALUES (?, ?, ?, ?, ?)').run('admin', hash, 'Admin', 'admin', '#3AB5D9');

// Seed default app tiles
const tiles = [
  { name: 'QC & Training', url: 'https://lca-qc-app.up.railway.app', icon: '✅', color: '#22c55e', order_idx: 0 },
  { name: 'Scoreboard', url: 'https://lca-points-app.up.railway.app', icon: '⭐', color: '#f59e0b', order_idx: 1 },
];
const adminUser = db.prepare('SELECT id FROM users WHERE username=?').get('admin');
tiles.forEach(t => {
  db.prepare('INSERT OR IGNORE INTO app_tiles (name, url, icon, color, order_idx, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(t.name, t.url, t.icon, t.color, t.order_idx, adminUser.id);
});

console.log('Seed complete — admin user created (username: admin, password: lca2026)');
