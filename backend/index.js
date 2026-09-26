require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const env = require('./src/config/env');
const passport = require('./src/config/passport');
const db = require('./src/config/db');
const initDb = require('./src/database/initDb');
const { globalError } = require('./src/middleware/error/error.middleware');
const { apiLimiter } = require('./src/middleware/rateLimit.middleware');

const app = express();

// Trust the first proxy hop (nginx / load balancer) so req.ip and rate limiting see the
// real client address. Adjust TRUST_PROXY if there are more hops.
app.set('trust proxy', parseInt(process.env.TRUST_PROXY || '1', 10));

app.use(helmet());

// In production, never reflect arbitrary origins with credentials. If no client URLs are
// configured, cross-origin browser requests are simply refused.
const corsOrigin = env.corsOrigins.length > 0 ? env.corsOrigins : (env.isProduction ? false : true);
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(passport.initialize());

const uploadDirPath = path.join(__dirname, env.upload.dir);
if (!fs.existsSync(uploadDirPath)) {
  fs.mkdirSync(uploadDirPath, { recursive: true });
}
// Uploaded files are images only (enforced in utils/upload.js); make sure a browser never
// executes anything served from here even if a stray file slips through.
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(uploadDirPath, { index: false, dotfiles: 'deny' }));

// Register API v1 routes
app.use('/api', apiLimiter, require('./src/routes/index'));

// System Health Check
app.get('/health', (_req, res) => res.json({ status: 'ok', environment: env.nodeEnv }));

// JSON 404 for anything under /api that no router claimed (instead of Express's HTML "Cannot GET")
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Anything else (browser typo on the API origin) — small plain page, never leaks internals
app.use((_req, res) => {
  res.status(404).type('html').send(
    '<!doctype html><meta charset="utf-8"><title>404 · Dundu API</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0d;color:#f4f4f5;font-family:system-ui">' +
    '<div style="text-align:center"><p style="font-size:72px;margin:0;color:#e91e8c;font-weight:700">404</p>' +
    '<p style="margin:8px 0 0;color:#8b8b93">This is the Dundu API server. The page you asked for does not exist.</p></div></body>'
  );
});

// Global error handler middleware
app.use(globalError);

// A rejected promise that nobody awaited must not take the whole API down.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

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
      console.log(`✓ Dundu API server running on port ${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    console.error('✗ Database connection/initialization failed:', err.message);
    process.exit(1);
  }
}

startServer();
