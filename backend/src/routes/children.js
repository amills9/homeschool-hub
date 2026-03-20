const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_SUBJECTS = [
  { name: 'English',       color: '#6C63FF', icon: '📖' },
  { name: 'Mathematics',   color: '#E76F51', icon: '🔢' },
  { name: 'Science',       color: '#2D6A4F', icon: '🔬' },
  { name: 'HSIE',          color: '#219EBC', icon: '🌏' },
  { name: 'PDHPE',         color: '#52B788', icon: '⚽' },
  { name: 'Creative Arts', color: '#F4A261', icon: '🎨' },
  { name: 'Technology',    color: '#8338EC', icon: '💻' },
  { name: 'Languages',     color: '#FB8500', icon: '🗣️' },
];

function seedDefaultSubjects(childId) {
  const insert = db.prepare('INSERT INTO subjects (id, child_id, name, color, icon, target_hours_per_week) VALUES (?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (const s of DEFAULT_SUBJECTS) insert.run(uuidv4(), childId, s.name, s.color, s.icon, 5);
  })();
}

// GET /children — parents see their own OR unowned children (user_id IS NULL = legacy data)
router.get('/', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    return res.json(db.prepare('SELECT * FROM children ORDER BY name').all());
  }
  // Return children owned by this user OR with no owner (legacy rows)
  const children = db.prepare(
    'SELECT * FROM children WHERE user_id = ? OR user_id IS NULL ORDER BY name'
  ).all(req.user.id);
  res.json(children);
});

// POST /children
router.post('/', authMiddleware, (req, res) => {
  const { name, year_level, avatar_color, user_id } = req.body;
  if (!name || !year_level) return res.status(400).json({ error: 'Name and year level required' });
  const ownerId = req.user.role === 'admin' ? (user_id || req.user.id) : req.user.id;
  const id = uuidv4();
  db.prepare('INSERT INTO children (id, user_id, name, year_level, avatar_color) VALUES (?, ?, ?, ?, ?)')
    .run(id, ownerId, name, year_level, avatar_color || '#6C63FF');
  seedDefaultSubjects(id);
  res.json(db.prepare('SELECT * FROM children WHERE id = ?').get(id));
});

// PUT /children/:id
router.put('/:id', authMiddleware, (req, res) => {
  const { name, year_level, avatar_color } = req.body;
  db.prepare('UPDATE children SET name=?, year_level=?, avatar_color=? WHERE id=?')
    .run(name, year_level, avatar_color, req.params.id);
  res.json(db.prepare('SELECT * FROM children WHERE id = ?').get(req.params.id));
});

// DELETE /children/:id
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM children WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /children/:id/subjects — always returns array
router.get('/:id/subjects', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM subjects WHERE child_id = ? ORDER BY name').all(req.params.id) || []);
});

router.post('/:id/subjects', authMiddleware, (req, res) => {
  const { name, color, icon, target_hours_per_week } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO subjects (id, child_id, name, color, icon, target_hours_per_week) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, name, color||'#6C63FF', icon||'📚', target_hours_per_week||5);
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(id));
});

router.put('/:childId/subjects/:id', authMiddleware, (req, res) => {
  const { name, color, icon, target_hours_per_week } = req.body;
  db.prepare('UPDATE subjects SET name=?, color=?, icon=?, target_hours_per_week=? WHERE id=?')
    .run(name, color, icon, target_hours_per_week, req.params.id);
  res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id));
});

router.delete('/:childId/subjects/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Learning Outcomes
router.get('/:id/outcomes', authMiddleware, (req, res) => {
  res.json(db.prepare(`
    SELECT lo.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon
    FROM learning_outcomes lo
    LEFT JOIN subjects s ON lo.subject_id = s.id
    WHERE lo.child_id = ? ORDER BY lo.created_at DESC
  `).all(req.params.id) || []);
});

router.post('/:id/outcomes', authMiddleware, (req, res) => {
  const { title, description, subject_id, target_date } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO learning_outcomes (id, child_id, subject_id, title, description, target_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, subject_id||null, title, description||'', target_date||null);
  res.json(db.prepare('SELECT * FROM learning_outcomes WHERE id = ?').get(id));
});

router.put('/:childId/outcomes/:id', authMiddleware, (req, res) => {
  const { title, description, achieved, target_date } = req.body;
  const achieved_date = achieved ? new Date().toISOString().split('T')[0] : null;
  db.prepare('UPDATE learning_outcomes SET title=?, description=?, achieved=?, achieved_date=?, target_date=? WHERE id=?')
    .run(title, description, achieved?1:0, achieved_date, target_date, req.params.id);
  res.json(db.prepare('SELECT * FROM learning_outcomes WHERE id = ?').get(req.params.id));
});

router.delete('/:childId/outcomes/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM learning_outcomes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
