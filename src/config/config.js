// config.js

require('dotenv').config();

module.exports = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  adminBotToken: process.env.ADMIN_BOT_TOKEN,
  airtableApiKey: process.env.AIRTABLE_API_KEY,
  airtableBaseId: process.env.AIRTABLE_BASE_ID,
  airtableUsersTableId: process.env.AIRTABLE_USERS_TABLE_ID,
  goapiKey: process.env.GOAPI_KEY,
  goapiUrl: 'https://api.goapi.xyz/api/chatgpt/v1',
  gizmoId: process.env.GIZMO_ID,
};

// Добавьте проверку наличия всех необходимых переменных
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'ADMIN_BOT_TOKEN',
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'AIRTABLE_USERS_TABLE_ID',
  'GOAPI_KEY',
  'GIZMO_ID'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});