// config/config.js

const dotenv = require('dotenv');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'ADMIN_BOT_TOKEN',
  'DATABASE_URL',
  'GROQ_API_KEY',
  'ADMIN_TG_ID',
  'ASSITANT_ID_OPENAI',
  'OPENAI_API_KEY',
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

const config = {
  userBotToken: process.env.TELEGRAM_BOT_TOKEN,
  adminBotToken: process.env.ADMIN_BOT_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  groqApiKey: process.env.GROQ_API_KEY,
  adminTgId: process.env.ADMIN_TG_ID,
  assistantId: process.env.ASSITANT_ID_OPENAI,
  openaiApiKey: process.env.OPENAI_API_KEY,
};

console.log('Environment variables:');
for (const [key, value] of Object.entries(config)) {
  console.log(`${key}: ${value ? 'Set' : 'Not set'}`);
}

module.exports = config;