require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const passport = require('./src/config/passport');
const { globalError } = require('./src/middleware/error');

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    process.env.WEB_CLIENT_URL,
    process.env.ADMIN_CLIENT_URL,
    process.env.SUPER_ADMIN_CLIENT_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

app.use('/api', require('./src/routes/index'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(globalError);

const db = require('./src/config/db');
const PORT = process.env.PORT || 5000;

db.query('SELECT 1')
  .then(() => console.log('✓ Database connected'))
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });

app.listen(PORT, '0.0.0.0', () => console.log(`✓ Dundu API running on port ${PORT}`));
