// index.js

require('dotenv').config();

const logger = require('./src/utils/logger');
const { initialize, shutdown } = require('./src/main');

logger.info('Starting application...');
logger.info('Environment:', process.env.NODE_ENV);
logger.info('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set');
logger.info('ADMIN_BOT_TOKEN:', process.env.ADMIN_BOT_TOKEN ? 'Set' : 'Not set');

initialize().catch((error) => {
  logger.error('Unhandled error during initialization:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Здесь можно добавить дополнительную логику обработки ошибок
});

process.once('SIGINT', () => {
  logger.info('SIGINT signal received. Shutting down gracefully...');
  shutdown().then(() => process.exit(0));
});

process.once('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully...');
  shutdown().then(() => process.exit(0));
});