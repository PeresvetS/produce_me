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

async function checkBotToken(token, botName) {
  try {
    const bot = new Bot(token);
    const me = await bot.api.getMe();
    console.log(`${botName} token is valid. Bot username: @${me.username}`);
    return true;
  } catch (error) {
    console.error(`Error checking ${botName} token:`, error);
    return false;
  }
}


async function startBot(bot, init, name) {
  console.log(`Starting ${name}...`);
  try {
    console.log(`Initializing ${name}...`);
    await init();
    console.log(`${name} initialized`);
    
    console.log(`Starting ${name}...`);
    await bot.start({
      onStart: (botInfo) => {
        console.log(`${name} @${botInfo.username} started successfully`);
      },
    });
  } catch (error) {
    console.error(`Error starting ${name}:`, error);
    // Не выбрасываем ошибку, чтобы продолжить запуск других ботов
  }
}


async function startBots() {
  const userBotTokenValid = await checkBotToken(config.userBotToken, 'User Bot');
  const adminBotTokenValid = await checkBotToken(config.adminBotToken, 'Admin Bot');

  if (!userBotTokenValid || !adminBotTokenValid) {
    console.error('One or more bot tokens are invalid. Please check your configuration.');
    process.exit(1);
  }

  try {
    await startBot(userBot, initUserBot, 'User Bot');
    await startBot(adminBot, initAdminBot, 'Admin Bot');
    console.log('All bots started successfully');
  } catch (error) {
    console.error('Error starting bots:', error);
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
