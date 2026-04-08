#!/usr/bin/env node
// ============================================================
// HOMESCHOOL HUB — SQLite → PostgreSQL Migration Script
// Run this ONCE to migrate your existing data.
//
// Usage:
//   node migrate-sqlite-to-postgres.js
//
// Requirements:
//   npm install better-sqlite3 pg
//
// Set these environment variables first (PowerShell):
//   $env:SQLITE_PATH="D:\path\to\homeschool.db"
//   $env:DB_HOST="localhost"
//   $env:DB_PORT="5432"
//   $env:DB_NAME="homeschool"
//   $env:DB_USER="homeschool"
//   $env:DB_PASSWORD="your_password_from_.env"
// ============================================================

const Database = require('better-sqlite3');
const { Pool }  = require('pg');

const SQLITE_PATH = process.env.SQLITE_PATH || './data/homeschool.db';

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'homeschool',
  user:     process.env.DB_USER     || 'homeschool',
  password: process.env.DB_PASSWORD || 'homeschool',
});

const TABLES = [
  'users',
  'children',
  'subjects',
  'weekly_tasks',
  'learning_outcomes',
  'resources',
  'app_settings',
  'user_preferences',
  'task_photos',
  'curriculum_outcomes',
];

// Default values for columns that exist in Postgres but may be absent in old SQLite rows
const COL_DEFAULTS = {
  weekly_tasks:     { sort_order: 0, curriculum_outcome_id: null, resource_id: null },
  resources:        { user_id: null, cloudinary_public_id: null },
  user_preferences: { school_name: '' },
  users:            { state: 'NSW' },
};

// Full schema — embedded so the script is self-contained
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'parent', status TEXT DEFAULT 'pending', email TEXT,
    num_children INTEGER, homeschool_stage TEXT, newsletter_opt_in INTEGER DEFAULT 0,
    state TEXT DEFAULT 'NSW', reset_token TEXT, reset_token_expires TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, year_level TEXT, avatar_color TEXT DEFAULT '#2D6A4F',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    name TEXT NOT NULL, color TEXT DEFAULT '#6C63FF', icon TEXT DEFAULT '📚',
    target_hours_per_week REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS weekly_tasks (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    resource_id TEXT, curriculum_outcome_id TEXT,
    title TEXT NOT NULL, description TEXT,
    day_of_week TEXT NOT NULL, week_start TEXT NOT NULL,
    is_recurring INTEGER DEFAULT 0, is_completed INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 60, sort_order INTEGER DEFAULT 0,
    resources TEXT DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS learning_outcomes (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL, description TEXT, achieved INTEGER DEFAULT 0,
    achieved_date TEXT, target_date TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    user_id TEXT, title TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'link',
    url TEXT, notes TEXT, cloudinary_public_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY, theme_color TEXT, bg_color TEXT,
    accent_color TEXT, sidebar_color TEXT, font_style TEXT,
    display_name TEXT, school_name TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS task_photos (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES weekly_tasks(id) ON DELETE CASCADE,
    url TEXT NOT NULL, thumbnail_url TEXT NOT NULL, public_id TEXT NOT NULL,
    caption TEXT DEFAULT '', uploaded_by TEXT NOT NULL,
    share_opt_in INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS curriculum_outcomes (
    id TEXT PRIMARY KEY, acara_code TEXT NOT NULL, subject TEXT NOT NULL,
    stage TEXT NOT NULL, year_levels TEXT NOT NULL, description TEXT NOT NULL,
    nsw_code TEXT DEFAULT '', vic_code TEXT DEFAULT '', qld_code TEXT DEFAULT '',
    sa_code TEXT DEFAULT '', wa_code TEXT DEFAULT '', tas_code TEXT DEFAULT '',
    act_code TEXT DEFAULT '', nt_code TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_acara_code ON curriculum_outcomes(acara_code);
`;

async function migrate() {
  console.log('Opening SQLite database:', SQLITE_PATH);
  let sqlite;
  try {
    sqlite = new Database(SQLITE_PATH, { readonly: true });
  } catch (err) {
    console.error('Could not open SQLite file:', err.message);
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log('Connected to PostgreSQL');

    // ── Step 1: Create all tables ─────────────────────────────
    console.log('Creating schema...');
    await client.query(SCHEMA);
    console.log('Schema ready\n');

    // ── Step 2: Migrate each table ────────────────────────────
    for (const table of TABLES) {
      process.stdout.write(`Migrating ${table}... `);

      let rows;
      try {
        rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      } catch {
        console.log('SKIP (not in SQLite)');
        continue;
      }

      if (rows.length === 0) { console.log('empty'); continue; }

      const defaults = COL_DEFAULTS[table] || {};
      let inserted = 0, skipped = 0, firstError = null;

      await client.query('BEGIN');
      try {
        for (const row of rows) {
          // Merge row with any missing column defaults
          const data = { ...defaults, ...row };
          const cols = Object.keys(data).filter(k => data[k] !== undefined);
          const vals = cols.map(k => data[k]);
          const ph   = cols.map((_, i) => `$${i + 1}`).join(', ');

          try {
            await client.query(
              `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph}) ON CONFLICT DO NOTHING`,
              vals
            );
            inserted++;
          } catch (err) {
            if (!firstError) firstError = err.message.split('\n')[0];
            skipped++;
          }
        }
        await client.query('COMMIT');

        if (inserted > 0 || skipped === 0) {
          console.log(`${inserted} rows${skipped > 0 ? `, ${skipped} skipped` : ''}`);
        } else {
          console.log(`0 rows inserted, ${skipped} failed`);
          if (firstError) console.log(`  First error: ${firstError}`);
        }
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`ROLLBACK — ${err.message}`);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('\nNext steps:');
    console.log('  1. docker compose up -d --build');
    console.log('  2. Open http://localhost in your browser');
    console.log('  3. Log in with your existing accounts');

  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
