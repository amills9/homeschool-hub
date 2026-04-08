// ============================================================
// HOMESCHOOL HUB — Resources Route (PostgreSQL v3.5.0)
// PDFs uploaded to Cloudinary under homeschool-hub/pdfs/{userId}
// ============================================================
const express = require('express');
const https   = require('https');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db }  = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Cloudinary helpers ────────────────────────────────────────
function getCloudConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary credentials not configured');
  return { cloudName, apiKey, apiSecret };
}

function sign(params, secret) {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret;
  return crypto.createHash('sha1').update(str).digest('hex');
}

async function uploadPdfToCloudinary(base64Data, userId, filename) {
  const { cloudName, apiKey, apiSecret } = getCloudConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = `homeschool-hub/pdfs/${userId}`;
  const publicId  = `${filename.replace(/[^a-zA-Z0-9-_]/g, '_')}_${timestamp}`;
  // access_mode must be included in signature for public files
  const signature = sign({ access_mode: 'public', folder, public_id: publicId, timestamp }, apiSecret);

  const boundary = `----FormBoundary${timestamp}`;
  const CRLF     = '\r\n';
  const buffer   = Buffer.from(base64Data.replace(/^data:[^;]+;base64,/, ''), 'base64');

  const parts = [];
  const addField = (name, value) =>
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`, 'utf8'));

  addField('api_key',       apiKey);
  addField('timestamp',     String(timestamp));
  addField('folder',        folder);
  addField('public_id',     publicId);
  addField('resource_type', 'raw');
  addField('access_mode',   'public');
  addField('signature',     signature);
  parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}Content-Type: application/pdf${CRLF}${CRLF}`, 'utf8'));
  parts.push(buffer);
  parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8'));
  const body = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path:     `/v1_1/${cloudName}/raw/upload`,
      method:   'POST',
      headers:  { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
    }, r => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.message));
          else resolve(json);
        } catch { reject(new Error('Invalid Cloudinary response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function deleteFromCloudinary(publicId) {
  try {
    const { cloudName, apiKey, apiSecret } = getCloudConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: publicId, timestamp }, apiSecret);
    const body = `public_id=${encodeURIComponent(publicId)}&resource_type=raw&api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}`;
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.cloudinary.com',
        path:     `/v1_1/${cloudName}/raw/destroy`,
        method:   'POST',
        headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d)); });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  } catch (e) { console.error('Cloudinary delete error:', e.message); }
}

// ── GET /resources ────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { child_id, subject_id } = req.query;

    const accessibleIds = req.user.role === 'admin'
      ? (await db.query('SELECT id FROM children')).map(c => c.id)
      : (await db.query('SELECT id FROM children WHERE user_id=$1', [req.user.id])).map(c => c.id);

    const placeholders = accessibleIds.length > 0
      ? accessibleIds.map((_, i) => `$${i + 2}`).join(',')
      : 'NULL';

    let q = `
      SELECT r.*, s.name AS subject_name, c.name AS child_name
      FROM resources r
      LEFT JOIN subjects s ON r.subject_id = s.id
      LEFT JOIN children c ON r.child_id   = c.id
      WHERE (r.user_id = $1 OR (r.user_id IS NULL AND r.child_id IN (${placeholders})))
    `;
    const params = [req.user.id, ...accessibleIds];
    if (child_id)   { params.push(child_id);   q += ` AND r.child_id = $${params.length}`; }
    if (subject_id) { params.push(subject_id); q += ` AND r.subject_id = $${params.length}`; }
    q += ' ORDER BY r.created_at DESC';

    res.json(await db.query(q, params));
  } catch (err) { console.error('Resources GET error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// ── POST /resources ───────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { child_id, subject_id, title, type, url, notes, pdf_base64, pdf_filename } = req.body;
    const id = uuidv4();
    let finalUrl = url || '';
    let cloudinaryPublicId = null;

    if (type === 'pdf' && pdf_base64) {
      const filename = pdf_filename || `${title || 'document'}.pdf`;
      const result   = await uploadPdfToCloudinary(pdf_base64, req.user.id, filename);
      finalUrl           = result.secure_url;
      cloudinaryPublicId = result.public_id;
    }

    await db.none(`
      INSERT INTO resources (id,child_id,subject_id,title,type,url,notes,user_id,cloudinary_public_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [id, child_id||null, subject_id||null, title, type||'link', finalUrl, notes||'', req.user.id, cloudinaryPublicId]);

    res.json(await db.one('SELECT * FROM resources WHERE id=$1', [id]));
  } catch (err) { console.error('Resources POST error:', err.message); res.status(500).json({ error: err.message }); }
});

// ── PUT /resources/:id ────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { child_id, subject_id, title, type, url, notes, pdf_base64, pdf_filename } = req.body;
    const existing = await db.one('SELECT * FROM resources WHERE id=$1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let finalUrl = url || existing.url || '';
    let cloudinaryPublicId = existing.cloudinary_public_id;

    if (type === 'pdf' && pdf_base64) {
      if (existing.cloudinary_public_id) await deleteFromCloudinary(existing.cloudinary_public_id);
      const filename = pdf_filename || `${title || 'document'}.pdf`;
      const result   = await uploadPdfToCloudinary(pdf_base64, req.user.id, filename);
      finalUrl           = result.secure_url;
      cloudinaryPublicId = result.public_id;
    }

    await db.none(`
      UPDATE resources SET child_id=$1,subject_id=$2,title=$3,type=$4,url=$5,notes=$6,cloudinary_public_id=$7
      WHERE id=$8
    `, [child_id||null, subject_id||null, title, type||'link', finalUrl, notes||'', cloudinaryPublicId, req.params.id]);

    res.json(await db.one('SELECT * FROM resources WHERE id=$1', [req.params.id]));
  } catch (err) { console.error('Resources PUT error:', err.message); res.status(500).json({ error: err.message }); }
});

// ── GET /resources/:id/pdf-url ────────────────────────────────
// Returns a time-limited signed Cloudinary download URL as JSON.
// Cloudinary's "private download URL" is signed with API credentials
// and works regardless of the account's delivery/access settings.
// The frontend opens the URL directly — no blob, no proxy streaming.
router.get('/:id/pdf-url', authMiddleware, async (req, res) => {
  try {
    const resource = await db.one('SELECT * FROM resources WHERE id=$1', [req.params.id]);
    if (!resource || resource.type !== 'pdf' || !resource.url) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Verify ownership
    if (req.user.role !== 'admin') {
      const kids = await db.query('SELECT id FROM children WHERE user_id=$1', [req.user.id]);
      const kidIds = kids.map(k => k.id);
      const owned  = resource.user_id === req.user.id ||
                     (resource.child_id && kidIds.includes(resource.child_id));
      if (!owned) return res.status(403).json({ error: 'Forbidden' });
    }

    const { cloudName, apiKey, apiSecret } = getCloudConfig();
    const publicId  = resource.cloudinary_public_id;

    // If no Cloudinary public_id stored, fall back to the raw URL as-is
    if (!publicId) {
      return res.json({ url: resource.url });
    }

    // Generate Cloudinary private download URL (signed, 1-hour expiry).
    // This is different from upload signatures — it uses the download endpoint
    // on api.cloudinary.com and is always accessible regardless of delivery mode.
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = timestamp + 3600;

    // Params included in the signature (sorted alphabetically, no api_key)
    const sigParams = { expires_at: expiresAt, public_id: publicId, timestamp };
    const toSign    = Object.keys(sigParams).sort()
      .map(k => `${k}=${sigParams[k]}`).join('&') + apiSecret;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const qs = new URLSearchParams({
      ...sigParams,
      api_key: apiKey,
      signature,
    });

    const downloadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/download?${qs}`;
    res.json({ url: downloadUrl });

  } catch (err) {
    console.error('PDF url GET error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /resources/:id ─────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const resource = await db.one('SELECT * FROM resources WHERE id=$1', [req.params.id]);
    if (!resource) return res.status(404).json({ error: 'Not found' });
    if (resource.cloudinary_public_id) await deleteFromCloudinary(resource.cloudinary_public_id);
    await db.none('DELETE FROM resources WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error('Resources DELETE error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
