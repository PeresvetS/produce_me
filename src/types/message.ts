import { Context } from 'grammy';
import { BotType } from '@prisma/client';

export interface TokenUsage {
  total_tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  botType: string;
  userMessage: string;
  assistantMessage: string;
  timestamp: Date;
}

export interface ConversationLog {
  conversations: Conversation[];
  totalMessages: number;
}

export interface RunResult {
  message: string;
  usage: TokenUsage;
}

export interface FileMetadata {
  size: number;
  mimeType: string;
  width: number;
  height: number;
}

export interface DocumentContent {
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
}

export interface FileProcessResult {
  aiResponse: string;
  usage: TokenUsage;
}

export interface FileContext extends Context {
  message: {
    document?: {
      file_id: string;
      caption?: string;
    };
    photo?: Array<{
      file_id: string;
    }>;
    caption?: string;
  } & Context['message'];
}

export interface PromptSelectionResult {
  text: string;
}

export interface PromptSelectionParams {
  userData: string;
  userMessage: string;
  botType: BotType;
} 