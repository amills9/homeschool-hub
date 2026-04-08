// ============================================================
// HOMESCHOOL HUB — Backend Entry Point (v3.1.0)
// Node.js / Express — connects to PostgreSQL container
// ============================================================
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initializeDatabase } = require('./db/init');

const app  = express();
const PORT = process.env.PORT || 3001;

// Initialise PostgreSQL and run schema
initializeDatabase().then(() => {
  app.listen(PORT, () => console.log(`Homeschool Hub v3.5.0 on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiting
const { apiLimiter } = require('./middleware/rateLimiter');
app.use('/api/', apiLimiter);

// API routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/children',   require('./routes/children'));
app.use('/api/tasks',      require('./routes/tasks'));
app.use('/api/resources',  require('./routes/resources'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/curriculum', require('./routes/curriculum'));
app.use('/api/photos',     require('./routes/photos'));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', version: '3.5.0', time: new Date().toISOString() })
);
