// index.js

console.log('Starting application...');
console.log('Importing dependencies...');
const userBot = require('./src/app/userBot');
console.log('userBot imported');
const adminBot = require('./src/app/adminBot');
console.log('adminBot imported');
const logger = require('./src/utils/logger');
console.log('logger imported');

console.log('Starting bots...');

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startBot(bot, name) {
  console.log(`Starting ${name}...`);
  try {
    await bot.start();
    console.log(`${name} started successfully`);
  } catch (error) {
    console.error(`Error starting ${name}:`, error);
    throw error; // Перебрасываем ошибку, чтобы она была обработана выше
  }
}

async function startBots() {
  try {
    logger.info('Starting user bot...');
    await startBot(userBot, 'User bot');
    
    logger.info('Starting admin bot...');
    await startBot(adminBot, 'Admin bot');
    
    logger.info('All bots started successfully');
  } catch (error) {
    logger.error('Error starting bots:', error);
    process.exit(1);
  }
}

startBots().catch((error) => {
  logger.error('Unhandled error during bot startup:', error);
  process.exit(1);
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
const SHUTDOWN_TIMEOUT = 5000; // 5 секунд

async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully.`);
  const shutdownPromise = Promise.all([
    userBot.stop(),
    adminBot.stop()
  ]);

  try {
    await Promise.race([
      shutdownPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timed out')), SHUTDOWN_TIMEOUT))
    ]);
    logger.info('All bots stopped successfully');
  } catch (error) {
    logger.error('Error or timeout during shutdown:', error);
  } finally {
    process.exit(0);
  }
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
