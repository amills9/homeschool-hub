const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const children = db.prepare('SELECT * FROM children ORDER BY name').all();
  res.json(children);
});

router.post('/', adminMiddleware, (req, res) => {
  const { name, year_level, avatar_color } = req.body;
  if (!name || !year_level) return res.status(400).json({ error: 'Name and year level required' });
  const id = uuidv4();
  db.prepare('INSERT INTO children (id, name, year_level, avatar_color) VALUES (?, ?, ?, ?)').run(id, name, year_level, avatar_color || '#6C63FF');
  res.json(db.prepare('SELECT * FROM children WHERE id = ?').get(id));
});

router.put('/:id', adminMiddleware, (req, res) => {
  const { name, year_level, avatar_color } = req.body;
  db.prepare('UPDATE children SET name = ?, year_level = ?, avatar_color = ? WHERE id = ?').run(name, year_level, avatar_color, req.params.id);
  res.json(db.prepare('SELECT * FROM children WHERE id = ?').get(req.params.id));
});

router.delete('/:id', adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM children WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Subjects
router.get('/:id/subjects', authMiddleware, (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects WHERE child_id = ?').all(req.params.id);
  res.json(subjects);
});

router.post('/:id/subjects', authMiddleware, (req, res) => {
  const { name, color, icon, target_hours_per_week } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO subjects (id, child_id, name, color, icon, target_hours_per_week) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.params.id, name, color || '#6C63FF', icon || '📚', target_hours_per_week || 5);
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(id));
});

router.put('/:childId/subjects/:id', authMiddleware, (req, res) => {
  const { name, color, icon, target_hours_per_week } = req.body;
  db.prepare('UPDATE subjects SET name = ?, color = ?, icon = ?, target_hours_per_week = ? WHERE id = ?').run(name, color, icon, target_hours_per_week, req.params.id);
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id));
});

router.delete('/:childId/subjects/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Learning Outcomes
router.get('/:id/outcomes', authMiddleware, (req, res) => {
  const outcomes = db.prepare(`
    SELECT lo.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon
    FROM learning_outcomes lo
    LEFT JOIN subjects s ON lo.subject_id = s.id
    WHERE lo.child_id = ?
    ORDER BY lo.created_at DESC
  `).all(req.params.id);
  res.json(outcomes);
});

router.post('/:id/outcomes', authMiddleware, (req, res) => {
  const { title, description, subject_id, target_date } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO learning_outcomes (id, child_id, subject_id, title, description, target_date) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.params.id, subject_id || null, title, description || '', target_date || null);
  res.json(db.prepare('SELECT * FROM learning_outcomes WHERE id = ?').get(id));
});

router.put('/:childId/outcomes/:id', authMiddleware, (req, res) => {
  const { title, description, achieved, target_date } = req.body;
  const achieved_date = achieved ? new Date().toISOString().split('T')[0] : null;
  db.prepare('UPDATE learning_outcomes SET title = ?, description = ?, achieved = ?, achieved_date = ?, target_date = ? WHERE id = ?').run(title, description, achieved ? 1 : 0, achieved_date, target_date, req.params.id);
  res.json(db.prepare('SELECT * FROM learning_outcomes WHERE id = ?').get(req.params.id));
});

router.delete('/:childId/outcomes/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM learning_outcomes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
