-- ============================================================
-- HOMESCHOOL HUB — PostgreSQL Schema
-- v3.1.0
-- All migrations from SQLite already incorporated here.
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  username            TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  role                TEXT DEFAULT 'parent',
  status              TEXT DEFAULT 'pending',
  email               TEXT,
  num_children        INTEGER,
  homeschool_stage    TEXT,
  newsletter_opt_in   INTEGER DEFAULT 0,
  state               TEXT DEFAULT 'NSW',
  reset_token         TEXT,
  reset_token_expires TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Children
CREATE TABLE IF NOT EXISTS children (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  year_level   TEXT,
  avatar_color TEXT DEFAULT '#2D6A4F',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id                    TEXT PRIMARY KEY,
  child_id              TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  color                 TEXT DEFAULT '#6C63FF',
  icon                  TEXT DEFAULT '📚',
  target_hours_per_week REAL DEFAULT 0
);

-- Weekly Tasks
CREATE TABLE IF NOT EXISTS weekly_tasks (
  id                   TEXT PRIMARY KEY,
  child_id             TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject_id           TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  resource_id          TEXT,
  curriculum_outcome_id TEXT,
  title                TEXT NOT NULL,
  description          TEXT,
  day_of_week          TEXT NOT NULL,
  week_start           TEXT NOT NULL,
  is_recurring         INTEGER DEFAULT 0,
  is_completed         INTEGER DEFAULT 0,
  duration_minutes     INTEGER DEFAULT 60,
  sort_order           INTEGER DEFAULT 0,
  resources            TEXT DEFAULT '[]',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Outcomes (manual, per-child)
CREATE TABLE IF NOT EXISTS learning_outcomes (
  id            TEXT PRIMARY KEY,
  child_id      TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject_id    TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  achieved      INTEGER DEFAULT 0,
  achieved_date TEXT,
  target_date   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
  id                   TEXT PRIMARY KEY,
  child_id             TEXT REFERENCES children(id) ON DELETE CASCADE,
  subject_id           TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  user_id              TEXT,
  title                TEXT NOT NULL,
  type                 TEXT NOT NULL DEFAULT 'link',
  url                  TEXT,
  notes                TEXT,
  cloudinary_public_id TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- App Settings (global key-value)
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id      TEXT PRIMARY KEY,
  theme_color  TEXT,
  bg_color     TEXT,
  accent_color TEXT,
  sidebar_color TEXT,
  font_style   TEXT,
  display_name TEXT,
  school_name  TEXT DEFAULT ''
);

-- Task Photos
CREATE TABLE IF NOT EXISTS task_photos (
  id            TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES weekly_tasks(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  public_id     TEXT NOT NULL,
  caption       TEXT DEFAULT '',
  uploaded_by   TEXT NOT NULL,
  share_opt_in  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Curriculum Outcomes (DoE/ACARA)
CREATE TABLE IF NOT EXISTS curriculum_outcomes (
  id          TEXT PRIMARY KEY,
  acara_code  TEXT NOT NULL,
  subject     TEXT NOT NULL,
  stage       TEXT NOT NULL,
  year_levels TEXT NOT NULL,
  description TEXT NOT NULL,
  nsw_code    TEXT DEFAULT '',
  vic_code    TEXT DEFAULT '',
  qld_code    TEXT DEFAULT '',
  sa_code     TEXT DEFAULT '',
  wa_code     TEXT DEFAULT '',
  tas_code    TEXT DEFAULT '',
  act_code    TEXT DEFAULT '',
  nt_code     TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_acara_code ON curriculum_outcomes(acara_code);
