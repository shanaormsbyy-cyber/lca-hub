const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const UPLOADS_DIR = process.env.NODE_ENV === 'production' ? '/app/data/uploads/resources' : path.join(__dirname, '..', '..', 'data', 'uploads', 'resources');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `res_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();
router.use(requireAuth());

router.get('/', (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db.prepare('SELECT r.*, u.name as uploader_name FROM resources r JOIN users u ON u.id=r.uploaded_by WHERE r.category=? ORDER BY r.created_at DESC').all(category)
    : db.prepare('SELECT r.*, u.name as uploader_name FROM resources r JOIN users u ON u.id=r.uploaded_by ORDER BY r.category, r.created_at DESC').all();
  res.json(rows);
});

router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM resources ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

router.post('/', requireAuth(['admin', 'manager']), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { category, name, description } = req.body;
  const result = db.prepare('INSERT INTO resources (category, name, description, filename, original_name, mime_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(category || 'General', name || req.file.originalname, description || '', req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.user.id);
  res.json({ id: result.lastInsertRowid });
});

router.delete('/:id', requireAuth(['admin', 'manager']), (req, res) => {
  const row = db.prepare('SELECT * FROM resources WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const fp = path.join(UPLOADS_DIR, row.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.prepare('DELETE FROM resources WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
