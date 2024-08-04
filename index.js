// index.js

const userBot = require('./src/app/userBot');
const adminBot = require('./src/app/adminBot');
const logger = require('./src/utils/logger');

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

process.once('SIGINT', () => {
  userBot.stop('SIGINT');
  adminBot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  userBot.stop('SIGTERM');
  adminBot.stop('SIGTERM');
});