import { Prisma } from '@prisma/client';

export interface User {
  userId: string;
  username: string;
  name?: string;
  messageCount: number;
  newDialogCount: number;
  totalTokensUsed: number;
  subscriptionEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userData: Prisma.JsonValue | null;
  threadId?: string | null;
  botThreads?: BotThread[];
  conversations?: Conversation[];
}

export interface BotThread {
  id: number;
  userId: string;
  botType: BotType;
  threadId: string | null;
}

export interface Conversation {
  id: number;
  userId: string;
  botType: BotType | null;
  userMessage: string;
  assistantMessage: string;
  timestamp: Date;
}

export interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalDialogs: number;
}

export type BotType = 
  | 'PRODUCER' 
  | 'MARKETER' 
  | 'CUSDEV' 
  | 'METHO' 
  | 'CONTENT' 
  | 'SALE' 
  | 'STRATEGY' 
  | 'SELLER'; 