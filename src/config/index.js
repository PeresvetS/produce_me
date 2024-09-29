// config/config.js

const dotenv = require('dotenv');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const requiredEnvVars = [
  'ADMIN_BOT_TOKEN',
  'DATABASE_URL',
  'GROQ_API_KEY',
  'ADMIN_TG_ID',
  'OPENAI_API_KEY',
  'PRODUCER_ASSISTANT_ID',
  'MARKETER_ASSISTANT_ID',
  'CUSDEV_ASSISTANT_ID',
  'METHO_ASSISTANT_ID',
  'CONTENT_ASSISTANT_ID',
  'PRODUCER_BOT_TOKEN',
  'MARKETER_BOT_TOKEN',
  'CUSDEV_BOT_TOKEN',
  'METHO_BOT_TOKEN',
  'CONTENT_BOT_TOKEN',
  'SALE_BOT_TOKEN',
  'SALE_ASSISTANT_ID',
  'STRATEGY_ASSISTANT_ID',
  'STRATEGY_BOT_TOKEN'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

const config = {
  producerBotToken: process.env.PRODUCER_BOT_TOKEN,
  marketerBotToken: process.env.MARKETER_BOT_TOKEN,
  cusdevBotToken: process.env.CUSDEV_BOT_TOKEN,
  methoBotToken: process.env.METHO_BOT_TOKEN,
  strategyBotToken: process.env.STRATEGY_BOT_TOKEN,
  contentBotToken: process.env.CONTENT_BOT_TOKEN,
  saleBotToken: process.env.SALE_BOT_TOKEN,
  adminBotToken: process.env.ADMIN_BOT_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  groqApiKey: process.env.GROQ_API_KEY,
  adminTgId: process.env.ADMIN_TG_ID,
  openaiApiKey: process.env.OPENAI_API_KEY,
  assistantIds: {
    PRODUCER: process.env.PRODUCER_ASSISTANT_ID,
    MARKETER: process.env.MARKETER_ASSISTANT_ID,
    CUSDEV: process.env.CUSDEV_ASSISTANT_ID,
    METHO: process.env.METHO_ASSISTANT_ID,
    CONTENT: process.env.CONTENT_ASSISTANT_ID,
    SALE: process.env.SALE_ASSISTANT_ID,
    STRATEGY: process.env.STRATEGY_ASSISTANT_ID
  },

};

module.exports = config;