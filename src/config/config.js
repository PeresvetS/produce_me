// src/config/config.js

const dotenv = require('dotenv');
const path = require('path');

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
  'GIZMO_ID',
  'PINECONE_API_KEY',
  'PINECONE_ENVIRONMENT',
  'PINECONE_INDEX_NAME',
  'OPENAI_API_KEY',
  'MEM0_API_KEY',
  'CLAUDE_API_KEY',
  'GEMINI_API_KEY',
  'POSTGRES_USER',
  'POSTGRES_HOST',
  'POSTGRES_DATABASE',
  'POSTGRES_PASSWORD',
  'POSTGRES_PORT',
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

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
  groqApiKey: process.env.GROQ_API_KEY,
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
  pineconeIndexName: process.env.PINECONE_INDEX_NAME,
  openaiApiKey: process.env.OPENAI_API_KEY,
  mem0ApiKey: process.env.MEM0_API_KEY,
  claudeApiKey: process.env.CLAUDE_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  postgresUser: process.env.POSTGRES_USER,
  postgresHost: process.env.POSTGRES_HOST,
  postgresDatabase: process.env.POSTGRES_DATABASE,
  postgresPassword: process.env.POSTGRES_PASSWORD,
  postgresPort: process.env.POSTGRES_PORT,
  
};

console.log('Environment variables:');
for (const [key, value] of Object.entries(config)) {
  console.log(`${key}: ${value ? 'Set' : 'Not set'}`);
}

module.exports = config;