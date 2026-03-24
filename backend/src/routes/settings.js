const express = require('express');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET settings — global app_settings merged with user's own school_name
router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM app_settings').all();
  const settings = {};
  rows.forEach(r => {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  });

  // Override school_name with user's own preference if set
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
  if (prefs && prefs.school_name) {
    settings.school_name = prefs.school_name;
  }

  res.json(settings);
});

// PUT settings — school_name saved per-user, everything else global
router.put('/', authMiddleware, (req, res) => {
  const { school_name, ...rest } = req.body;

  // Save school_name to user_preferences (per-user)
  if (school_name !== undefined) {
    db.prepare(`
      INSERT INTO user_preferences (user_id, school_name)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET school_name = excluded.school_name
    `).run(req.user.id, school_name);
  }

  // Save any other keys globally
  if (Object.keys(rest).length > 0) {
    const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    const upsertMany = db.transaction((s) => {
      for (const [key, value] of Object.entries(s)) {
        upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    });
    upsertMany(rest);
  }

  res.json({ success: true });
});

module.exports = router;
