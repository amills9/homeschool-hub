const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const STATES = ['nsw','vic','qld','sa','wa','tas','act','nt'];
const STATE_COL = { nsw:'nsw_code', vic:'vic_code', qld:'qld_code', sa:'sa_code', wa:'wa_code', tas:'tas_code', act:'act_code', nt:'nt_code' };

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

// ── GET outcomes for a child filtered by year level + subject ──
router.get('/for-child/:childId', authMiddleware, (req, res) => {
  const { subject } = req.query;
  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(req.params.childId);
  if (!child) return res.status(404).json({ error: 'Child not found' });

  const stageMap = {
    'Kindergarten': ['Early Stage 1','Foundation'], 'K': ['Early Stage 1','Foundation'],
    '1': ['Stage 1'], '2': ['Stage 1'],
    '3': ['Stage 2'], '4': ['Stage 2'],
    '5': ['Stage 3'], '6': ['Stage 3'],
    '7': ['Stage 4'], '8': ['Stage 4'],
    '9': ['Stage 5'], '10': ['Stage 5'],
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
  const stages   = db.prepare('SELECT DISTINCT stage FROM curriculum_outcomes ORDER BY stage').all().map(r => r.stage);
  res.json({ subjects, stages });
});

// ── PUT single outcome ────────────────────────────────────────
router.put('/:id', adminMiddleware, (req, res) => {
  const { acara_code, subject, stage, year_levels, description, nsw_code, vic_code, qld_code, sa_code, wa_code, tas_code, act_code, nt_code } = req.body;
  db.prepare(`UPDATE curriculum_outcomes SET acara_code=?,subject=?,stage=?,year_levels=?,description=?,nsw_code=?,vic_code=?,qld_code=?,sa_code=?,wa_code=?,tas_code=?,act_code=?,nt_code=?,updated_at=datetime('now') WHERE id=?`)
    .run(acara_code,subject,stage,year_levels,description,nsw_code||'',vic_code||'',qld_code||'',sa_code||'',wa_code||'',tas_code||'',act_code||'',nt_code||'',req.params.id);
  res.json(db.prepare('SELECT * FROM curriculum_outcomes WHERE id = ?').get(req.params.id));
});

// ── DELETE single ─────────────────────────────────────────────
router.delete('/:id', adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM curriculum_outcomes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── POST /import — fixed state-aware CSV import ───────────────
// CSV columns: subject, outcome_code, stage, year_levels, description
// The outcome_code is the state-specific code (e.g. EN3-RECOM-01 for NSW)
// We use outcome_code as the unique identifier — no duplicates allowed per state
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

  // Check if this exact state code already exists
  const findByStateCode = db.prepare(`SELECT id FROM curriculum_outcomes WHERE ${stateCol} = ? LIMIT 1`);

  // Insert a new row — acara_code uses "STATE-outcomecode" as unique placeholder
  // We use INSERT OR IGNORE on acara_code, so if there's a conflict we retry with uuid
  const insert = db.prepare(`
    INSERT OR IGNORE INTO curriculum_outcomes
      (id, acara_code, subject, stage, year_levels, description, ${stateCol}, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // Update description and state code on existing row (when re-importing)
  const update = db.prepare(`
    UPDATE curriculum_outcomes
    SET ${stateCol}=?, description=CASE WHEN description='' THEN ? ELSE description END, updated_at=datetime('now')
    WHERE id=?
  `);

  const importMany = db.transaction((rows) => {
    let inserted = 0, updated = 0, skipped = 0;

    for (const r of rows) {
      const code        = (r.outcome_code || r.acara_code || '').trim();
      const subject     = (r.subject || '').trim();
      const stage       = (r.stage || '').trim();
      const yearLevels  = (r.year_levels || r.year_level || '').trim();
      const description = (r.description || '').trim();

      if (!code || !subject) { skipped++; continue; }

      // Already imported this exact code? Update description if blank, else skip
      const existing = findByStateCode.get(code);
      if (existing) {
        update.run(code, description, existing.id);
        updated++;
        continue;
      }

      // New outcome — insert with unique acara_code placeholder
      // Format: "NSW-EN3-RECOM-01" — guaranteed unique per state
      const acaraCode = `${stateKey.toUpperCase()}-${code}`;
      const result = insert.run(uuidv4(), acaraCode, subject, stage||'Unknown', yearLevels||'', description, code);

      if (result.changes > 0) {
        inserted++;
      } else {
        // Conflict on acara_code (same code imported for different state) — add uuid suffix
        const result2 = insert.run(uuidv4(), `${acaraCode}-${uuidv4().slice(0,8)}`, subject, stage||'Unknown', yearLevels||'', description, code);
        if (result2.changes > 0) inserted++;
        else skipped++;
      }
    }
    return { inserted, updated, skipped };
  });

  const result = importMany(rows);
  res.json({ success: true, total: result.inserted + result.updated, inserted: result.inserted, updated: result.updated, skipped: result.skipped });
});

// ── DELETE /clear/:state — wipe a state's codes for re-import ─
router.delete('/clear/:state', adminMiddleware, (req, res) => {
  const stateKey = req.params.state.toLowerCase();
  if (!STATES.includes(stateKey)) return res.status(400).json({ error: 'Invalid state' });
  const col = STATE_COL[stateKey];
  // Delete rows that only belong to this state (acara_code starts with STATE-)
  db.prepare(`DELETE FROM curriculum_outcomes WHERE acara_code LIKE ? AND ${col} != ''`).run(`${stateKey.toUpperCase()}-%`);
  // Clear the code on rows shared with other states
  db.prepare(`UPDATE curriculum_outcomes SET ${col}='', updated_at=datetime('now') WHERE ${col} != '' AND acara_code NOT LIKE ?`).run(`${stateKey.toUpperCase()}-%`);
  res.json({ success: true });
});

// ── GET export CSV ────────────────────────────────────────────
router.get('/export', adminMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM curriculum_outcomes ORDER BY subject, stage, year_levels, acara_code').all();
  const headers = ['acara_code','subject','stage','year_levels','description','nsw_code','vic_code','qld_code','sa_code','wa_code','tas_code','act_code','nt_code'];
  function esc(v) { const s=String(v??''); return s.includes(',')||s.includes('"')||s.includes('\n')?`"${s.replace(/"/g,'""')}"`:`${s}`; }
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))];
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="curriculum_outcomes.csv"');
  res.send(lines.join('\n'));
});

router.post('/sync-acara', adminMiddleware, (req, res) => {
  res.json({ success: false, message: 'ACARA sync unavailable — use CSV import.' });
});

module.exports = router;
