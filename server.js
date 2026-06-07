require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/api', require('./src/routes'));

// Catch-all route to serve the frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and start server
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`\n💼 PayPulse — Compensation Intelligence System running at http://localhost:${PORT}`);
      console.log('   Serving frontend from /public');
      console.log('   Serving database from /src/data/comp_intel.db\n');
    });
  } catch (err) {
    console.error('Fatal: Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
