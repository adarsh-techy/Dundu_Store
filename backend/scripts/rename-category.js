require('dotenv').config();
const db = require('../src/config/db');

async function run() {
  const { rows } = await db.query(
    "UPDATE categories SET name='Outfit Combo', slug='outfit-combo' WHERE LOWER(name)='others' RETURNING *"
  );
  if (rows.length) {
    console.log('Renamed:', rows[0]);
  } else {
    console.log('No category named "Others" found. Use the admin panel to create "Outfit Combo" instead.');
  }
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
