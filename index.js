// index.js

const { bot: userBot, init: initUserBot } = require('./src/app/userBot');
const { bot: adminBot, init: initAdminBot } = require('./src/app/adminBot');
const logger = require('./src/utils/logger');

console.log('Starting bots...');

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


async function startBot(bot, init, name) {
  console.log(`Starting ${name}...`);
  try {
    console.log(`Initializing ${name}...`);
    await init();
    console.log(`${name} initialized`);
    
    console.log(`Starting ${name}...`);
    await bot.start();
    console.log(`${name} started successfully`);
  } catch (error) {
    console.error(`Error starting ${name}:`, error);
    throw error;
  }
}

async function startBots() {
  try {
    logger.info('Starting user bot...');
    await startBot(userBot, initUserBot, 'User Bot');
    
    logger.info('Starting admin bot...');
    await startBot(adminBot, initAdminBot, 'Admin Bot');
    
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
