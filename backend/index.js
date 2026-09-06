require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const env = require('./src/config/env');
const passport = require('./src/config/passport');
const db = require('./src/config/db');
const initDb = require('./src/database/initDb');
const { globalError } = require('./src/middleware/error/error.middleware');

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

const fs = require('fs');
const uploadDirPath = path.join(__dirname, env.upload.dir);
if (!fs.existsSync(uploadDirPath)) {
  fs.mkdirSync(uploadDirPath, { recursive: true });
}
app.use('/uploads', express.static(uploadDirPath));

// Register API v1 routes
app.use('/api', require('./src/routes/index'));

// System Health Check
app.get('/health', (_req, res) => res.json({ status: 'ok', environment: env.nodeEnv }));

// Global error handler middleware
app.use(globalError);

// Bootstrap Database & Start Server
async function startServer() {
  try {
    // 1. Verify DB connection
    await db.query('SELECT 1');
    console.log('✓ Database connected');

    // 2. Run runtime idempotent schema migrations
    await initDb();

    // 3. Start Express server listener
    app.listen(env.port, '0.0.0.0', () => {
      console.log(`✓ Dundu API server running on port ${env.port}`);
    });
  } catch (err) {
    console.error('✗ Database connection/initialization failed:', err.message);
    process.exit(1);
  }
}

startServer();
