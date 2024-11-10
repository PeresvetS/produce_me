import dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

interface AssistantIds {
  PRODUCER: string;
  MARKETER: string;
  CUSDEV: string;
  METHO: string;
  CONTENT: string;
  SALE: string;
  STRATEGY: string;
  SELLER: string;
}

interface Config {
  producerBotToken: string;
  marketerBotToken: string;
  cusdevBotToken: string;
  methoBotToken: string;
  strategyBotToken: string;
  contentBotToken: string;
  saleBotToken: string;
  sellerBotToken: string;
  adminBotToken: string;
  databaseUrl: string;
  groqApiKey: string;
  adminTgId: string;
  openaiApiKey: string;
  assistantIds: AssistantIds;
}

const requiredEnvVars = [
  'ADMIN_BOT_TOKEN',
  'DATABASE_URL',
] as const;

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

const config: Config = {
  producerBotToken: process.env.PRODUCER_BOT_TOKEN!,
  marketerBotToken: process.env.MARKETER_BOT_TOKEN!,
  cusdevBotToken: process.env.CUSDEV_BOT_TOKEN!,
  methoBotToken: process.env.METHO_BOT_TOKEN!,
  strategyBotToken: process.env.STRATEGY_BOT_TOKEN!,
  contentBotToken: process.env.CONTENT_BOT_TOKEN!,
  saleBotToken: process.env.SALE_BOT_TOKEN!,
  sellerBotToken: process.env.SELLER_BOT_TOKEN!,
  adminBotToken: process.env.ADMIN_BOT_TOKEN!,
  databaseUrl: process.env.DATABASE_URL!,
  groqApiKey: process.env.GROQ_API_KEY!,
  adminTgId: process.env.ADMIN_TG_ID!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  assistantIds: {
    PRODUCER: process.env.PRODUCER_ASSISTANT_ID!,
    MARKETER: process.env.MARKETER_ASSISTANT_ID!,
    CUSDEV: process.env.CUSDEV_ASSISTANT_ID!,
    METHO: process.env.METHO_ASSISTANT_ID!,
    CONTENT: process.env.CONTENT_ASSISTANT_ID!,
    SALE: process.env.SALE_ASSISTANT_ID!,
    STRATEGY: process.env.STRATEGY_ASSISTANT_ID!,
    SELLER: process.env.SELLER_ASSISTANT_ID!,
  }
};

export default config; 