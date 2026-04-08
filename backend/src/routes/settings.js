// ============================================================
// HOMESCHOOL HUB — Settings Route (PostgreSQL)
// school_name is per-user in user_preferences.
// Everything else lives in app_settings (global).
// ============================================================
const express = require('express');
const { db }  = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM app_settings');
    const settings = {};
    for (const r of rows) {
      try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
    }
    // Override school_name with user's own value
    const prefs = await db.one('SELECT school_name FROM user_preferences WHERE user_id=$1', [req.user.id]);
    if (prefs?.school_name) settings.school_name = prefs.school_name;
    res.json(settings);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { school_name, ...rest } = req.body;

    // school_name is per-user
    if (school_name !== undefined) {
      await db.none(`
        INSERT INTO user_preferences (user_id, school_name)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET school_name = EXCLUDED.school_name
      `, [req.user.id, school_name]);
    }

    // Everything else is global
    for (const [key, value] of Object.entries(rest)) {
      await db.none(`
        INSERT INTO app_settings (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [key, typeof value === 'string' ? value : JSON.stringify(value)]);
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
