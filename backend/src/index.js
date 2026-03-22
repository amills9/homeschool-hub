const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3001;

initializeDatabase();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/children',   require('./routes/children'));
app.use('/api/tasks',      require('./routes/tasks'));
app.use('/api/resources',  require('./routes/resources'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/curriculum', require('./routes/curriculum'));
app.use('/api/photos',     require('./routes/photos'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`🚀 Homeschool Hub running on port ${PORT}`);
});
