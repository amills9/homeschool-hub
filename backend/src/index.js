// ============================================================
// HOMESCHOOL HUB — Backend Entry Point (v2.7.3)
// Node.js / Express API server
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initializeDatabase } = require('./db/init');

const app  = express();
const PORT = process.env.PORT || 3001;

// Initialise SQLite and run any pending migrations
initializeDatabase();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth',       require('./routes/auth'));       // Auth, signup, password reset, preferences
app.use('/api/children',   require('./routes/children'));   // Children, subjects, learning outcomes
app.use('/api/tasks',      require('./routes/tasks'));      // Weekly tasks (per-user isolation)
app.use('/api/resources',  require('./routes/resources'));  // Learning resources (per-user isolation)
app.use('/api/settings',   require('./routes/settings'));   // School name (per-user) + global settings
app.use('/api/curriculum', require('./routes/curriculum')); // Curriculum outcomes by state
app.use('/api/photos',     require('./routes/photos'));     // Photo upload, gallery, delete (Cloudinary)

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', version: '2.7.3', time: new Date().toISOString() })
);

// Serve built frontend in production (nginx handles this in prod, fallback only)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'))
  );
}

app.listen(PORT, () => console.log(`Homeschool Hub v2.7.3 on port ${PORT}`));
