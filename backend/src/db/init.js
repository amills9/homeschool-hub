// ============================================================
// HOMESCHOOL HUB — PostgreSQL Database Module
// Replaces better-sqlite3 with pg (node-postgres).
// All queries are now async/await with a connection pool.
// ============================================================

const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs       = require('fs');
const path     = require('path');

// Connection pool — reuses connections efficiently
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'homeschool',
  user:     process.env.DB_USER     || 'homeschool',
  password: process.env.DB_PASSWORD || 'homeschool',
  max:      10,   // max pool size
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 5000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

// ── Query helper ──────────────────────────────────────────────
// Provides a consistent interface similar to better-sqlite3:
//   db.query(sql, params)  → { rows }
//   db.one(sql, params)    → single row or null
//   db.none(sql, params)   → executes, no return
const db = {
  // Execute a query and return all rows
  async query(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  },

  // Return first row or null
  async one(sql, params = []) {
    const rows = await db.query(sql, params);
    return rows[0] || null;
  },

  // Execute without caring about return value
  async none(sql, params = []) {
    await db.query(sql, params);
  },

  // Transaction helper — pass an async function that uses the client
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  pool,
};

// ── Database Initialisation ───────────────────────────────────
async function initializeDatabase() {
  console.log('Connecting to PostgreSQL...');

  // Retry logic — wait for Postgres container to be ready
  let retries = 10;
  while (retries > 0) {
    try {
      await db.query('SELECT 1');
      console.log('PostgreSQL connected');
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('Could not connect to PostgreSQL after 10 attempts:', err.message);
        process.exit(1);
      }
      console.log(`Waiting for PostgreSQL... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Run schema SQL
  // In Docker: /app/db/init.sql  |  Local dev: project root /db/init.sql
  const schemaPath = process.env.NODE_ENV === 'production'
    ? path.join('/app/db/init.sql')
    : path.join(__dirname, '../../../db/init.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.none(schema);
    console.log('Schema applied');
  }

  // Seed admin user if not exists
  const admin = await db.one("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.none(
      "INSERT INTO users (id, username, password_hash, role, status) VALUES ($1, $2, $3, 'admin', 'approved')",
      [uuidv4(), 'admin', hash]
    );
    console.log('Admin user seeded (admin / admin123) — change password immediately');
  }

  console.log('Database ready');
}

module.exports = { db, initializeDatabase };
