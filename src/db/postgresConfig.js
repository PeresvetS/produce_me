// src/db/postgresConfig.js

// src/db/postgresConfig.js

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false // Это может потребоваться для Railway
  }
});

module.exports = {
  query: (text, params) => {
    logger.info('Executing query:', text);
    return pool.query(text, params);
  },
  getClient: () => pool.connect(),
};