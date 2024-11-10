import { Context, SessionFlavor } from 'grammy';

// Basic session interface
interface SessionData {
  threadId: string | null;
}

// Extended context type that includes session data
type BotContext = Context & SessionFlavor<SessionData>;

// Bot types enum
enum BotType {
  CONTENT = 'CONTENT',
  ASSISTANT = 'ASSISTANT',
  COACH = 'COACH',
  CUSDEV = 'CUSDEV',
  PRODUCER = 'PRODUCER',
  MARKETER = 'MARKETER',
  METHO = 'METHO',
  SALE = 'SALE',
  STRATEGY = 'STRATEGY',
  SELLER = 'SELLER'
}

// Message usage interface for OpenAI responses
interface MessageUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// File processing response interface
interface FileProcessingResponse {
  aiResponse: string;
  usage?: MessageUsage;
}

// User subscription status
interface SubscriptionStatus {
  isActive: boolean;
  expiresAt?: Date;
  totalTokensUsed?: number;
}

// User data interface
interface UserData {
  userId: number;
  username: string;
  dialogCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Export all types and enum
export type {
  SessionData,
  BotContext,
  MessageUsage,
  FileProcessingResponse,
  SubscriptionStatus,
  UserData
};

export { BotType };