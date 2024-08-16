// src/config/index.js

const { admin } = require("googleapis/build/src/apis/admin");

module.exports = {
  telegram: {
    userBotToken: process.env.USER_BOT_TOKEN,
    adminBotToken: process.env.ADMIN_BOT_TOKEN
  },
  database: {
    url: process.env.DATABASE_URL,
    redis:process.env.REDIS_URL
  },
  llm: {
    openai: process.env.OPENAI_API_KEY,
    groq: process.env.GROQ_API_KEY
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    index: process.env.PINECONE_INDEX
  },
  management: {
    admin: process.env.ADMIN_TG_ID,
  }
};