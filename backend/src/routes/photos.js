// GET /api/photos/gallery — all photos for the logged-in user's children
// Query params: child_id, subject_id, date_from, date_to, search
const express = require('express');
const https = require('https');
const crypto = require('crypto');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function getCloudConfig() {
  const cloudName  = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey     = process.env.CLOUDINARY_API_KEY;
  const apiSecret  = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary credentials not configured');
  return { cloudName, apiKey, apiSecret };
}

function sign(params, secret) {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret;
  return crypto.createHash('sha1').update(str).digest('hex');
}

// GET /api/photos/gallery
router.get('/gallery', authMiddleware, (req, res) => {
  const { child_id, subject_id, date_from, date_to, search } = req.query;

  // Get accessible child IDs
  let accessibleIds;
  if (req.user.role === 'admin') {
    accessibleIds = db.prepare('SELECT id FROM children').all().map(c => c.id);
  } else {
    accessibleIds = db.prepare('SELECT id FROM children WHERE user_id = ?').all(req.user.id).map(c => c.id);
  }
  if (accessibleIds.length === 0) return res.json([]);

  const placeholders = accessibleIds.map(() => '?').join(',');

  let query = `
    SELECT
      p.id, p.task_id, p.url, p.thumbnail_url, p.caption, p.created_at,
      t.title as task_title, t.week_start,
      c.id as child_id, c.name as child_name, c.avatar_color as child_color,
      s.id as subject_id, s.name as subject_name, s.color as subject_color, s.icon as subject_icon
    FROM task_photos p
    JOIN weekly_tasks t ON p.task_id = t.id
    JOIN children c ON t.child_id = c.id
    LEFT JOIN subjects s ON t.subject_id = s.id
    WHERE c.id IN (${placeholders})
  `;
  const params = [...accessibleIds];

  if (child_id) { query += ' AND c.id = ?'; params.push(child_id); }
  if (subject_id) { query += ' AND s.id = ?'; params.push(subject_id); }
  if (date_from) { query += ' AND p.created_at >= ?'; params.push(date_from); }
  if (date_to) { query += ' AND p.created_at <= ?'; params.push(date_to + ' 23:59:59'); }
  if (search) { query += ' AND (p.caption LIKE ? OR t.title LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY p.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

// GET /api/photos?task_id=xxx
router.get('/', authMiddleware, (req, res) => {
  const { task_id } = req.query;
  if (!task_id) return res.status(400).json({ error: 'task_id required' });
  // Verify task belongs to this user's children
  const task = db.prepare(`
    SELECT t.* FROM weekly_tasks t
    JOIN children c ON t.child_id = c.id
    WHERE t.id = ? AND (c.user_id = ? OR ? = 'admin')
  `).get(task_id, req.user.id, req.user.role);
  if (!task) return res.status(403).json({ error: 'Not authorised' });
  res.json(db.prepare('SELECT * FROM task_photos WHERE task_id = ? ORDER BY created_at ASC').all(task_id));
});

// POST /api/photos/upload
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const { task_id, image_base64, caption } = req.body;
    if (!task_id || !image_base64) return res.status(400).json({ error: 'task_id and image_base64 required' });

    const task = db.prepare(`
      SELECT t.* FROM weekly_tasks t
      JOIN children c ON t.child_id = c.id
      WHERE t.id = ? AND c.user_id = ?
    `).get(task_id, req.user.id);
    if (!task) return res.status(403).json({ error: 'Not authorised' });

    const { cloudName, apiKey, apiSecret } = getCloudConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'homeschool-hub';
    const signature = sign({ folder, timestamp }, apiSecret);

    const boundary = `----FormBoundary${timestamp}`;
    const CRLF = '\r\n';
    const base64Data = image_base64.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const parts = [];
    function addField(name, value) {
      parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`, 'utf8'));
    }
    addField('api_key', apiKey);
    addField('timestamp', String(timestamp));
    addField('folder', folder);
    addField('signature', signature);
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="upload.jpg"${CRLF}Content-Type: image/jpeg${CRLF}${CRLF}`, 'utf8'));
    parts.push(imageBuffer);
    parts.push(Buffer.from(CRLF, 'utf8'));
    parts.push(Buffer.from(`--${boundary}--${CRLF}`, 'utf8'));
    const body = Buffer.concat(parts);

    const uploadResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.cloudinary.com',
        path: `/v1_1/${cloudName}/image/upload`,
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
      };
      const request = https.request(options, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) reject(new Error(json.error.message));
            else resolve(json);
          } catch (e) { reject(new Error('Invalid Cloudinary response: ' + data.substring(0, 200))); }
        });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });

    const thumbUrl = uploadResult.secure_url.replace('/upload/', '/upload/c_fill,w_120,h_120,q_auto/');
    const { v4: uuidv4 } = require('uuid');
    const photoId = uuidv4();
    db.prepare(`INSERT INTO task_photos (id, task_id, url, thumbnail_url, public_id, caption, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(photoId, task_id, uploadResult.secure_url, thumbUrl, uploadResult.public_id, caption || '', req.user.id);

    res.json({ id: photoId, url: uploadResult.secure_url, thumbnail_url: thumbUrl, caption: caption || '' });
  } catch (err) {
    console.error('Photo upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/photos/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const photo = db.prepare('SELECT * FROM task_photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Not found' });

  try {
    const { cloudName, apiKey, apiSecret } = getCloudConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: photo.public_id, timestamp }, apiSecret);
    const body = `public_id=${encodeURIComponent(photo.public_id)}&api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}`;
    await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'api.cloudinary.com',
        path: `/v1_1/${cloudName}/image/destroy`,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      };
      const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
      r.on('error', reject);
      r.write(body); r.end();
    });
  } catch (e) { console.error('Cloudinary delete error:', e.message); }

  db.prepare('DELETE FROM task_photos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
