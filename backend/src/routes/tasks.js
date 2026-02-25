const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get tasks for a specific week
router.get('/', authMiddleware, (req, res) => {
  const { week_start, child_id } = req.query;
  let query = `
    SELECT t.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon,
           c.name as child_name, c.avatar_color as child_color
    FROM weekly_tasks t
    LEFT JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN children c ON t.child_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (week_start) { query += ' AND t.week_start = ?'; params.push(week_start); }
  if (child_id) { query += ' AND t.child_id = ?'; params.push(child_id); }
  query += ' ORDER BY t.day_of_week, t.created_at';
  res.json(db.prepare(query).all(...params));
});

router.post('/', authMiddleware, (req, res) => {
  const { child_id, subject_id, title, description, day_of_week, week_start, is_recurring, duration_minutes, resources } = req.body;
  if (!child_id || !title || !day_of_week || !week_start) return res.status(400).json({ error: 'Missing required fields' });
  const id = uuidv4();
  db.prepare(`
    INSERT INTO weekly_tasks (id, child_id, subject_id, title, description, day_of_week, week_start, is_recurring, duration_minutes, resources)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, child_id, subject_id || null, title, description || '', day_of_week, week_start, is_recurring ? 1 : 0, duration_minutes || 60, JSON.stringify(resources || []));
  res.json(db.prepare('SELECT * FROM weekly_tasks WHERE id = ?').get(id));
});

router.put('/:id', authMiddleware, (req, res) => {
  const { title, description, is_completed, day_of_week, duration_minutes, resources, subject_id, is_recurring } = req.body;
  db.prepare(`
    UPDATE weekly_tasks SET title = ?, description = ?, is_completed = ?, day_of_week = ?, duration_minutes = ?, resources = ?, subject_id = ?, is_recurring = ?
    WHERE id = ?
  `).run(title, description, is_completed ? 1 : 0, day_of_week, duration_minutes, JSON.stringify(resources || []), subject_id || null, is_recurring ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM weekly_tasks WHERE id = ?').get(req.params.id));
});

router.patch('/:id/complete', authMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM weekly_tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  db.prepare('UPDATE weekly_tasks SET is_completed = ? WHERE id = ?').run(task.is_completed ? 0 : 1, req.params.id);
  res.json({ success: true, is_completed: !task.is_completed });
});

router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM weekly_tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Copy recurring tasks to new week
router.post('/copy-recurring', authMiddleware, (req, res) => {
  const { from_week, to_week } = req.body;
  const recurring = db.prepare('SELECT * FROM weekly_tasks WHERE week_start = ? AND is_recurring = 1').all(from_week);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO weekly_tasks (id, child_id, subject_id, title, description, day_of_week, week_start, is_recurring, duration_minutes, resources)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const copyMany = db.transaction((tasks) => {
    for (const t of tasks) {
      insert.run(uuidv4(), t.child_id, t.subject_id, t.title, t.description, t.day_of_week, to_week, 1, t.duration_minutes, t.resources);
    }
  });
  copyMany(recurring);
  res.json({ copied: recurring.length });
});

module.exports = router;
