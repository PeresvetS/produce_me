import { Context, SessionFlavor } from 'grammy';
import { Update, Message } from 'grammy/types';
import { InputFile } from 'grammy';

// Basic session interface for admin bot
export interface AdminSessionData {
  // Можно добавить специфичные для админ-сессии данные в будущем
}

// Extended context type that includes admin session data
export type AdminBotContext = Context & {
  update: Update;
  updateType: Update['update_id'];
} & SessionFlavor<AdminSessionData>;

// Stats interface
export interface BotStats {
  totalUsers: number;
  activeUsers: number;
  totalDialogs: number;
}

// User interface with required fields
export interface User {
  id: number;
  userId: string;
  username: string;
  name?: string;
  subscriptionEnd?: Date | null;
  messageCount: number;
  dialogCount?: number;
  newDialogCount: number;
  createdAt: Date;
  updatedAt: Date;
  userData?: any;
  threadId?: string | null;
  totalTokensUsed: number;
}

// Extended user info for bot users
export interface UserWithBotInfo extends User {
  lastActive?: Date;
  isActive: boolean;
  isBlocked: boolean;
  isBanned: boolean;
}

// User info interface
export interface UserInfo {
  name?: string;
  username: string;
  newDialogCount: number;
  subscriptionEnd?: Date | null;
}

// Custom file type that extends InputFile
export interface CustomInputFile extends InputFile {
  source: Buffer | string;
  filename?: string;
}

// Re-export BotType from Prisma schema
export enum AdminBotType {
  PRODUCER = 'PRODUCER',
  MARKETER = 'MARKETER',
  CUSDEV = 'CUSDEV',
  METHO = 'METHO',
  CONTENT = 'CONTENT',
  SALE = 'SALE',
  STRATEGY = 'STRATEGY',
  SELLER = 'SELLER'
} 