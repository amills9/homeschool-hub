const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/homeschool.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'parent',
      status TEXT DEFAULT 'pending',
      email TEXT,
      num_children INTEGER,
      homeschool_stage TEXT,
      newsletter_opt_in INTEGER DEFAULT 0,
      state TEXT DEFAULT 'NSW',
      reset_token TEXT,
      reset_token_expires TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      year_level TEXT,
      avatar_color TEXT DEFAULT '#2D6A4F',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6C63FF',
      icon TEXT DEFAULT '📚',
      target_hours_per_week REAL DEFAULT 0,
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
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS task_photos (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      public_id TEXT NOT NULL,
      caption TEXT DEFAULT '',
      share_opt_in INTEGER DEFAULT 0,
      uploaded_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES weekly_tasks(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      theme_color TEXT,
      bg_color TEXT,
      accent_color TEXT,
      sidebar_color TEXT,
      font_style TEXT,
      display_name TEXT
    );

    CREATE TABLE IF NOT EXISTS curriculum_outcomes (
      id TEXT PRIMARY KEY,
      acara_code TEXT NOT NULL,
      subject TEXT NOT NULL,
      stage TEXT NOT NULL,
      year_levels TEXT NOT NULL,
      description TEXT NOT NULL,
      nsw_code TEXT DEFAULT '',
      vic_code TEXT DEFAULT '',
      qld_code TEXT DEFAULT '',
      sa_code  TEXT DEFAULT '',
      wa_code  TEXT DEFAULT '',
      tas_code TEXT DEFAULT '',
      act_code TEXT DEFAULT '',
      nt_code  TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_acara_code ON curriculum_outcomes(acara_code);
  `);

  // ── Migrations for existing databases ────────────────────────────────────
  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!userCols.includes('state')) db.exec("ALTER TABLE users ADD COLUMN state TEXT DEFAULT 'NSW'");

  const taskCols = db.prepare('PRAGMA table_info(weekly_tasks)').all().map(c => c.name);
  if (!taskCols.includes('resource_id')) db.exec('ALTER TABLE weekly_tasks ADD COLUMN resource_id TEXT');

  // ── Seed admin ────────────────────────────────────────────────────────────
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), 'admin', hash, 'admin', 'approved'
    );
    console.log('✅ Admin user seeded');
  }
}

module.exports = { db, initializeDatabase };
