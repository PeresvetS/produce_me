// index.js

console.log('Starting application...');
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set');
console.log('ADMIN_BOT_TOKEN:', process.env.ADMIN_BOT_TOKEN ? 'Set' : 'Not set');
console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? 'Set' : 'Not set');
console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Set' : 'Not set');
console.log('AIRTABLE_USERS_TABLE_ID:', process.env.AIRTABLE_USERS_TABLE_ID ? 'Set' : 'Not set');
console.log('GOAPI_KEY:', process.env.GOAPI_KEY ? 'Set' : 'Not set');
console.log('GIZMO_ID:', process.env.GIZMO_ID ? 'Set' : 'Not set');

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