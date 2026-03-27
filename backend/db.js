const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/app/data/hub.db'
  : path.join(__dirname, '..', 'data', 'hub.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Remove stale lock on Windows restart
const LOCK_PATH = DB_PATH + '.lock';
if (fs.existsSync(LOCK_PATH)) fs.rmSync(LOCK_PATH, { recursive: true, force: true });

const db = new Database(DB_PATH);
db.exec('PRAGMA foreign_keys=ON');

// Compatibility wrapper: node-sqlite3-wasm needs array params
const _prepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const stmt = _prepare(sql);
  const wrap = (fn) => (...args) => {
    const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
    return fn(params);
  };
  stmt.run  = wrap(stmt.run.bind(stmt));
  stmt.get  = wrap(stmt.get.bind(stmt));
  stmt.all  = wrap(stmt.all.bind(stmt));
  return stmt;
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'staff',
    department    TEXT DEFAULT '',
    avatar_color  TEXT DEFAULT '#3AB5D9',
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_tiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    url         TEXT NOT NULL,
    icon        TEXT NOT NULL DEFAULT '🔗',
    color       TEXT NOT NULL DEFAULT '#3AB5D9',
    order_idx   INTEGER DEFAULT 0,
    created_by  INTEGER REFERENCES users(id),
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id  INTEGER NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    image_url  TEXT,
    is_pinned  INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS post_reactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    reaction   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id, reaction)
  );

  CREATE TABLE IF NOT EXISTS post_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_id  INTEGER REFERENCES post_comments(id) ON DELETE CASCADE,
    author_id  INTEGER NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id  INTEGER NOT NULL REFERENCES users(id),
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    is_active  INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcement_dismissals (
    announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (announcement_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS resources (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    category      TEXT NOT NULL DEFAULT 'General',
    name          TEXT NOT NULL,
    description   TEXT DEFAULT '',
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type     TEXT DEFAULT '',
    file_size     INTEGER DEFAULT 0,
    uploaded_by   INTEGER NOT NULL REFERENCES users(id),
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id   INTEGER NOT NULL REFERENCES users(id),
    body         TEXT NOT NULL,
    is_read      INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_date  TEXT NOT NULL,
    end_date    TEXT,
    start_time  TEXT,
    end_time    TEXT,
    event_type  TEXT DEFAULT 'general',
    color       TEXT DEFAULT '#3AB5D9',
    created_by  INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
