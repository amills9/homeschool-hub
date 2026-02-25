const express = require('express');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM app_settings').all();
  const settings = {};
  rows.forEach(r => {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  });
  res.json(settings);
});

router.put('/', adminMiddleware, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
  const upsertMany = db.transaction((settings) => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  });
  upsertMany(req.body);
  res.json({ success: true });
});

module.exports = router;
