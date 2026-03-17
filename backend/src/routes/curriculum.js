const express = require('express');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const STATES = ['nsw','vic','qld','sa','wa','tas','act','nt'];

// ── GET all outcomes (any logged-in user, for task dropdowns) ──────────────
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

// ── GET distinct subjects and stages (for dropdowns) ─────────────────────
router.get('/meta', authMiddleware, (req, res) => {
  const subjects = db.prepare('SELECT DISTINCT subject FROM curriculum_outcomes ORDER BY subject').all().map(r => r.subject);
  const stages   = db.prepare('SELECT DISTINCT stage FROM curriculum_outcomes ORDER BY stage').all().map(r => r.stage);
  res.json({ subjects, stages });
});

// ── PUT single outcome (admin — inline edit) ──────────────────────────────
router.put('/:id', adminMiddleware, (req, res) => {
  const { acara_code, subject, stage, year_levels, description, nsw_code, vic_code, qld_code, sa_code, wa_code, tas_code, act_code, nt_code } = req.body;
  db.prepare(`
    UPDATE curriculum_outcomes
    SET acara_code=?, subject=?, stage=?, year_levels=?, description=?,
        nsw_code=?, vic_code=?, qld_code=?, sa_code=?, wa_code=?, tas_code=?, act_code=?, nt_code=?,
        updated_at=datetime('now')
    WHERE id=?
  `).run(acara_code, subject, stage, year_levels, description,
         nsw_code||'', vic_code||'', qld_code||'', sa_code||'', wa_code||'', tas_code||'', act_code||'', nt_code||'',
         req.params.id);
  res.json(db.prepare('SELECT * FROM curriculum_outcomes WHERE id = ?').get(req.params.id));
});

// ── DELETE single outcome (admin) ─────────────────────────────────────────
router.delete('/:id', adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM curriculum_outcomes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── POST import CSV (admin) ───────────────────────────────────────────────
router.post('/import', adminMiddleware, (req, res) => {
  const { rows } = req.body; // array of objects matching CSV columns
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows provided' });

  const upsert = db.prepare(`
    INSERT INTO curriculum_outcomes (id, acara_code, subject, stage, year_levels, description, nsw_code, vic_code, qld_code, sa_code, wa_code, tas_code, act_code, nt_code, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(acara_code) DO UPDATE SET
      subject=excluded.subject, stage=excluded.stage, year_levels=excluded.year_levels,
      description=excluded.description, nsw_code=excluded.nsw_code, vic_code=excluded.vic_code,
      qld_code=excluded.qld_code, sa_code=excluded.sa_code, wa_code=excluded.wa_code,
      tas_code=excluded.tas_code, act_code=excluded.act_code, nt_code=excluded.nt_code,
      updated_at=datetime('now')
  `);

  const importMany = db.transaction((rows) => {
    let imported = 0;
    for (const r of rows) {
      if (!r.acara_code || !r.subject || !r.stage || !r.year_levels || !r.description) continue;
      upsert.run(
        uuidv4(), r.acara_code.trim(), r.subject.trim(), r.stage.trim(), r.year_levels.trim(),
        r.description.trim(), r.nsw_code||'', r.vic_code||'', r.qld_code||'',
        r.sa_code||'', r.wa_code||'', r.tas_code||'', r.act_code||'', r.nt_code||''
      );
      imported++;
    }
    return imported;
  });

  const count = importMany(rows);
  res.json({ success: true, imported: count });
});

// ── GET export CSV (admin) ────────────────────────────────────────────────
router.get('/export', adminMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM curriculum_outcomes ORDER BY subject, stage, year_levels, acara_code').all();
  const headers = ['acara_code','subject','stage','year_levels','description','nsw_code','vic_code','qld_code','sa_code','wa_code','tas_code','act_code','nt_code'];

  function csvEscape(val) {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => csvEscape(r[h])).join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="curriculum_outcomes.csv"');
  res.send(lines.join('\n'));
});

// ── POST sync from ACARA (admin) ──────────────────────────────────────────
router.post('/sync-acara', adminMiddleware, (req, res) => {
  // Subject document IDs from ACARA RDF site
  const ACARA_SUBJECTS = [
    { name: 'English',     id: '7f6bd186-fcdf-4e46-a727-9e4600a2a39b' },
    { name: 'Mathematics', id: '4e0d84fb-9095-4db6-a031-9e4600a2533d' },
  ];

  const SPARQL_BASE = 'https://rdf.australiancurriculum.edu.au/api/sparql';

  function sparqlQuery(subjectId) {
    return new Promise((resolve, reject) => {
      const query = `
        PREFIX asn: <http://purl.org/ASN/schema/core/>
        PREFIX dc:  <http://purl.org/dc/elements/1.1/>
        PREFIX dct: <http://purl.org/dc/terms/>
        SELECT ?notation ?description ?educationLevel
        WHERE {
          ?s dct:isPartOf <http://rdf.australiancurriculum.edu.au/elements/2018/05/${subjectId}> ;
             asn:statementNotation ?notation ;
             dc:description ?description .
          OPTIONAL { ?s asn:educationLevel ?educationLevel . }
        }
        LIMIT 500
      `;
      const url = `${SPARQL_BASE}?q=${encodeURIComponent(query.trim())}`;
      https.get(url, { headers: { 'User-Agent': 'HomeschoolHub/1.0' } }, (r) => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  function parseXml(xml) {
    const results = [];
    const blocks = xml.match(/<r>([\s\S]*?)<\/result>/g) || [];
    for (const block of blocks) {
      const row = {};
      const bindings = block.match(/<binding name="([^"]+)">([\s\S]*?)<\/binding>/g) || [];
      for (const b of bindings) {
        const name = b.match(/name="([^"]+)"/)?.[1];
        const uri  = b.match(/<uri>([^<]+)<\/uri>/)?.[1];
        const lit  = b.match(/<literal[^>]*>([^<]*)<\/literal>/)?.[1];
        if (name) row[name] = (uri || lit || '').trim();
      }
      if (row.notation && row.description) results.push(row);
    }
    return results;
  }

  // Derive stage/year_levels from ACARA code notation
  // e.g. AC9E5LY01 → Year 5 English
  function deriveStageYear(code) {
    const m = code.match(/AC9[A-Z]+(\d+)/);
    if (!m) return { stage: 'Unknown', year_levels: 'Unknown' };
    const yr = parseInt(m[1]);
    const yearMap = {
      0: { stage: 'Foundation', year_levels: 'F' },
      1: { stage: 'Stage 1',    year_levels: '1-2' },
      2: { stage: 'Stage 1',    year_levels: '1-2' },
      3: { stage: 'Stage 2',    year_levels: '3-4' },
      4: { stage: 'Stage 2',    year_levels: '3-4' },
      5: { stage: 'Stage 3',    year_levels: '5-6' },
      6: { stage: 'Stage 3',    year_levels: '5-6' },
      7: { stage: 'Stage 4',    year_levels: '7-8' },
      8: { stage: 'Stage 4',    year_levels: '7-8' },
      9: { stage: 'Stage 5',    year_levels: '9-10' },
      10:{ stage: 'Stage 5',    year_levels: '9-10' },
    };
    return yearMap[yr] || { stage: 'Unknown', year_levels: String(yr) };
  }

  // Run sync asynchronously, respond immediately
  res.json({ success: true, message: 'ACARA sync started — refresh in 30 seconds' });

  (async () => {
    try {
      const upsert = db.prepare(`
        INSERT INTO curriculum_outcomes (id, acara_code, subject, stage, year_levels, description, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(acara_code) DO UPDATE SET
          description=excluded.description, stage=excluded.stage, year_levels=excluded.year_levels,
          updated_at=datetime('now')
      `);
      const upsertMany = db.transaction((items) => {
        for (const item of items) upsert.run(uuidv4(), item.code, item.subject, item.stage, item.year_levels, item.description);
      });

      let total = 0;
      for (const subj of ACARA_SUBJECTS) {
        const xml = await sparqlQuery(subj.id);
        const rows = parseXml(xml);
        const items = rows.map(r => ({
          code: r.notation,
          subject: subj.name,
          description: r.description,
          ...deriveStageYear(r.notation),
        }));
        upsertMany(items);
        total += items.length;
        console.log(`ACARA sync: ${subj.name} — ${items.length} outcomes`);
      }
      console.log(`ACARA sync complete: ${total} total outcomes`);
    } catch (err) {
      console.error('ACARA sync error:', err.message);
    }
  })();
});

module.exports = router;
