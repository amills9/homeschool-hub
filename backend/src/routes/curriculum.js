// ============================================================
// HOMESCHOOL HUB — Curriculum Route (PostgreSQL)
// ============================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const STATES    = ['nsw','vic','qld','sa','wa','tas','act','nt'];
const STATE_COL = { nsw:'nsw_code', vic:'vic_code', qld:'qld_code', sa:'sa_code',
                    wa:'wa_code', tas:'tas_code', act:'act_code', nt:'nt_code' };

const STAGE_MAP = {
  'Kindergarten': ['Early Stage 1','Foundation'], 'K': ['Early Stage 1','Foundation'],
  '1': ['Stage 1'], '2': ['Stage 1'], '3': ['Stage 2'], '4': ['Stage 2'],
  '5': ['Stage 3'], '6': ['Stage 3'], '7': ['Stage 4'], '8': ['Stage 4'],
  '9': ['Stage 5'], '10': ['Stage 5'], '11': ['Stage 6'], '12': ['Stage 6'],
};

const STANDARD_SUBJECTS = ['English','Mathematics','Science','HSIE','PDHPE','Creative Arts','Technology','Languages'];

// ── GET all outcomes ──────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { subject, stage, year_levels } = req.query;
    const params = [];
    let q = 'SELECT * FROM curriculum_outcomes WHERE 1=1';
    if (subject)     { params.push(subject);     q += ` AND subject = $${params.length}`; }
    if (stage)       { params.push(stage);       q += ` AND stage = $${params.length}`; }
    if (year_levels) { params.push(year_levels); q += ` AND year_levels = $${params.length}`; }
    q += ' ORDER BY subject, stage, year_levels, acara_code';
    res.json(await db.query(q, params));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── GET outcomes for a child (by year level + optional subject) ──
router.get('/for-child/:childId', authMiddleware, async (req, res) => {
  try {
    const { subject } = req.query;
    const child = await db.one('SELECT * FROM children WHERE id=$1', [req.params.childId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const stages = STAGE_MAP[child.year_level] || [];
    const params = [];
    let q = 'SELECT * FROM curriculum_outcomes WHERE 1=1';
    if (subject) { params.push(subject); q += ` AND subject = $${params.length}`; }
    if (stages.length > 0) {
      stages.forEach(s => params.push(s));
      q += ` AND stage IN (${stages.map((_, i) => `$${params.length - stages.length + i + 1}`).join(',')})`;
    }
    q += ' ORDER BY subject, acara_code';
    res.json(await db.query(q, params));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── GET /curriculum/progress/:childId ────────────────────────
// Per-subject outcome progress — used by Dashboard pie charts.
router.get('/progress/:childId', authMiddleware, async (req, res) => {
  try {
    const child = await db.one('SELECT * FROM children WHERE id=$1', [req.params.childId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const stages = STAGE_MAP[child.year_level] || [];
    const params = [];
    let q = 'SELECT id,subject,description,nsw_code,vic_code,qld_code,sa_code,wa_code,tas_code,act_code,nt_code FROM curriculum_outcomes WHERE 1=1';
    if (stages.length > 0) {
      stages.forEach(s => params.push(s));
      q += ` AND stage IN (${stages.map((_, i) => `$${i + 1}`).join(',')})`;
    }
    const allOutcomes = await db.query(q, params);

    // Outcomes achieved via completed tasks
    const achieved = await db.query(`
      SELECT DISTINCT curriculum_outcome_id
      FROM weekly_tasks
      WHERE child_id=$1 AND is_completed=1 AND curriculum_outcome_id IS NOT NULL
    `, [child.id]);
    const achievedIds = new Set(achieved.map(r => r.curriculum_outcome_id));

    const bySubject = {};
    for (const o of allOutcomes) {
      if (!bySubject[o.subject]) bySubject[o.subject] = { subject: o.subject, total: 0, achieved: 0, outcomes: [] };
      const isAchieved = achievedIds.has(o.id);
      bySubject[o.subject].total++;
      if (isAchieved) bySubject[o.subject].achieved++;
      bySubject[o.subject].outcomes.push({ ...o, achieved: isAchieved });
    }

    res.json(STANDARD_SUBJECTS.map(name => bySubject[name] || { subject: name, total: 0, achieved: 0, outcomes: [] }));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── GET meta ──────────────────────────────────────────────────
router.get('/meta', authMiddleware, async (req, res) => {
  try {
    const subjects = (await db.query('SELECT DISTINCT subject FROM curriculum_outcomes ORDER BY subject')).map(r => r.subject);
    const stages   = (await db.query('SELECT DISTINCT stage   FROM curriculum_outcomes ORDER BY stage')).map(r => r.stage);
    res.json({ subjects, stages });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── PUT single outcome ────────────────────────────────────────
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { acara_code, subject, stage, year_levels, description,
            nsw_code, vic_code, qld_code, sa_code, wa_code, tas_code, act_code, nt_code } = req.body;
    await db.none(`
      UPDATE curriculum_outcomes SET
        acara_code=$1,subject=$2,stage=$3,year_levels=$4,description=$5,
        nsw_code=$6,vic_code=$7,qld_code=$8,sa_code=$9,wa_code=$10,
        tas_code=$11,act_code=$12,nt_code=$13,updated_at=NOW()
      WHERE id=$14
    `, [acara_code, subject, stage, year_levels, description,
        nsw_code||'', vic_code||'', qld_code||'', sa_code||'', wa_code||'',
        tas_code||'', act_code||'', nt_code||'', req.params.id]);
    res.json(await db.one('SELECT * FROM curriculum_outcomes WHERE id=$1', [req.params.id]));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── DELETE single ─────────────────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  await db.none('DELETE FROM curriculum_outcomes WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ── DELETE /clear/:state ──────────────────────────────────────
router.delete('/clear/:state', adminMiddleware, async (req, res) => {
  try {
    const stateKey = req.params.state.toLowerCase();
    if (!STATES.includes(stateKey)) return res.status(400).json({ error: 'Invalid state' });
    const col    = STATE_COL[stateKey];
    const prefix = `${stateKey.toUpperCase()}-%`;
    const result = await db.query('DELETE FROM curriculum_outcomes WHERE acara_code LIKE $1 RETURNING id', [prefix]);
    await db.none(`UPDATE curriculum_outcomes SET ${col}='', updated_at=NOW() WHERE ${col} != ''`);
    res.json({ success: true, deleted: result.length });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── POST /import ──────────────────────────────────────────────
router.post('/import', adminMiddleware, async (req, res) => {
  try {
    const { state, rows } = req.body;
    const stateKey = (state || '').toLowerCase();
    if (!STATES.includes(stateKey)) return res.status(400).json({ error: `Invalid state. Must be one of: ${STATES.join(', ')}` });
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows provided' });

    const stateCol    = STATE_COL[stateKey];
    const statePrefix = stateKey.toUpperCase();
    let written = 0, skipped = 0;
    const usedCodes = new Set();

    await db.transaction(async (client) => {
      for (const r of rows) {
        const code        = (r.outcome_code || r.acara_code || '').trim();
        const subject     = (r.subject || '').trim();
        const stage       = (r.stage || '').trim();
        const yearLevels  = (r.year_levels || r.year_level || '').trim();
        const description = (r.description || '').trim();
        if (!code || !subject) { skipped++; continue; }
        const dupeKey = `${subject}|${code}`;
        if (usedCodes.has(dupeKey)) { skipped++; continue; }
        usedCodes.add(dupeKey);
        const acaraCode = `${statePrefix}-${code}`;
        await client.query(`
          INSERT INTO curriculum_outcomes (id,acara_code,subject,stage,year_levels,description,${stateCol},updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
          ON CONFLICT(acara_code) DO UPDATE SET
            subject=$3, stage=$4, year_levels=$5, description=$6, ${stateCol}=$7, updated_at=NOW()
        `, [uuidv4(), acaraCode, subject, stage||'Unknown', yearLevels||'', description, code]);
        written++;
      }
    });

    res.json({ success: true, total: written, written, skipped });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── GET export CSV ────────────────────────────────────────────
router.get('/export', adminMiddleware, async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM curriculum_outcomes ORDER BY subject, stage, year_levels, acara_code');
    const headers = ['acara_code','subject','stage','year_levels','description','nsw_code','vic_code','qld_code','sa_code','wa_code','tas_code','act_code','nt_code'];
    const esc = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="curriculum_outcomes.csv"');
    res.send(lines.join('\n'));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/sync-acara', adminMiddleware, (req, res) => {
  res.json({ success: false, message: 'ACARA sync unavailable — use CSV import.' });
});

module.exports = router;
