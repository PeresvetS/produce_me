// index.js

console.log('Starting application...');
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set');
console.log('ADMIN_BOT_TOKEN:', process.env.ADMIN_BOT_TOKEN ? 'Set' : 'Not set');

const { runMigrations } = require('./src/db/migrations');
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const userBot = require('./src/app/userBot');
const adminBot = require('./src/app/adminBot');
const logger = require('./src/utils/logger');
const vectorSearchService = require('./src/services/vectorSearchService');
const longTermMemoryService = require('./src/services/longTermMemoryService');
const config = require('./src/config/config');

async function initDatabase() {
  const pool = new Pool({
    user: config.postgresUser,
    host: config.postgresHost,
    database: config.postgresDatabase,
    password: config.postgresPassword,
    port: config.postgresPort,
  });

  try {
    logger.info('Running database migrations...');
    await runMigrations();
    logger.info('Database migrations completed successfully');
    const initSql = await fs.readFile(path.join(__dirname, 'src', 'db', 'init.sql'), 'utf8');
    await pool.query(initSql);
    logger.info('Database initialized successfully');

    userBot.launch().then(() => {
      logger.info('User bot started');
    }).catch((error) => {
      logger.error('Error starting user bot:', error);
    });
    adminBot.launch().then(() => {
      logger.info('Admin bot started');
    }).catch((error) => {
      logger.error('Error starting admin bot:', error);
    });
    
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function initialize() {
  try {
    await initDatabase();
    await vectorSearchService.initialize();
    await longTermMemoryService.initialize();

    userBot.launch().then(() => {
      logger.info('User bot started');
    }).catch((error) => {
      logger.error('Error starting user bot:', error);
    });

    adminBot.launch().then(() => {
      logger.info('Admin bot started');
    }).catch((error) => {
      logger.error('Error starting admin bot:', error);
    });
  } catch (error) {
    logger.error('Error initializing services:', error);
    process.exit(1);
  }
}

initialize();

process.once('SIGINT', () => {
  userBot.stop('SIGINT');
  adminBot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  userBot.stop('SIGTERM');
  adminBot.stop('SIGTERM');
});