require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[pg] unexpected error on idle client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
