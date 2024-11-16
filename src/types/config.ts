import { BotType } from "@prisma/client";

export interface Config {
  openaiApiKey: string;
  assistantIds: {
    [key in BotType]: string;
  };
  producerBotToken: string;
  marketerBotToken: string;
  therapistBotToken: string;
  adminTgId: string[];
  [key: string]: string | Record<string, string> | string[];
} 