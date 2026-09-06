const { Pool } = require('pg');
const env = require('./env');

const connectionString = env.databaseUrl || 'postgresql://postgres:1234@localhost:5432/dundu';

const pool = new Pool({
  connectionString,
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
