const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// List users (admin only)
router.get('/users', adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users').all();
  res.json(users);
});

// Create user (admin only)
router.post('/users', adminMiddleware, (req, res) => {
  const { username, password, role = 'parent' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(uuidv4(), username, hash, role);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// Update user password (admin)
router.put('/users/:id', adminMiddleware, (req, res) => {
  const { password, role } = req.body;
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  }
  if (role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  }
  res.json({ success: true });
});

// Delete user (admin)
router.delete('/users/:id', adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ? AND role != "admin"').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
