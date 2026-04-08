// ============================================================
// HOMESCHOOL HUB — Children Route (PostgreSQL)
// ============================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

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

async function seedDefaultSubjects(childId) {
  for (const s of DEFAULT_SUBJECTS) {
    await db.none(
      'INSERT INTO subjects (id,child_id,name,color,icon,target_hours_per_week) VALUES ($1,$2,$3,$4,$5,$6)',
      [uuidv4(), childId, s.name, s.color, s.icon, 5]
    );
  }
}

// GET /children
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = req.user.role === 'admin'
      ? await db.query('SELECT * FROM children ORDER BY name')
      : await db.query('SELECT * FROM children WHERE user_id=$1 OR user_id IS NULL ORDER BY name', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /children
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, year_level, avatar_color, user_id } = req.body;
    if (!name || !year_level) return res.status(400).json({ error: 'Name and year level required' });
    const ownerId = req.user.role === 'admin' ? (user_id || req.user.id) : req.user.id;
    const id = uuidv4();
    await db.none(
      'INSERT INTO children (id,user_id,name,year_level,avatar_color) VALUES ($1,$2,$3,$4,$5)',
      [id, ownerId, name, year_level, avatar_color || '#6C63FF']
    );
    await seedDefaultSubjects(id);
    res.json(await db.one('SELECT * FROM children WHERE id=$1', [id]));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /children/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, year_level, avatar_color } = req.body;
    await db.none('UPDATE children SET name=$1,year_level=$2,avatar_color=$3 WHERE id=$4',
      [name, year_level, avatar_color, req.params.id]);
    res.json(await db.one('SELECT * FROM children WHERE id=$1', [req.params.id]));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /children/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  await db.none('DELETE FROM children WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// GET /children/:id/subjects
router.get('/:id/subjects', authMiddleware, async (req, res) => {
  res.json(await db.query('SELECT * FROM subjects WHERE child_id=$1 ORDER BY name', [req.params.id]));
});

// POST /children/:id/subjects
router.post('/:id/subjects', authMiddleware, async (req, res) => {
  try {
    const { name, color, icon, target_hours_per_week } = req.body;
    const id = uuidv4();
    await db.none('INSERT INTO subjects (id,child_id,name,color,icon,target_hours_per_week) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, req.params.id, name, color||'#6C63FF', icon||'📚', target_hours_per_week||5]);
    res.json(await db.one('SELECT * FROM subjects WHERE id=$1', [id]));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /children/:childId/subjects/:id
router.put('/:childId/subjects/:id', authMiddleware, async (req, res) => {
  try {
    const { name, color, icon, target_hours_per_week } = req.body;
    await db.none('UPDATE subjects SET name=$1,color=$2,icon=$3,target_hours_per_week=$4 WHERE id=$5',
      [name, color, icon, target_hours_per_week, req.params.id]);
    res.json(await db.one('SELECT * FROM subjects WHERE id=$1', [req.params.id]));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /children/:childId/subjects/:id
router.delete('/:childId/subjects/:id', authMiddleware, async (req, res) => {
  await db.none('DELETE FROM subjects WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// GET /children/:id/outcomes
router.get('/:id/outcomes', authMiddleware, async (req, res) => {
  const rows = await db.query(`
    SELECT lo.*, s.name AS subject_name, s.color AS subject_color, s.icon AS subject_icon
    FROM learning_outcomes lo
    LEFT JOIN subjects s ON lo.subject_id = s.id
    WHERE lo.child_id = $1
    ORDER BY lo.created_at DESC
  `, [req.params.id]);
  res.json(rows);
});

// POST /children/:id/outcomes
router.post('/:id/outcomes', authMiddleware, async (req, res) => {
  try {
    const { title, description, subject_id, target_date } = req.body;
    const id = uuidv4();
    await db.none(
      'INSERT INTO learning_outcomes (id,child_id,subject_id,title,description,target_date) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, req.params.id, subject_id||null, title, description||'', target_date||null]
    );
    res.json(await db.one('SELECT * FROM learning_outcomes WHERE id=$1', [id]));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /children/:childId/outcomes/:id
router.put('/:childId/outcomes/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, achieved, target_date } = req.body;
    const achieved_date = achieved ? new Date().toISOString().split('T')[0] : null;
    await db.none(
      'UPDATE learning_outcomes SET title=$1,description=$2,achieved=$3,achieved_date=$4,target_date=$5 WHERE id=$6',
      [title, description, achieved?1:0, achieved_date, target_date, req.params.id]
    );
    res.json(await db.one('SELECT * FROM learning_outcomes WHERE id=$1', [req.params.id]));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /children/:childId/outcomes/:id
router.delete('/:childId/outcomes/:id', authMiddleware, async (req, res) => {
  await db.none('DELETE FROM learning_outcomes WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
