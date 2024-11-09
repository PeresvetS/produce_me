// index.js

const producerBot = require('./src/app/producerBot');
const strategyBot = require('./src/app/strategyBot');
const marketerBot = require('./src/app/marketerBot');
const contentBot = require('./src/app/contentBot');
const cusdevBot = require('./src/app/cusdevBot');
const methoBot = require('./src/app/methoBot');
const adminBot = require('./src/app/adminBot');
const saleBot = require('./src/app/saleBot');
const sellerBot = require('./src/app/sellerBot');
const logger = require('./src/utils/logger');
const config = require('./src/config');
const { Bot } = require('grammy');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot server is running');
});

server.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
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
  try {
    if (!bot) {
      throw new Error(`${name} is not initialized`);
    }
    
    logger.info(`Starting ${name}...`);
    
    // Проверяем соединение
    const me = await bot.api.getMe();
    logger.info(`${name} connected as @${me.username}`);
    
    // Запускаем бота без ожидания
    bot.start({
      drop_pending_updates: true,
      onStart: () => logger.info(`${name} is starting...`)
    }).catch(error => {
      logger.error(`Error in ${name} long polling:`, error);
    });
    
    logger.info(`${name} started successfully`);
  } catch (error) {
    logger.error(`Error starting ${name}:`, error);
    throw error;
  }
}

async function startBots() {
  console.log('Inside startBots function');
  
  // Проверка токенов
  const tokenChecks = await Promise.all([
    checkBotToken(config.strategyBotToken, 'Strategy Bot'),
    checkBotToken(config.producerBotToken, 'Producer Bot'),
    checkBotToken(config.marketerBotToken, 'Marketer Bot'),
    checkBotToken(config.contentBotToken, 'Content Bot'),
    checkBotToken(config.sellerBotToken, 'Seller Bot'),
    checkBotToken(config.cusdevBotToken, 'CusDev Bot'),
    checkBotToken(config.methoBotToken, 'Metho Bot'),
    checkBotToken(config.adminBotToken, 'Admin Bot'),
    checkBotToken(config.saleBotToken, 'Sale Bot')
  ]);

  if (tokenChecks.some(valid => !valid)) {
    console.error('One or more bot tokens are invalid. Please check your configuration.');
    process.exit(1);
  }

  console.log('All tokens valid');

  try {
    // Запускаем ботов параллельно
    await Promise.all([
      startBot(strategyBot, 'Strategy Bot'),
      startBot(producerBot, 'Producer Bot'),
      startBot(marketerBot, 'Marketer Bot'),
      startBot(contentBot, 'Content Bot'),
      startBot(cusdevBot, 'CusDev Bot'),
      startBot(sellerBot, 'Seller Bot'),
      startBot(methoBot, 'Metho Bot'),
      startBot(adminBot, 'Admin Bot'),
      startBot(saleBot, 'Sale Bot')
    ]);

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

// Graceful shutdown
const SHUTDOWN_TIMEOUT = 5000; // 5 секунд

async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully.`);
  const shutdownPromise = Promise.all([
    producerBot.stop(),
    strategyBot.stop(),
    marketerBot.stop(),
    contentBot.stop(),
    cusdevBot.stop(),
    sellerBot.stop(),
    methoBot.stop(),
    adminBot.stop(),
    saleBot.stop(),
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