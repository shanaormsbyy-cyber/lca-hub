const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const UPLOADS_DIR = process.env.NODE_ENV === 'production' ? '/app/data/uploads/posts' : path.join(__dirname, '..', '..', 'data', 'uploads', 'posts');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `post_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const router = express.Router();
router.use(requireAuth());

function enrichPosts(posts, userId) {
  return posts.map(post => {
    const reactions = db.prepare('SELECT reaction, COUNT(*) as count FROM post_reactions WHERE post_id=? GROUP BY reaction').all(post.id);
    const userReactions = db.prepare('SELECT reaction FROM post_reactions WHERE post_id=? AND user_id=?').all(post.id, userId).map(r => r.reaction);
    const commentCount = db.prepare('SELECT COUNT(*) as cnt FROM post_comments WHERE post_id=?').get(post.id).cnt;
    return { ...post, reactions, userReactions, commentCount };
  });
}

router.get('/', (req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar_color as author_color
    FROM posts p JOIN users u ON u.id = p.author_id
    ORDER BY p.is_pinned DESC, p.created_at DESC
  `).all();
  res.json(enrichPosts(posts, req.user.id));
});

router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar_color as author_color
    FROM posts p JOIN users u ON u.id = p.author_id
    WHERE p.id=?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  const comments = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar_color as author_color
    FROM post_comments c JOIN users u ON u.id = c.author_id
    WHERE c.post_id=? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json({ ...enrichPosts([post], req.user.id)[0], comments });
});

router.post('/', upload.single('image'), (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Post body required' });
  const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;
  const result = db.prepare('INSERT INTO posts (author_id, body, image_url) VALUES (?, ?, ?)').run(req.user.id, body.trim(), imageUrl);
  res.json({ id: result.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (post.image_url) {
    const fp = path.join(UPLOADS_DIR, '..', '..', post.image_url);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

router.patch('/:id/pin', requireAuth(['admin', 'manager']), (req, res) => {
  const post = db.prepare('SELECT is_pinned FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE posts SET is_pinned=? WHERE id=?').run(post.is_pinned ? 0 : 1, req.params.id);
  res.json({ ok: true });
});

// Reactions
router.post('/:id/reactions', (req, res) => {
  const { reaction } = req.body;
  if (!['like', 'love', 'fire'].includes(reaction)) return res.status(400).json({ error: 'Invalid reaction' });
  const existing = db.prepare('SELECT id FROM post_reactions WHERE post_id=? AND user_id=? AND reaction=?').get(req.params.id, req.user.id, reaction);
  if (existing) {
    db.prepare('DELETE FROM post_reactions WHERE id=?').run(existing.id);
    res.json({ toggled: 'off' });
  } else {
    db.prepare('INSERT INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?)').run(req.params.id, req.user.id, reaction);
    res.json({ toggled: 'on' });
  }
});

// Comments
router.get('/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar_color as author_color
    FROM post_comments c JOIN users u ON u.id = c.author_id
    WHERE c.post_id=? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', (req, res) => {
  const { body, parent_id } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Comment body required' });
  const result = db.prepare('INSERT INTO post_comments (post_id, parent_id, author_id, body) VALUES (?, ?, ?, ?)').run(req.params.id, parent_id || null, req.user.id, body.trim());
  res.json({ id: result.lastInsertRowid });
});

router.delete('/:postId/comments/:commentId', (req, res) => {
  const comment = db.prepare('SELECT * FROM post_comments WHERE id=?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Not found' });
  if (comment.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM post_comments WHERE id=?').run(req.params.commentId);
  res.json({ ok: true });
});

module.exports = router;
