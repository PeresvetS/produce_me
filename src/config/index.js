// config/default.js
module.exports = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    adminBotToken: process.env.ADMIN_BOT_TOKEN
  },
  database: {
    url: process.env.DATABASE_URL
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    index: process.env.PINECONE_INDEX
  }
};

// src/config/config.js
const config = require('config');
module.exports = config;