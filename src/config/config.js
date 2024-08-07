// config.js

const dotenv = require('dotenv');
const path = require('path');

// Загружаем .env файл только если он существует и мы не в производственной среде
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'ADMIN_BOT_TOKEN',
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'AIRTABLE_USERS_TABLE_ID',
  'AIRTABLE_ADMINS_TABLE_ID',
  'GROQ_API_KEY',
  'GOAPI_KEY',
  'GIZMO_ID'
];

// Проверяем наличие всех необходимых переменных
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Конфигурация
const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  adminBotToken: process.env.ADMIN_BOT_TOKEN,
  airtableApiKey: process.env.AIRTABLE_API_KEY,
  airtableBaseId: process.env.AIRTABLE_BASE_ID,
  airtableUsersTableId: process.env.AIRTABLE_USERS_TABLE_ID,
  airtableAdminsTableId: process.env.AIRTABLE_ADMINS_TABLE_ID,
  goapiKey: process.env.GOAPI_KEY,
  goapiUrl: 'https://api.goapi.xyz/api/chatgpt/v1',
  gizmoId: process.env.GIZMO_ID,
  GROQ_API_KEY: process.env.GROQ_API_KEY
};

// Добавляем логирование для отладки
console.log('Environment variables:');
for (const [key, value] of Object.entries(config)) {
  console.log(`${key}: ${value ? 'Set' : 'Not set'}`);
}

module.exports = config;