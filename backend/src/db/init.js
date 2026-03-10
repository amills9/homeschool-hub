const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/homeschool.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

function initializeDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'parent',
      status TEXT NOT NULL DEFAULT 'approved',
      email TEXT,
      num_children INTEGER DEFAULT 0,
      homeschool_stage TEXT DEFAULT '',
      newsletter_opt_in INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_token_expires TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      year_level TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#6C63FF',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6C63FF',
      icon TEXT DEFAULT '📚',
      target_hours_per_week REAL DEFAULT 5,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weekly_tasks (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      subject_id TEXT,
      resource_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      day_of_week TEXT NOT NULL,
      week_start TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      duration_minutes INTEGER DEFAULT 60,
      resources TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS learning_outcomes (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      subject_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      achieved INTEGER DEFAULT 0,
      achieved_date TEXT,
      target_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      child_id TEXT,
      subject_id TEXT,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'link',
      url TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      text TEXT NOT NULL,
      is_done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      theme_color TEXT DEFAULT '#2D6A4F',
      bg_color TEXT DEFAULT '#F7F5F0',
      accent_color TEXT DEFAULT '#F4A261',
      sidebar_color TEXT DEFAULT '#FFFFFF',
      font_style TEXT DEFAULT 'default',
      display_name TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ── Migrations ─────────────────────────────────────────
  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  const addUserCol = (col, def) => {
    if (!userCols.includes(col)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      console.log(`✅ Migrated users: added ${col}`);
    }
  };
  addUserCol('status', "TEXT NOT NULL DEFAULT 'approved'");
  addUserCol('email', 'TEXT');
  addUserCol('num_children', 'INTEGER DEFAULT 0');
  addUserCol('homeschool_stage', "TEXT DEFAULT ''");
  addUserCol('newsletter_opt_in', 'INTEGER DEFAULT 0');
  addUserCol('reset_token', 'TEXT');
  addUserCol('reset_token_expires', 'TEXT');

  const childCols = db.prepare('PRAGMA table_info(children)').all().map(c => c.name);
  if (!childCols.includes('user_id')) {
    db.exec('ALTER TABLE children ADD COLUMN user_id TEXT');
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (admin) db.prepare('UPDATE children SET user_id = ? WHERE user_id IS NULL').run(admin.id);
    console.log('✅ Migrated children: added user_id');
  }

  const taskCols = db.prepare('PRAGMA table_info(weekly_tasks)').all().map(c => c.name);
  if (!taskCols.includes('resource_id')) {
    db.exec('ALTER TABLE weekly_tasks ADD COLUMN resource_id TEXT');
    console.log('✅ Migrated weekly_tasks: added resource_id');
  }

  // todos table created by CREATE TABLE IF NOT EXISTS above — no further migration needed

  // ── Seed admin ─────────────────────────────────────────
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('admin123', 10);
    const adminId = uuidv4();
    db.prepare("INSERT INTO users (id, username, password_hash, role, status) VALUES (?, ?, ?, 'admin', 'approved')").run(adminId, 'admin', hash);
    db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(adminId);
    console.log('✅ Default admin created');
  }

  db.prepare(`
    SELECT u.id FROM users u LEFT JOIN user_preferences p ON u.id = p.user_id WHERE p.user_id IS NULL
  `).all().forEach(u => db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(u.id));

  [
    ['school_name', 'Our Homeschool'],
    ['school_days', '["Monday","Tuesday","Wednesday","Thursday","Friday"]'],
  ].forEach(([k, v]) => db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(k, v));

  console.log('✅ Database initialized');
}

module.exports = { db, initializeDatabase };
