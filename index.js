// index.js

const userBot = require('./src/app/userBot');
const adminBot = require('./src/app/adminBot');
const { Bot } = require('grammy');
const logger = require('./src/utils/logger');
const config = require('./src/config');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot server is running');
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

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


async function startBot(bot, name) {
  return new Promise((resolve, reject) => {
    bot.start({
      onStart: (botInfo) => {
        logger.info(`${name} @${botInfo.username} started`);
        resolve();
      },
    }).catch(reject);
  });
}


async function startBots() {
  console.log('Inside startBots function');
  const userBotTokenValid = await checkBotToken(config.userBotToken, 'User Bot');
  const adminBotTokenValid = await checkBotToken(config.adminBotToken, 'Admin Bot');
  console.log('tokens valid');
  if (!userBotTokenValid || !adminBotTokenValid) {
    console.error('One or more bot tokens are invalid. Please check your configuration.');
    process.exit(1);
  }

  try {
    await startBot(userBot, 'User Bot');
    await startBot(adminBot, 'Admin Bot');
    console.log('All bots started successfully');
  } catch (error) {
    console.error('Error starting bots:', error);
    process.exit(1);
  }
}

async function ensureTempDir() {
  const tempDir = process.env.TEMP_DIR || path.join(__dirname, 'temp');
  try {
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`Temporary directory ensured at ${tempDir}`);
  } catch (error) {
    console.error(`Error creating temp directory: ${error}`);
  }
}

ensureTempDir();

console.log('Calling startBots function');
startBots().then(() => {
  console.log('startBots completed');
}).catch((error) => {
  console.error('Error in startBots:', error);
});

console.log('End of main script');

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
