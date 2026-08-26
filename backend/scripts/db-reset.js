// Cross-platform DB reset (works on Windows / macOS / Linux).
// Loads DATABASE_URL from .env, executes schema.sql + seed.sql via the pg client.
//
//   npm run db:reset

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  const seedSql   = fs.readFileSync(path.join(__dirname, '..', 'sql', 'seed.sql'),   'utf8');

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    console.log('> Loading schema.sql …');
    await client.query(schemaSql);

    console.log('> Loading seed.sql …');
    await client.query(seedSql);

    const meals  = await client.query('SELECT COUNT(*)::int AS n FROM meals');
    const supps  = await client.query('SELECT COUNT(*)::int AS n FROM supplements');
    console.log(`✓ Done. meals=${meals.rows[0].n}  supplements=${supps.rows[0].n}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('DB reset failed:', err.message);
  process.exit(1);
});
