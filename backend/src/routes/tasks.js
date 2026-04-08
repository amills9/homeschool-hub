// ============================================================
// HOMESCHOOL HUB — Tasks Route (PostgreSQL)
// ============================================================
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { week_start, child_id } = req.query;

    const accessibleIds = req.user.role === 'admin'
      ? (await db.query('SELECT id FROM children')).map(c => c.id)
      : (await db.query('SELECT id FROM children WHERE user_id=$1', [req.user.id])).map(c => c.id);

    if (accessibleIds.length === 0) return res.json([]);
    if (child_id && !accessibleIds.includes(child_id))
      return res.status(403).json({ error: 'Not authorised' });

    const targetIds   = child_id ? [child_id] : accessibleIds;
    const placeholders = targetIds.map((_, i) => `$${i + 1}`).join(',');

    const params = [...targetIds];
    let q = `
      SELECT t.*,
        s.name AS subject_name, s.color AS subject_color, s.icon AS subject_icon,
        c.name AS child_name, c.avatar_color AS child_color,
        r.title AS resource_title, r.type AS resource_type, r.url AS resource_url
      FROM weekly_tasks t
      LEFT JOIN subjects  s ON t.subject_id  = s.id
      LEFT JOIN children  c ON t.child_id    = c.id
      LEFT JOIN resources r ON t.resource_id = r.id
      WHERE t.child_id IN (${placeholders})
    `;

    if (week_start) { params.push(week_start); q += ` AND t.week_start = $${params.length}`; }
    q += ' ORDER BY t.day_of_week, t.sort_order, t.created_at';

    res.json(await db.query(q, params));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /tasks
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { child_id, subject_id, resource_id, curriculum_outcome_id,
            title, description, day_of_week, week_start,
            is_recurring, duration_minutes, resources } = req.body;
    const id = uuidv4();
    await db.none(`
      INSERT INTO weekly_tasks
        (id,child_id,subject_id,resource_id,curriculum_outcome_id,title,description,
         day_of_week,week_start,is_recurring,duration_minutes,resources)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [id, child_id, subject_id||null, resource_id||null, curriculum_outcome_id||null,
        title, description||'', day_of_week, week_start,
        is_recurring?1:0, duration_minutes||60, JSON.stringify(resources||[])]);
    res.json(await db.one('SELECT * FROM weekly_tasks WHERE id=$1', [id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /tasks/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, is_completed, day_of_week, duration_minutes,
            resources, subject_id, resource_id, curriculum_outcome_id, is_recurring } = req.body;
    await db.none(`
      UPDATE weekly_tasks SET
        title=$1, description=$2, is_completed=$3, day_of_week=$4,
        duration_minutes=$5, resources=$6, subject_id=$7,
        resource_id=$8, curriculum_outcome_id=$9, is_recurring=$10
      WHERE id=$11
    `, [title, description||'', is_completed?1:0, day_of_week,
        duration_minutes||60, JSON.stringify(resources||[]),
        subject_id||null, resource_id||null, curriculum_outcome_id||null,
        is_recurring?1:0, req.params.id]);
    res.json(await db.one('SELECT * FROM weekly_tasks WHERE id=$1', [req.params.id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /tasks/:id/complete
router.patch('/:id/complete', authMiddleware, async (req, res) => {
  await db.none(
    'UPDATE weekly_tasks SET is_completed = CASE WHEN is_completed=1 THEN 0 ELSE 1 END WHERE id=$1',
    [req.params.id]
  );
  res.json({ success: true });
});

// DELETE /tasks/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  await db.none('DELETE FROM weekly_tasks WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// POST /tasks/copy-recurring
router.post('/copy-recurring', authMiddleware, async (req, res) => {
  try {
    const { from_week, to_week } = req.body;
    const recurring = await db.query(
      'SELECT * FROM weekly_tasks WHERE week_start=$1 AND is_recurring=1',
      [from_week]
    );
    for (const task of recurring) {
      const exists = await db.one(
        'SELECT id FROM weekly_tasks WHERE child_id=$1 AND title=$2 AND day_of_week=$3 AND week_start=$4',
        [task.child_id, task.title, task.day_of_week, to_week]
      );
      if (!exists) {
        await db.none(`
          INSERT INTO weekly_tasks
            (id,child_id,subject_id,resource_id,curriculum_outcome_id,title,description,
             day_of_week,week_start,is_recurring,duration_minutes,resources)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `, [uuidv4(), task.child_id, task.subject_id, task.resource_id,
            task.curriculum_outcome_id, task.title, task.description||'',
            task.day_of_week, to_week, 1, task.duration_minutes||60,
            task.resources||'[]']);
      }
    }
    res.json({ success: true, copied: recurring.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /tasks/reorder — drag-drop sort order
router.patch('/reorder', authMiddleware, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0)
      return res.status(400).json({ error: 'updates array required' });
    await db.transaction(async (client) => {
      for (const u of updates) {
        await client.query(
          'UPDATE weekly_tasks SET day_of_week=$1, sort_order=$2 WHERE id=$3',
          [u.day_of_week, u.sort_order, u.id]
        );
      }
    });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
