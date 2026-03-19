// Run once: node add-default-subjects.js
// Adds the 8 default Australian curriculum subjects to any child that doesn't already have them

const path = require('path');
process.env.DB_PATH = path.join(__dirname, 'data/homeschool.db');

const { db } = require('./backend/src/db/init');
const { v4: uuidv4 } = require('uuid');

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

const children = db.prepare('SELECT * FROM children ORDER BY name').all();
console.log(`Found ${children.length} children in database\n`);

const insert = db.prepare(
  'INSERT INTO subjects (id, child_id, name, color, icon, target_hours_per_week) VALUES (?, ?, ?, ?, ?, ?)'
);

let totalAdded = 0;

for (const child of children) {
  const existing = db.prepare('SELECT name FROM subjects WHERE child_id = ?').all(child.id).map(s => s.name);
  const toAdd = DEFAULT_SUBJECTS.filter(s => !existing.includes(s.name));

  if (toAdd.length === 0) {
    console.log(`✓ ${child.name} — already has all subjects`);
    continue;
  }

  const addMany = db.transaction(() => {
    for (const s of toAdd) {
      insert.run(uuidv4(), child.id, s.name, s.color, s.icon, 5);
    }
  });
  addMany();

  console.log(`✓ ${child.name} — added: ${toAdd.map(s => s.name).join(', ')}`);
  totalAdded += toAdd.length;
}

console.log(`\nDone! Added ${totalAdded} subjects across ${children.length} children.`);
