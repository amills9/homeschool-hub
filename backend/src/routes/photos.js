const express = require('express');
const https = require('https');
const http = require('http');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary env vars not set');
  return { cloudName, apiKey, apiSecret };
}

// Simple SHA-1 for Cloudinary signature (no external dep needed)
const crypto = require('crypto');

function cloudinarySign(params, apiSecret) {
  const sortedKeys = Object.keys(params).sort();
  const str = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + apiSecret;
  return crypto.createHash('sha1').update(str).digest('hex');
}

// POST /api/photos/upload  — receives base64 image, uploads to Cloudinary
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const { task_id, image_base64, caption } = req.body;
    if (!task_id || !image_base64) return res.status(400).json({ error: 'task_id and image_base64 required' });

    // Verify task belongs to this user's children
    const task = db.prepare(`
      SELECT t.* FROM weekly_tasks t
      JOIN children c ON t.child_id = c.id
      WHERE t.id = ? AND c.user_id = ?
    `).get(task_id, req.user.id);
    if (!task) return res.status(403).json({ error: 'Not authorised' });

    const { cloudName, apiKey, apiSecret } = getCloudinary();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'homeschool-hub';

    const sigParams = { folder, timestamp };
    const signature = cloudinarySign(sigParams, apiSecret);

    // Build multipart form data manually
    const boundary = '----CloudinaryBoundary' + timestamp;
    const imageData = image_base64.replace(/^data:image\/\w+;base64,/, '');

    let body = '';
    body += `--${boundary}\r\nContent-Disposition: form-data; name="file"\r\n\r\ndata:image/jpeg;base64,${imageData}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\n${folder}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n`;
    body += `--${boundary}--\r\n`;

    const bodyBuf = Buffer.from(body, 'utf8');

    const uploadRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.cloudinary.com',
        path: `/v1_1/${cloudName}/image/upload`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuf.length,
        },
      };
      const request = https.request(options, (r) => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Invalid Cloudinary response: ' + data)); }
        });
      });
      request.on('error', reject);
      request.write(bodyBuf);
      request.end();
    });

    if (uploadRes.error) return res.status(400).json({ error: uploadRes.error.message });

    // Save photo record in DB
    const { v4: uuidv4 } = require('uuid');
    const photoId = uuidv4();
    db.prepare(`
      INSERT INTO task_photos (id, task_id, url, thumbnail_url, public_id, caption, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      photoId, task_id,
      uploadRes.secure_url,
      uploadRes.eager?.[0]?.secure_url || uploadRes.secure_url,
      uploadRes.public_id,
      caption || '',
      req.user.id
    );

    res.json({
      id: photoId,
      url: uploadRes.secure_url,
      thumbnail_url: uploadRes.eager?.[0]?.secure_url || uploadRes.secure_url,
      caption: caption || '',
    });

  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/photos?task_id=xxx — get photos for a task
router.get('/', authMiddleware, (req, res) => {
  const { task_id } = req.query;
  if (!task_id) return res.status(400).json({ error: 'task_id required' });
  const photos = db.prepare('SELECT * FROM task_photos WHERE task_id = ? ORDER BY created_at ASC').all(task_id);
  res.json(photos);
});

// DELETE /api/photos/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const photo = db.prepare('SELECT * FROM task_photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Not found' });

  // Delete from Cloudinary
  try {
    const { cloudName, apiKey, apiSecret } = getCloudinary();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinarySign({ public_id: photo.public_id, timestamp }, apiSecret);
    const body = `public_id=${encodeURIComponent(photo.public_id)}&api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}`;

    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.cloudinary.com',
        path: `/v1_1/${cloudName}/image/destroy`,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      };
      const req = https.request(options, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve(d)); });
      req.on('error', reject);
      req.write(body); req.end();
    });
  } catch (e) {
    console.error('Cloudinary delete error:', e.message);
  }

  db.prepare('DELETE FROM task_photos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
