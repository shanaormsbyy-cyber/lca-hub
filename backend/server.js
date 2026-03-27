const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const db = require('./db');

// Auto-seed if fresh database
{
  const cnt = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  if (cnt === 0) {
    console.log('Fresh database — seeding...');
    require('./seed');
  }
}

const { addClient, removeClient, emit } = require('./emitter');

const app = express();

// Only allow requests from Railway domain + localhost in dev
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN, 'http://localhost:3002', 'http://localhost:5173']
  : true; // allow all in dev

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Limit request body size to prevent abuse
app.use(express.json({ limit: '2mb' }));

// Basic rate limiting on auth endpoints (no extra package needed)
const loginAttempts = new Map();
app.use('/api/auth/login', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < 15 * 60 * 1000); // 15 min window
  if (recent.length >= 10) return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  recent.push(now);
  loginAttempts.set(ip, recent);
  next();
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// SSE live-sync
app.get('/api/events-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(': connected\n\n');
  addClient(res);
  req.on('close', () => removeClient(res));
});

// Broadcast on any mutation
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const orig = res.json.bind(res);
    res.json = (body) => { orig(body); emit('change'); };
  }
  next();
});

// Static uploads
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, '..', 'data');
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/resources',     require('./routes/resources'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/tiles',         require('./routes/tiles'));
app.use('/api/access',        require('./routes/access'));

// Serve built frontend
const frontendBuild = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'), err => {
    if (err) res.status(404).send('Frontend not built. Run: cd frontend && npm run build');
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  console.log(`\nLCA Hub running`);
  console.log(`  Local:   http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  Network: http://${ip}:${PORT}`));
  console.log('');
});
