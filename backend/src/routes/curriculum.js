const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const STATES = ['nsw','vic','qld','sa','wa','tas','act','nt'];
const STATE_COL = {
  nsw:'nsw_code', vic:'vic_code', qld:'qld_code', sa:'sa_code',
  wa:'wa_code',   tas:'tas_code', act:'act_code', nt:'nt_code',
};

// ── GET all outcomes ──────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const { subject, stage, year_levels } = req.query;
  let q = 'SELECT * FROM curriculum_outcomes WHERE 1=1';
  const params = [];
  if (subject)     { q += ' AND subject = ?';     params.push(subject); }
  if (stage)       { q += ' AND stage = ?';       params.push(stage); }
  if (year_levels) { q += ' AND year_levels = ?'; params.push(year_levels); }
  q += ' ORDER BY subject, stage, year_levels, acara_code';
  res.json(db.prepare(q).all(...params));
});

// ── GET outcomes for a child (filtered by year level + subject) ──
router.get('/for-child/:childId', authMiddleware, (req, res) => {
  const { subject } = req.query;
  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(req.params.childId);
  if (!child) return res.status(404).json({ error: 'Child not found' });

  const stageMap = {
    'Kindergarten': ['Early Stage 1','Foundation'], 'K': ['Early Stage 1','Foundation'],
    '1': ['Stage 1'],  '2': ['Stage 1'],
    '3': ['Stage 2'],  '4': ['Stage 2'],
    '5': ['Stage 3'],  '6': ['Stage 3'],
    '7': ['Stage 4'],  '8': ['Stage 4'],
    '9': ['Stage 5'],  '10': ['Stage 5'],
    '11': ['Stage 6'], '12': ['Stage 6'],
  };
  const stages = stageMap[child.year_level] || [];

  let q = 'SELECT * FROM curriculum_outcomes WHERE 1=1';
  const params = [];
  if (subject) { q += ' AND subject = ?'; params.push(subject); }
  if (stages.length > 0) {
    q += ` AND stage IN (${stages.map(() => '?').join(',')})`;
    params.push(...stages);
  }
  q += ' ORDER BY subject, acara_code';
  res.json(db.prepare(q).all(...params));
});

// ── GET meta ──────────────────────────────────────────────────
router.get('/meta', authMiddleware, (req, res) => {
  const subjects = db.prepare('SELECT DISTINCT subject FROM curriculum_outcomes ORDER BY subject').all().map(r => r.subject);
  const stages   = db.prepare('SELECT DISTINCT stage   FROM curriculum_outcomes ORDER BY stage').all().map(r => r.stage);
  res.json({ subjects, stages });
});

// ── PUT single outcome ────────────────────────────────────────
router.put('/:id', adminMiddleware, (req, res) => {
  const { acara_code, subject, stage, year_levels, description,
          nsw_code, vic_code, qld_code, sa_code, wa_code, tas_code, act_code, nt_code } = req.body;
  db.prepare(`
    UPDATE curriculum_outcomes
    SET acara_code=?, subject=?, stage=?, year_levels=?, description=?,
        nsw_code=?, vic_code=?, qld_code=?, sa_code=?, wa_code=?, tas_code=?, act_code=?, nt_code=?,
        updated_at=datetime('now')
    WHERE id=?
  `).run(acara_code, subject, stage, year_levels, description,
    nsw_code||'', vic_code||'', qld_code||'', sa_code||'', wa_code||'',
    tas_code||'', act_code||'', nt_code||'', req.params.id);
  res.json(db.prepare('SELECT * FROM curriculum_outcomes WHERE id = ?').get(req.params.id));
});

// ── DELETE single ─────────────────────────────────────────────
router.delete('/:id', adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM curriculum_outcomes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── DELETE /clear/:state — wipe all rows for a state ─────────
router.delete('/clear/:state', adminMiddleware, (req, res) => {
  const stateKey = req.params.state.toLowerCase();
  if (!STATES.includes(stateKey)) return res.status(400).json({ error: 'Invalid state' });
  const col = STATE_COL[stateKey];
  const prefix = `${stateKey.toUpperCase()}-%`;

  // Delete rows that were created specifically for this state (acara_code starts with STATE-)
  const deleted = db.prepare(`DELETE FROM curriculum_outcomes WHERE acara_code LIKE ?`).run(prefix);
  // Clear the state code column on any remaining shared rows
  db.prepare(`UPDATE curriculum_outcomes SET ${col}='', updated_at=datetime('now') WHERE ${col} != ''`).run();

  res.json({ success: true, deleted: deleted.changes });
});

// ── POST /import ──────────────────────────────────────────────
// Body: { state: 'NSW', rows: [{ outcome_code, subject, stage, year_levels, description }] }
//
// Uses INSERT OR REPLACE so it ALWAYS writes — never silently skips.
// acara_code placeholder = "STATE-outcomecode" (e.g. "NSW-EN3-RECOM-01")
// This means re-importing the same file is always safe and idempotent.
//
router.post('/import', adminMiddleware, (req, res) => {
  const { state, rows } = req.body;
  const stateKey = (state || '').toLowerCase();
  if (!STATES.includes(stateKey)) {
    return res.status(400).json({ error: `Invalid state. Must be one of: ${STATES.join(', ')}` });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No rows provided' });
  }

  const stateCol = STATE_COL[stateKey];
  const statePrefix = stateKey.toUpperCase();

  // INSERT OR REPLACE = always upserts, never skips
  // The unique acara_code index ensures duplicates update in place
  const upsert = db.prepare(`
    INSERT INTO curriculum_outcomes
      (id, acara_code, subject, stage, year_levels, description, ${stateCol}, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(acara_code) DO UPDATE SET
      subject      = excluded.subject,
      stage        = excluded.stage,
      year_levels  = excluded.year_levels,
      description  = excluded.description,
      ${stateCol}  = excluded.${stateCol},
      updated_at   = datetime('now')
  `);

  const importMany = db.transaction((rows) => {
    let written = 0, skipped = 0;
    const usedCodes = new Set(); // guard against duplicates within the CSV itself

    for (const r of rows) {
      const code        = (r.outcome_code || r.acara_code || '').trim();
      const subject     = (r.subject || '').trim();
      const stage       = (r.stage || '').trim();
      const yearLevels  = (r.year_levels || r.year_level || '').trim();
      const description = (r.description || '').trim();

      if (!code || !subject) { skipped++; continue; }

      // Skip intra-CSV duplicates
      const dupeKey = `${subject}|${code}`;
      if (usedCodes.has(dupeKey)) { skipped++; continue; }
      usedCodes.add(dupeKey);

      // Unique acara_code placeholder: "NSW-EN3-RECOM-01"
      const acaraCode = `${statePrefix}-${code}`;

      upsert.run(uuidv4(), acaraCode, subject, stage || 'Unknown', yearLevels || '', description, code);
      written++;
    }
    return { written, skipped };
  });

  const result = importMany(rows);
  res.json({
    success: true,
    total: result.written,
    written: result.written,
    skipped: result.skipped,
  });
});

// ── GET export CSV ────────────────────────────────────────────
router.get('/export', adminMiddleware, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM curriculum_outcomes ORDER BY subject, stage, year_levels, acara_code'
  ).all();
  const headers = [
    'acara_code','subject','stage','year_levels','description',
    'nsw_code','vic_code','qld_code','sa_code','wa_code','tas_code','act_code','nt_code',
  ];
  function esc(v) {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  }
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="curriculum_outcomes.csv"');
  res.send(lines.join('\n'));
});

router.post('/sync-acara', adminMiddleware, (req, res) => {
  res.json({ success: false, message: 'ACARA sync unavailable — use CSV import.' });
});

module.exports = router;
