// ============================================================
// HOMESCHOOL HUB — Auth Route (PostgreSQL)
// ============================================================
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db }  = require('../db/init');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('../middleware/auth');
const { authLimiter, resetLimiter } = require('../middleware/rateLimiter');

const router     = express.Router();
const APP_URL    = process.env.APP_URL    || 'http://localhost:3001';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

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
        <p>Hi ${username}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#2D6A4F;color:white;border-radius:8px;text-decoration:none;font-weight:600">Reset My Password</a>
        <p style="color:#9B9890;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>`,
    });
  } catch (err) { console.error('Reset email error:', err.message); }
}

async function sendSignupNotification(username, email, homeschool_stage, num_children) {
  if (!ADMIN_EMAIL) return;
  try {
    await getResend().emails.send({
      from: FROM_EMAIL, to: ADMIN_EMAIL,
      subject: `Homeschool Hub — New signup: ${username}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#2D6A4F">New Account Request</h2>
        <p>Username: <strong>${username}</strong></p>
        <p>Email: ${email || '—'}</p>
        <p>Children: ${num_children || '—'} | Stage: ${homeschool_stage || '—'}</p>
      </div>`,
    });
  } catch (err) { console.error('Signup notification error:', err.message); }
}

// POST /auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await db.one('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'pending')   return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
    if (user.status === 'rejected')  return res.status(403).json({ error: 'Your account registration was not approved.' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Your account has been suspended. Contact admin.' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const prefs = await db.one('SELECT * FROM user_preferences WHERE user_id = $1', [user.id]);
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, state: user.state || 'NSW' },
      preferences: prefs || {},
    });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ error: 'Server error' }); }
});

// POST /auth/signup-with-children
router.post('/signup-with-children', authLimiter, async (req, res) => {
  try {
    const { username, password, display_name, email, num_children, homeschool_stage, newsletter_opt_in, children } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (!email)                  return res.status(400).json({ error: 'Email address required' });
    if (password.length < 6)     return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await db.one('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const hash   = bcrypt.hashSync(password, 10);
    const userId = uuidv4();

    await db.transaction(async (client) => {
      await client.query(
        `INSERT INTO users (id,username,password_hash,role,status,email,num_children,homeschool_stage,newsletter_opt_in)
         VALUES ($1,$2,$3,'parent','pending',$4,$5,$6,$7)`,
        [userId, username, hash, email, num_children || 0, homeschool_stage || '', newsletter_opt_in ? 1 : 0]
      );
      await client.query(
        'INSERT INTO user_preferences (user_id, display_name) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING',
        [userId, display_name || '']
      );
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child.name && child.year_level) {
            await client.query(
              'INSERT INTO children (id,user_id,name,year_level,avatar_color) VALUES ($1,$2,$3,$4,$5)',
              [uuidv4(), userId, child.name, child.year_level, child.avatar_color || '#6C63FF']
            );
          }
        }
      }
    });

    sendSignupNotification(username, email, homeschool_stage, num_children);
    res.json({ success: true, message: 'Account created! An admin will review and approve your request shortly.' });
  } catch (err) { console.error('Signup error:', err); res.status(500).json({ error: 'Server error' }); }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user  = await db.one('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const prefs = await db.one('SELECT * FROM user_preferences WHERE user_id = $1', [req.user.id]);
    res.json({ ...req.user, state: user?.state || 'NSW', preferences: prefs || {} });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /auth/users (admin)
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await db.query(
      'SELECT id,username,role,status,email,num_children,homeschool_stage,newsletter_opt_in,created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /auth/stats (admin)
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [parents, pending, kids, newsletter] = await Promise.all([
      db.one("SELECT COUNT(*) FROM users WHERE role='parent' AND status='approved'"),
      db.one("SELECT COUNT(*) FROM users WHERE status='pending'"),
      db.one("SELECT COUNT(*) FROM children"),
      db.one("SELECT COUNT(*) FROM users WHERE newsletter_opt_in=1 AND role='parent'"),
    ]);
    res.json({
      parentCount:     parseInt(parents.count),
      pendingCount:    parseInt(pending.count),
      childCount:      parseInt(kids.count),
      newsletterCount: parseInt(newsletter.count),
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /auth/users/:id
router.put('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const { password, role, username, email } = req.body;
    const user = await db.one('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (username && username !== user.username) {
      const taken = await db.one('SELECT id FROM users WHERE username=$1 AND id!=$2', [username, req.params.id]);
      if (taken) return res.status(400).json({ error: 'Username already taken' });
      await db.none('UPDATE users SET username=$1 WHERE id=$2', [username, req.params.id]);
    }
    if (email     !== undefined) await db.none('UPDATE users SET email=$1 WHERE id=$2', [email || null, req.params.id]);
    if (password)                await db.none('UPDATE users SET password_hash=$1 WHERE id=$2', [bcrypt.hashSync(password, 10), req.params.id]);
    if (role)                    await db.none('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /auth/users/:id/approve
router.put('/users/:id/approve', adminMiddleware, async (req, res) => {
  await db.none("UPDATE users SET status='approved' WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

// PUT /auth/users/:id/reject
router.put('/users/:id/reject', adminMiddleware, async (req, res) => {
  await db.none("UPDATE users SET status='rejected' WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

// PUT /auth/users/:id/status
router.put('/users/:id/status', adminMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!['approved','suspended','pending','rejected'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  await db.none('UPDATE users SET status=$1 WHERE id=$2', [status, req.params.id]);
  res.json({ success: true });
});

// DELETE /auth/users/:id
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  await db.none("DELETE FROM users WHERE id=$1 AND role!='admin'", [req.params.id]);
  res.json({ success: true });
});

// POST /auth/admin-reset
router.post('/admin-reset', adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await db.one('SELECT * FROM users WHERE id=$1', [userId]);
    if (!user)        return res.status(404).json({ error: 'User not found' });
    if (!user.email)  return res.status(400).json({ error: 'User has no email address' });
    const token   = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.none('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3', [token, expires, user.id]);
    await sendResetEmail(user.email, user.username, token);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /auth/preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  const prefs = await db.one('SELECT * FROM user_preferences WHERE user_id=$1', [req.user.id]);
  res.json(prefs || {});
});

// PUT /auth/preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const { theme_color, bg_color, accent_color, sidebar_color, font_style, display_name } = req.body;
    await db.none(`
      INSERT INTO user_preferences (user_id,theme_color,bg_color,accent_color,sidebar_color,font_style,display_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (user_id) DO UPDATE SET
        theme_color=EXCLUDED.theme_color, bg_color=EXCLUDED.bg_color,
        accent_color=EXCLUDED.accent_color, sidebar_color=EXCLUDED.sidebar_color,
        font_style=EXCLUDED.font_style, display_name=EXCLUDED.display_name
    `, [req.user.id, theme_color||'#2D6A4F', bg_color||'#F7F5F0', accent_color||'#F4A261', sidebar_color||'#FFFFFF', font_style||'default', display_name||'']);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /auth/change-password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    const user = await db.one('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!bcrypt.compareSync(currentPassword, user.password_hash))
      return res.status(401).json({ error: 'Current password is incorrect' });
    await db.none('UPDATE users SET password_hash=$1 WHERE id=$2', [bcrypt.hashSync(newPassword, 10), req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /auth/state
router.put('/state', authMiddleware, async (req, res) => {
  const { state } = req.body;
  await db.none('UPDATE users SET state=$1 WHERE id=$2', [state, req.user.id]);
  res.json({ success: true });
});

// POST /auth/forgot-password
router.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await db.one('SELECT * FROM users WHERE email=$1', [email]);
    if (!user) return res.json({ success: true }); // Don't reveal whether email exists
    const token   = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.none('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3', [token, expires, user.id]);
    await sendResetEmail(user.email, user.username, token);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /auth/reset-password
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and password required' });
    if (newPassword.length < 6)  return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = await db.one(
      "SELECT * FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()",
      [token]
    );
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link.' });
    await db.none('UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
      [bcrypt.hashSync(newPassword, 10), user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
