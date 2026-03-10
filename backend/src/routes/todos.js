const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /todos/:childId
router.get('/:childId', authMiddleware, (req, res) => {
  const todos = db.prepare(
    'SELECT * FROM todos WHERE child_id = ? ORDER BY created_at ASC'
  ).all(req.params.childId);
  res.json(todos);
});

// POST /todos
router.post('/', authMiddleware, (req, res) => {
  const { child_id, text } = req.body;
  if (!child_id || !text?.trim()) return res.status(400).json({ error: 'child_id and text required' });
  const id = uuidv4();
  db.prepare('INSERT INTO todos (id, child_id, text, is_done) VALUES (?, ?, ?, 0)').run(id, child_id, text.trim());
  res.json({ id, child_id, text: text.trim(), is_done: 0 });
});

// PUT /todos/:id
router.put('/:id', authMiddleware, (req, res) => {
  const { is_done, text } = req.body;
  if (is_done !== undefined) db.prepare('UPDATE todos SET is_done = ? WHERE id = ?').run(is_done ? 1 : 0, req.params.id);
  if (text !== undefined) db.prepare('UPDATE todos SET text = ? WHERE id = ?').run(text, req.params.id);
  res.json({ success: true });
});

// DELETE /todos/:id
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// DELETE /todos/:childId/done — clear all completed
router.delete('/:childId/done', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM todos WHERE child_id = ? AND is_done = 1').run(req.params.childId);
  res.json({ success: true });
});

module.exports = router;
