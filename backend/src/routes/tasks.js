const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function getAccessibleChildIds(req) {
  if (req.user.role === 'admin') {
    return db.prepare('SELECT id FROM children').all().map(c => c.id);
  }
  return db.prepare('SELECT id FROM children WHERE user_id = ?').all(req.user.id).map(c => c.id);
}

// GET /tasks
router.get('/', authMiddleware, (req, res) => {
  const { week_start, child_id } = req.query;
  const accessibleIds = getAccessibleChildIds(req);
  if (accessibleIds.length === 0) return res.json([]);
  if (child_id && !accessibleIds.includes(child_id)) return res.status(403).json({ error: 'Not authorised' });

  const targetIds = child_id ? [child_id] : accessibleIds;
  const placeholders = targetIds.map(() => '?').join(',');

  let query = `
    SELECT t.*,
      s.name as subject_name, s.color as subject_color, s.icon as subject_icon,
      c.name as child_name, c.avatar_color as child_color,
      r.title as resource_title, r.type as resource_type, r.url as resource_url
    FROM weekly_tasks t
    LEFT JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN children c ON t.child_id = c.id
    LEFT JOIN resources r ON t.resource_id = r.id
    WHERE t.child_id IN (${placeholders})
  `;
  const params = [...targetIds];
  if (week_start) { query += ' AND t.week_start = ?'; params.push(week_start); }
  query += ' ORDER BY t.day_of_week, t.created_at';
  res.json(db.prepare(query).all(...params));
});

// POST /tasks
router.post('/', authMiddleware, (req, res) => {
  const { child_id, subject_id, resource_id, title, description, day_of_week, week_start, is_recurring, duration_minutes } = req.body;
  if (!child_id || !title || !day_of_week || !week_start) return res.status(400).json({ error: 'Missing required fields' });

  const accessibleIds = getAccessibleChildIds(req);
  if (!accessibleIds.includes(child_id)) return res.status(403).json({ error: 'Not authorised' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO weekly_tasks (id, child_id, subject_id, resource_id, title, description, day_of_week, week_start, is_recurring, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, child_id, subject_id || null, resource_id || null, title, description || '', day_of_week, week_start, is_recurring ? 1 : 0, duration_minutes || 60);
  res.json(db.prepare('SELECT * FROM weekly_tasks WHERE id = ?').get(id));
});

// PUT /tasks/:id
router.put('/:id', authMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM weekly_tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const accessibleIds = getAccessibleChildIds(req);
  if (!accessibleIds.includes(task.child_id)) return res.status(403).json({ error: 'Not authorised' });

  const { title, description, is_completed, day_of_week, duration_minutes, subject_id, resource_id, is_recurring } = req.body;
  db.prepare(`
    UPDATE weekly_tasks SET title=?, description=?, is_completed=?, day_of_week=?,
    duration_minutes=?, subject_id=?, resource_id=?, is_recurring=? WHERE id=?
  `).run(title, description, is_completed ? 1 : 0, day_of_week, duration_minutes, subject_id || null, resource_id || null, is_recurring ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM weekly_tasks WHERE id = ?').get(req.params.id));
});

// PATCH /tasks/:id/complete
router.patch('/:id/complete', authMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM weekly_tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const accessibleIds = getAccessibleChildIds(req);
  if (!accessibleIds.includes(task.child_id)) return res.status(403).json({ error: 'Not authorised' });
  db.prepare('UPDATE weekly_tasks SET is_completed = ? WHERE id = ?').run(task.is_completed ? 0 : 1, req.params.id);
  res.json({ success: true, is_completed: !task.is_completed });
});

// DELETE /tasks/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const task = db.prepare('SELECT * FROM weekly_tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const accessibleIds = getAccessibleChildIds(req);
  if (!accessibleIds.includes(task.child_id)) return res.status(403).json({ error: 'Not authorised' });
  db.prepare('DELETE FROM weekly_tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /tasks/copy-recurring
router.post('/copy-recurring', authMiddleware, (req, res) => {
  const { from_week, to_week } = req.body;
  const accessibleIds = getAccessibleChildIds(req);
  if (accessibleIds.length === 0) return res.json({ copied: 0 });
  const placeholders = accessibleIds.map(() => '?').join(',');
  const recurring = db.prepare(`
    SELECT * FROM weekly_tasks WHERE week_start = ? AND is_recurring = 1 AND child_id IN (${placeholders})
  `).all(from_week, ...accessibleIds);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO weekly_tasks (id, child_id, subject_id, resource_id, title, description, day_of_week, week_start, is_recurring, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction(tasks => tasks.forEach(t =>
    insert.run(uuidv4(), t.child_id, t.subject_id, t.resource_id, t.title, t.description, t.day_of_week, to_week, 1, t.duration_minutes)
  ))(recurring);
  res.json({ copied: recurring.length });
});

module.exports = router;
