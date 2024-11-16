import { User, BotType } from './index';

export interface DialogCounts {
  messageCount: number;
  newDialogCount: number;
}

export interface UserWithBotInfo {
  id: string;
  userId: string;
  username: string;
  name: string;
  dialogCount: number;
  threadId?: string;
  messageCount: number;
  newDialogCount: number;
  totalTokensUsed: number;
  subscriptionEnd: Date | null;
  lastActive?: Date;
  isActive: boolean;
  isBlocked: boolean;
  isBanned: boolean;
}

export interface UserData {
  [key: string]: any;
}

export interface UserInfo {
  name?: string;
  username: string;
  newDialogCount: number;
  subscriptionEnd?: Date | null;
} 