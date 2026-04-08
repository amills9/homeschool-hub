// ============================================================
// HOMESCHOOL HUB — Photos Route (PostgreSQL)
// ============================================================
const express = require('express');
const https   = require('https');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db }  = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

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

// GET /photos/gallery
router.get('/gallery', authMiddleware, async (req, res) => {
  try {
    const { child_id, subject_id, date_from, date_to, search } = req.query;
    const accessibleIds = req.user.role === 'admin'
      ? (await db.query('SELECT id FROM children')).map(c => c.id)
      : (await db.query('SELECT id FROM children WHERE user_id=$1', [req.user.id])).map(c => c.id);
    if (accessibleIds.length === 0) return res.json([]);

    const placeholders = accessibleIds.map((_, i) => `$${i + 1}`).join(',');
    const params = [...accessibleIds];
    let q = `
      SELECT p.id, p.task_id, p.url, p.thumbnail_url, p.caption, p.created_at,
        t.title AS task_title, t.week_start,
        c.id AS child_id, c.name AS child_name, c.avatar_color AS child_color,
        s.id AS subject_id, s.name AS subject_name, s.color AS subject_color, s.icon AS subject_icon
      FROM task_photos p
      JOIN weekly_tasks t ON p.task_id = t.id
      JOIN children     c ON t.child_id = c.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE c.id IN (${placeholders})
    `;
    if (child_id)   { params.push(child_id);   q += ` AND c.id = $${params.length}`; }
    if (subject_id) { params.push(subject_id); q += ` AND s.id = $${params.length}`; }
    if (date_from)  { params.push(date_from);  q += ` AND p.created_at >= $${params.length}`; }
    if (date_to)    { params.push(date_to + ' 23:59:59'); q += ` AND p.created_at <= $${params.length}`; }
    if (search)     {
      params.push(`%${search}%`); params.push(`%${search}%`);
      q += ` AND (p.caption ILIKE $${params.length - 1} OR t.title ILIKE $${params.length})`;
    }
    q += ' ORDER BY p.created_at DESC';
    res.json(await db.query(q, params));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /photos?task_id=xxx
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { task_id } = req.query;
    if (!task_id) return res.status(400).json({ error: 'task_id required' });
    const task = await db.one(`
      SELECT t.* FROM weekly_tasks t
      JOIN children c ON t.child_id = c.id
      WHERE t.id=$1 AND (c.user_id=$2 OR $3='admin')
    `, [task_id, req.user.id, req.user.role]);
    if (!task) return res.status(403).json({ error: 'Not authorised' });
    res.json(await db.query('SELECT * FROM task_photos WHERE task_id=$1 ORDER BY created_at ASC', [task_id]));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /photos/upload
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const { task_id, image_base64, caption } = req.body;
    if (!task_id || !image_base64) return res.status(400).json({ error: 'task_id and image_base64 required' });

    const task = await db.one(`
      SELECT t.* FROM weekly_tasks t
      JOIN children c ON t.child_id = c.id
      WHERE t.id=$1 AND c.user_id=$2
    `, [task_id, req.user.id]);
    if (!task) return res.status(403).json({ error: 'Not authorised' });

    const { cloudName, apiKey, apiSecret } = getCloudConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder    = 'homeschool-hub';
    const signature = sign({ folder, timestamp }, apiSecret);

    const boundary   = `----FormBoundary${timestamp}`;
    const CRLF       = '\r\n';
    const imageBuffer = Buffer.from(image_base64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');

    const parts = [];
    const addField = (name, value) =>
      parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`, 'utf8'));

    addField('api_key',   apiKey);
    addField('timestamp', String(timestamp));
    addField('folder',    folder);
    addField('signature', signature);
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="upload.jpg"${CRLF}Content-Type: image/jpeg${CRLF}${CRLF}`, 'utf8'));
    parts.push(imageBuffer);
    parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8'));
    const body = Buffer.concat(parts);

    const result = await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: 'api.cloudinary.com',
        path:     `/v1_1/${cloudName}/image/upload`,
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
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });

    const thumbUrl = result.secure_url.replace('/upload/', '/upload/c_fill,w_120,h_120,q_auto/');
    const photoId  = uuidv4();
    await db.none(
      'INSERT INTO task_photos (id,task_id,url,thumbnail_url,public_id,caption,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [photoId, task_id, result.secure_url, thumbUrl, result.public_id, caption||'', req.user.id]
    );
    res.json({ id: photoId, url: result.secure_url, thumbnail_url: thumbUrl, caption: caption||'' });
  } catch (err) { console.error('Photo upload error:', err.message); res.status(500).json({ error: err.message }); }
});

// DELETE /photos/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const photo = await db.one('SELECT * FROM task_photos WHERE id=$1', [req.params.id]);
  if (!photo) return res.status(404).json({ error: 'Not found' });
  try {
    const { cloudName, apiKey, apiSecret } = getCloudConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign({ public_id: photo.public_id, timestamp }, apiSecret);
    const body = `public_id=${encodeURIComponent(photo.public_id)}&api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}`;
    await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: 'api.cloudinary.com',
        path:     `/v1_1/${cloudName}/image/destroy`,
        method:   'POST',
        headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(d)); });
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });
  } catch (e) { console.error('Cloudinary delete error:', e.message); }
  await db.none('DELETE FROM task_photos WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
