const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error conectando a PostgreSQL:', err.stack);
  } else {
    console.log('Conectado a PostgreSQL');
    release();
  }
});

module.exports = pool;