const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const { child_id, subject_id } = req.query;
  let query = `SELECT r.*, s.name as subject_name, c.name as child_name FROM resources r
    LEFT JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN children c ON r.child_id = c.id WHERE 1=1`;
  const params = [];
  if (child_id) { query += ' AND r.child_id = ?'; params.push(child_id); }
  if (subject_id) { query += ' AND r.subject_id = ?'; params.push(subject_id); }
  query += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', authMiddleware, (req, res) => {
  const { child_id, subject_id, title, type, url, notes } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO resources (id, child_id, subject_id, title, type, url, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, child_id || null, subject_id || null, title, type || 'link', url || '', notes || '');
  res.json(db.prepare('SELECT * FROM resources WHERE id = ?').get(id));
});

router.put('/:id', authMiddleware, (req, res) => {
  const { child_id, subject_id, title, type, url, notes } = req.body;
  db.prepare('UPDATE resources SET child_id=?, subject_id=?, title=?, type=?, url=?, notes=? WHERE id=?')
    .run(child_id || null, subject_id || null, title, type || 'link', url || '', notes || '', req.params.id);
  res.json(db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
