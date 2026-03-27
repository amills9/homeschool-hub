// ============================================================
// HOMESCHOOL HUB — Resources Route
// Handles CRUD for learning resources.
// PDFs are uploaded to Cloudinary under a per-user folder
// and stored as raw files (not images).
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

// Upload PDF to Cloudinary as a raw file
// Stored in: homeschool-hub/pdfs/{userId}/
async function uploadPdfToCloudinary(base64Data, userId, filename) {
  const { cloudName, apiKey, apiSecret } = getCloudConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = `homeschool-hub/pdfs/${userId}`;
  const publicId  = `${filename.replace(/[^a-zA-Z0-9-_]/g, '_')}_${timestamp}.pdf`;
  const signature = sign({ folder, public_id: publicId, timestamp }, apiSecret);

  const boundary = `----FormBoundary${timestamp}`;
  const CRLF     = '\r\n';
  const buffer   = Buffer.from(base64Data.replace(/^data:[^;]+;base64,/, ''), 'base64');

  const parts = [];
  function addField(name, value) {
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`, 'utf8'));
  }
  addField('api_key',       apiKey);
  addField('timestamp',     String(timestamp));
  addField('folder',        folder);
  addField('public_id',     publicId);
  addField('resource_type', 'raw');
  addField('signature',     signature);
  parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}Content-Type: application/pdf${CRLF}${CRLF}`, 'utf8'));
  parts.push(buffer);
  parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8'));
  const body = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudinary.com',
      path:     `/v1_1/${cloudName}/raw/upload`,
      method:   'POST',
      headers:  { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
    };
    const req = https.request(options, r => {
      let data = '';
      r.on('data', chunk => data += chunk);
      r.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.message));
          else resolve(json);
        } catch (e) { reject(new Error('Invalid Cloudinary response')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Delete a raw file from Cloudinary
async function deleteFromCloudinary(publicId) {
  try {
    const { cloudName, apiKey, apiSecret } = getCloudConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: publicId, resource_type: 'raw', timestamp }, apiSecret);
    const body = `public_id=${encodeURIComponent(publicId)}&resource_type=raw&api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}`;
    await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'api.cloudinary.com',
        path:     `/v1_1/${cloudName}/raw/destroy`,
        method:   'POST',
        headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      };
      const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
      r.on('error', reject);
      r.write(body);
      r.end();
    });
  } catch (e) {
    console.error('Cloudinary PDF delete error:', e.message);
  }
}

// ── GET /resources ────────────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const { child_id, subject_id } = req.query;

  let accessibleIds;
  if (req.user.role === 'admin') {
    accessibleIds = db.prepare('SELECT id FROM children').all().map(c => c.id);
  } else {
    accessibleIds = db.prepare('SELECT id FROM children WHERE user_id = ?').all(req.user.id).map(c => c.id);
  }

  const placeholders = accessibleIds.length > 0 ? accessibleIds.map(() => '?').join(',') : 'NULL';
  let query = `
    SELECT r.*, s.name as subject_name, c.name as child_name
    FROM resources r
    LEFT JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN children c ON r.child_id = c.id
    WHERE (r.user_id = ? OR (r.user_id IS NULL AND r.child_id IN (${placeholders})))
  `;
  const params = [req.user.id, ...accessibleIds];
  if (child_id)   { query += ' AND r.child_id = ?';   params.push(child_id); }
  if (subject_id) { query += ' AND r.subject_id = ?'; params.push(subject_id); }
  query += ' ORDER BY r.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

// ── POST /resources ───────────────────────────────────────────
// If type=pdf and pdf_base64 provided, uploads PDF to Cloudinary first
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { child_id, subject_id, title, type, url, notes, pdf_base64, pdf_filename } = req.body;
    const id = uuidv4();

    let finalUrl           = url || '';
    let cloudinaryPublicId = null;

    if (type === 'pdf' && pdf_base64) {
      const filename = pdf_filename || `${title || 'document'}.pdf`;
      const result   = await uploadPdfToCloudinary(pdf_base64, req.user.id, filename);
      finalUrl           = result.secure_url;
      cloudinaryPublicId = result.public_id;
    }

    db.prepare(`
      INSERT INTO resources (id, child_id, subject_id, title, type, url, notes, user_id, cloudinary_public_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, child_id || null, subject_id || null, title, type || 'link', finalUrl, notes || '', req.user.id, cloudinaryPublicId);

    res.json(db.prepare('SELECT * FROM resources WHERE id = ?').get(id));
  } catch (err) {
    console.error('Resource create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /resources/:id ────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { child_id, subject_id, title, type, url, notes, pdf_base64, pdf_filename } = req.body;
    const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let finalUrl           = url || existing.url || '';
    let cloudinaryPublicId = existing.cloudinary_public_id;

    // New PDF uploaded — delete old one, upload new one
    if (type === 'pdf' && pdf_base64) {
      if (existing.cloudinary_public_id) await deleteFromCloudinary(existing.cloudinary_public_id);
      const filename = pdf_filename || `${title || 'document'}.pdf`;
      const result   = await uploadPdfToCloudinary(pdf_base64, req.user.id, filename);
      finalUrl           = result.secure_url;
      cloudinaryPublicId = result.public_id;
    }

    db.prepare(`
      UPDATE resources
      SET child_id=?, subject_id=?, title=?, type=?, url=?, notes=?, cloudinary_public_id=?
      WHERE id=?
    `).run(child_id || null, subject_id || null, title, type || 'link', finalUrl, notes || '', cloudinaryPublicId, req.params.id);

    res.json(db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id));
  } catch (err) {
    console.error('Resource update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /resources/:id/download ────────────────────────────────
// Proxy download for Cloudinary-hosted PDFs to avoid CORS/auth issues
router.get('/:id/download', authMiddleware, async (req, res) => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!resource) return res.status(404).json({ error: 'Not found' });
  
  // Check if user has access to this resource
  let accessibleIds;
  if (req.user.role === 'admin') {
    accessibleIds = db.prepare('SELECT id FROM children').all().map(c => c.id);
  } else {
    accessibleIds = db.prepare('SELECT id FROM children WHERE user_id = ?').all(req.user.id).map(c => c.id);
  }
  
  const isAccessible = resource.user_id === req.user.id || 
                       (resource.user_id === null && accessibleIds.includes(resource.child_id));
  if (!isAccessible) return res.status(403).json({ error: 'Access denied' });
  
  if (!resource.cloudinary_public_id) {
    return res.status(400).json({ error: 'No PDF file attached' });
  }
  
  try {
    const { cloudName, apiKey, apiSecret } = getCloudConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: resource.cloudinary_public_id, resource_type: 'raw', timestamp }, apiSecret);
    
    // Generate signed Cloudinary URL
    const downloadUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${resource.cloudinary_public_id}?api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}`;
    
    // Redirect to signed URL (Cloudinary handles the actual download)
    res.redirect(downloadUrl);
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});

// ── DELETE /resources/:id ─────────────────────────────────────
// Also removes the PDF from Cloudinary if one was uploaded
router.delete('/:id', authMiddleware, async (req, res) => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!resource) return res.status(404).json({ error: 'Not found' });

  if (resource.cloudinary_public_id) {
    await deleteFromCloudinary(resource.cloudinary_public_id);
  }

  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
