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
app.use(cors());
app.use(express.json());

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
