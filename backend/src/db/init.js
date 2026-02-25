const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/homeschool.db');

// Ensure data directory exists
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year_level TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#6C63FF',
      created_at TEXT DEFAULT (datetime('now'))
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
  `);

  // Seed admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
      uuidv4(), 'admin', hash, 'admin'
    );
    const parentHash = bcrypt.hashSync('parent123', 10);
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
      uuidv4(), 'parent', parentHash, 'parent'
    );
    console.log('✅ Default users created: admin/admin123, parent/parent123');
  }

  // Default settings
  const settingsDefaults = [
    ['school_name', 'Our Homeschool'],
    ['school_days', '["Monday","Tuesday","Wednesday","Thursday","Friday"]'],
    ['theme_color', '#6C63FF'],
  ];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)');
  settingsDefaults.forEach(([k, v]) => insertSetting.run(k, v));

  console.log('✅ Database initialized');
}

module.exports = { db, initializeDatabase };
