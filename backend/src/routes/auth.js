const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const APP_URL   = process.env.APP_URL   || 'http://localhost:3001';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

function getResend() {
  const { Resend } = require('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendResetEmail(toEmail, username, token) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  try {
    await getResend().emails.send({
      from: FROM_EMAIL, to: toEmail,
      subject: 'Homeschool Hub — Password Reset',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#2D6A4F">Password Reset</h2>
        <p style="color:#5C5A55">Hi ${username}, click below to reset your password. Expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#2D6A4F;color:white;border-radius:8px;text-decoration:none;font-weight:600">Reset My Password</a>
        <p style="color:#9B9890;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>`,
    });
  } catch (err) { console.error('Email error:', err.message); }
}

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status === 'pending')   return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
  if (user.status === 'rejected')  return res.status(403).json({ error: 'Your account registration was not approved.' });
  if (user.status === 'suspended') return res.status(403).json({ error: 'Your account has been suspended. Contact admin.' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, state: user.state || 'NSW' },
    preferences: prefs || {},
  });
});

// POST /auth/signup-with-children
router.post('/signup-with-children', async (req, res) => {
  const { username, password, display_name, email, num_children, homeschool_stage, newsletter_opt_in, state, children } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!email) return res.status(400).json({ error: 'Email address required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username))
    return res.status(400).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const userId = uuidv4();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, status, email, num_children, homeschool_stage, newsletter_opt_in, state)
      VALUES (?, ?, ?, 'parent', 'pending', ?, ?, ?, ?, ?)
    `).run(userId, username, hash, email, num_children || 0, homeschool_stage || '', newsletter_opt_in ? 1 : 0, state || 'NSW');
    db.prepare('INSERT OR IGNORE INTO user_preferences (user_id, display_name) VALUES (?, ?)').run(userId, display_name || '');
    if (Array.isArray(children)) {
      const ins = db.prepare('INSERT INTO children (id, user_id, name, year_level, avatar_color) VALUES (?, ?, ?, ?, ?)');
      children.forEach(c => { if (c.name?.trim()) ins.run(uuidv4(), userId, c.name, c.year_level, c.avatar_color || '#6C63FF'); });
    }
  })();

  try {
    await getResend().emails.send({
      from: FROM_EMAIL, to: process.env.ADMIN_EMAIL || 'andrewmills@internode.on.net',
      subject: 'Homeschool Hub — New Signup',
      html: `<p>New signup: <strong>${username}</strong> (${email}) — State: ${state || 'NSW'}. <a href="${APP_URL}">Review in admin</a></p>`,
    });
  } catch (e) { console.error('Admin notify error:', e.message); }

  res.json({ success: true, message: "Account created! An admin will review and approve your request shortly." });
});

// GET /auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
  res.json({ ...req.user, state: user?.state || 'NSW', preferences: prefs || {} });
});

// PUT /auth/state
router.put('/state', authMiddleware, (req, res) => {
  const { state } = req.body;
  if (!state) return res.status(400).json({ error: 'State required' });
  db.prepare('UPDATE users SET state = ? WHERE id = ?').run(state, req.user.id);
  res.json({ success: true, state });
});

// GET /auth/users (admin)
router.get('/users', adminMiddleware, (req, res) => {
  res.json(db.prepare('SELECT id, username, role, status, email, num_children, homeschool_stage, newsletter_opt_in, state, created_at FROM users ORDER BY status, created_at DESC').all());
});

// GET /auth/stats (admin)
router.get('/stats', adminMiddleware, (req, res) => {
  res.json({
    parentCount:    db.prepare("SELECT COUNT(*) as c FROM users WHERE role='parent' AND status='approved'").get().c,
    pendingCount:   db.prepare("SELECT COUNT(*) as c FROM users WHERE status='pending'").get().c,
    childCount:     db.prepare('SELECT COUNT(*) as c FROM children').get().c,
    newsletterCount:db.prepare("SELECT COUNT(*) as c FROM users WHERE newsletter_opt_in=1 AND role='parent'").get().c,
  });
});

// POST /auth/users (admin create)
router.post('/users', adminMiddleware, (req, res) => {
  const { username, password, role='parent', email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const id = uuidv4();
  try {
    db.prepare("INSERT INTO users (id, username, password_hash, role, status, email) VALUES (?, ?, ?, ?, 'approved', ?)").run(id, username, bcrypt.hashSync(password,10), role, email||null);
    db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(id);
    res.json({ success: true, id });
  } catch { res.status(400).json({ error: 'Username already exists' }); }
});

router.put('/users/:id/approve', adminMiddleware, (req, res) => { db.prepare("UPDATE users SET status='approved' WHERE id=?").run(req.params.id); res.json({ success: true }); });
router.put('/users/:id/reject',  adminMiddleware, (req, res) => { db.prepare("UPDATE users SET status='rejected' WHERE id=?").run(req.params.id); res.json({ success: true }); });
router.put('/users/:id/status',  adminMiddleware, (req, res) => { db.prepare('UPDATE users SET status=? WHERE id=?').run(req.body.status, req.params.id); res.json({ success: true }); });
router.delete('/users/:id',      adminMiddleware, (req, res) => { db.prepare("DELETE FROM users WHERE id=? AND role!='admin'").run(req.params.id); res.json({ success: true }); });

router.put('/users/:id', adminMiddleware, (req, res) => {
  const { username, email, password, role } = req.body;
  if (username) db.prepare('UPDATE users SET username=? WHERE id=?').run(username, req.params.id);
  if (email)    db.prepare('UPDATE users SET email=? WHERE id=?').run(email, req.params.id);
  if (password) db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password,10), req.params.id);
  if (role)     db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ success: true });
});

router.post('/admin-reset', adminMiddleware, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.body.userId);
  if (!user?.email) return res.status(400).json({ error: 'User not found or no email' });
  const token = uuidv4();
  db.prepare('UPDATE users SET reset_token=?, reset_token_expires=? WHERE id=?').run(token, new Date(Date.now()+3600000).toISOString(), user.id);
  await sendResetEmail(user.email, user.username, token);
  res.json({ success: true });
});

router.get('/preferences', authMiddleware, (req, res) => res.json(db.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(req.user.id) || {}));

router.put('/preferences', authMiddleware, (req, res) => {
  const { theme_color, bg_color, accent_color, sidebar_color, font_style, display_name } = req.body;
  db.prepare(`INSERT INTO user_preferences (user_id,theme_color,bg_color,accent_color,sidebar_color,font_style,display_name) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET theme_color=excluded.theme_color,bg_color=excluded.bg_color,accent_color=excluded.accent_color,sidebar_color=excluded.sidebar_color,font_style=excluded.font_style,display_name=excluded.display_name`
  ).run(req.user.id, theme_color||'#2D6A4F', bg_color||'#F7F5F0', accent_color||'#F4A261', sidebar_color||'#FFFFFF', font_style||'default', display_name||'');
  res.json({ success: true });
});

router.put('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Current password incorrect' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword,10), req.user.id);
  res.json({ success: true });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user) return res.json({ success: true });
  const token = uuidv4();
  db.prepare('UPDATE users SET reset_token=?, reset_token_expires=? WHERE id=?').run(token, new Date(Date.now()+3600000).toISOString(), user.id);
  await sendResetEmail(user.email, user.username, token);
  res.json({ success: true });
});

router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const user = db.prepare("SELECT * FROM users WHERE reset_token=? AND reset_token_expires>datetime('now')").get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset link.' });
  db.prepare('UPDATE users SET password_hash=?, reset_token=NULL, reset_token_expires=NULL WHERE id=?').run(bcrypt.hashSync(newPassword,10), user.id);
  res.json({ success: true });
});

module.exports = router;
