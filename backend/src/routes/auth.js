const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const APP_URL = process.env.APP_URL || 'http://158.178.140.37';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const ADMIN_NOTIFY_EMAIL = 'andrewmills@internode.on.net';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendResetEmail(toEmail, username, token) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: 'Homeschool Hub — Password Reset',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#2D6A4F;margin-bottom:8px;">Password Reset</h2>
          <p style="color:#5C5A55;">Hi ${username}, you requested a password reset for your Homeschool Hub account.</p>
          <p style="color:#5C5A55;">Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#2D6A4F;color:white;border-radius:8px;text-decoration:none;font-weight:600;">
            Reset My Password
          </a>
          <p style="color:#9B9890;font-size:13px;">Or copy this link:<br/><a href="${resetUrl}" style="color:#2D6A4F;">${resetUrl}</a></p>
          <p style="color:#9B9890;font-size:12px;margin-top:32px;">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

async function sendSignupNotification(username, email, homeschool_stage, num_children, newsletter_opt_in) {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: ADMIN_NOTIFY_EMAIL,
      subject: `Homeschool Hub — New signup: ${username}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#2D6A4F;margin-bottom:8px;">New Account Request</h2>
          <p style="color:#5C5A55;">A new family has signed up and is awaiting your approval.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px 0;color:#9B9890;font-size:13px;width:140px;">Username</td><td style="font-weight:600;">${username}</td></tr>
            <tr><td style="padding:8px 0;color:#9B9890;font-size:13px;">Email</td><td>${email || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#9B9890;font-size:13px;">Children</td><td>${num_children || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#9B9890;font-size:13px;">Stage</td><td>${homeschool_stage || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#9B9890;font-size:13px;">Newsletter</td><td>${newsletter_opt_in ? 'Yes' : 'No'}</td></tr>
          </table>
          <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background:#2D6A4F;color:white;border-radius:8px;text-decoration:none;font-weight:600;">
            Review in Admin Dashboard
          </a>
        </div>
      `,
    });
  } catch (err) {
    console.error('Signup notification error:', err);
  }
}

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.status === 'pending') return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
  if (user.status === 'rejected') return res.status(403).json({ error: 'Your account registration was not approved.' });
  if (user.status === 'suspended') return res.status(403).json({ error: 'Your account has been suspended. Please contact the admin.' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(user.id);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role }, preferences: prefs || {} });
});

// POST /auth/signup-with-children
router.post('/signup-with-children', async (req, res) => {
  const { username, password, display_name, email, num_children, homeschool_stage, newsletter_opt_in, children } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!email) return res.status(400).json({ error: 'Email address required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const userId = uuidv4();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, status, email, num_children, homeschool_stage, newsletter_opt_in)
      VALUES (?, ?, ?, 'parent', 'pending', ?, ?, ?, ?)
    `).run(userId, username, hash, email, num_children || 0, homeschool_stage || '', newsletter_opt_in ? 1 : 0);
    db.prepare('INSERT OR IGNORE INTO user_preferences (user_id, display_name) VALUES (?, ?)').run(userId, display_name || '');
    if (Array.isArray(children)) {
      const insertChild = db.prepare('INSERT INTO children (id, user_id, name, year_level, avatar_color) VALUES (?, ?, ?, ?, ?)');
      children.forEach(child => {
        if (child.name && child.year_level) insertChild.run(uuidv4(), userId, child.name, child.year_level, child.avatar_color || '#6C63FF');
      });
    }
  })();

  // Fire-and-forget notification email
  sendSignupNotification(username, email, homeschool_stage, num_children, newsletter_opt_in);

  res.json({ success: true, message: 'Account created! An admin will review and approve your request shortly.' });
});

// GET /auth/me
router.get('/me', authMiddleware, (req, res) => {
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
  res.json({ ...req.user, preferences: prefs || {} });
});

// GET /auth/users (admin only)
router.get('/users', adminMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, status, email, num_children, homeschool_stage, newsletter_opt_in, created_at
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// GET /auth/stats (admin only)
router.get('/stats', adminMiddleware, (req, res) => {
  const parentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'parent' AND status = 'approved'").get().count;
  const pendingCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'pending'").get().count;
  const childCount = db.prepare('SELECT COUNT(*) as count FROM children').get().count;
  const newsletterCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE newsletter_opt_in = 1 AND role = 'parent'").get().count;
  res.json({ parentCount, pendingCount, childCount, newsletterCount });
});

// PUT /auth/users/:id — edit username, email, password, role
router.put('/users/:id', adminMiddleware, (req, res) => {
  const { password, role, username, email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username && username !== user.username) {
    const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
    if (taken) return res.status(400).json({ error: 'Username already taken' });
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.params.id);
  }
  if (email !== undefined) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email || null, req.params.id);
  if (password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.params.id);
  if (role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

  res.json({ success: true });
});

// PUT /auth/users/:id/approve
router.put('/users/:id/approve', adminMiddleware, (req, res) => {
  db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// PUT /auth/users/:id/reject
router.put('/users/:id/reject', adminMiddleware, (req, res) => {
  db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// PUT /auth/users/:id/status — suspend / reactivate
router.put('/users/:id/status', adminMiddleware, (req, res) => {
  const { status } = req.body;
  const allowed = ['approved', 'suspended', 'pending', 'rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// DELETE /auth/users/:id
router.delete('/users/:id', adminMiddleware, (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ? AND role != 'admin'").run(req.params.id);
  res.json({ success: true });
});

// POST /auth/admin-reset — admin triggers password reset email for a user
router.post('/admin-reset', adminMiddleware, async (req, res) => {
  const { userId } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.email) return res.status(400).json({ error: 'User has no email address' });

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

  const sent = await sendResetEmail(user.email, user.username, token);
  if (!sent) return res.status(500).json({ error: 'Failed to send email' });
  res.json({ success: true });
});

// GET /auth/preferences
router.get('/preferences', authMiddleware, (req, res) => {
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
  res.json(prefs || {});
});

// PUT /auth/preferences
router.put('/preferences', authMiddleware, (req, res) => {
  const { theme_color, bg_color, accent_color, sidebar_color, font_style, display_name } = req.body;
  db.prepare(`
    INSERT INTO user_preferences (user_id, theme_color, bg_color, accent_color, sidebar_color, font_style, display_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      theme_color=excluded.theme_color, bg_color=excluded.bg_color,
      accent_color=excluded.accent_color, sidebar_color=excluded.sidebar_color,
      font_style=excluded.font_style, display_name=excluded.display_name
  `).run(req.user.id, theme_color || '#2D6A4F', bg_color || '#F7F5F0', accent_color || '#F4A261', sidebar_color || '#FFFFFF', font_style || 'default', display_name || '');
  res.json({ success: true });
});

// PUT /auth/change-password
router.put('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Current password is incorrect' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ success: true });
});

// POST /auth/forgot-password — sends reset link to user's email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.json({ success: true }); // Don't reveal whether email exists

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);
  await sendResetEmail(user.email, user.username, token);
  res.json({ success: true });
});

// POST /auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const user = db.prepare("SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')").get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });

  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
  res.json({ success: true });
});

module.exports = router;
