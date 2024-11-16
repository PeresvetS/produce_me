import prisma from '../../../db/prisma';
import logger from '../../../utils/logger';
import { BotType } from '../../../types';
import { Conversation } from '../../../types/message';

export class ConversationService {
  async resetConversation(userId: string | number, botType: BotType): Promise<void> {
    try {
      await prisma.botThread.update({
        where: {
          userId_botType: {
            userId: userId.toString(),
            botType
          }
        },
        data: { threadId: null }
      });
      await this.logConversation(
        userId, 
        botType, 
        "System: Conversation reset", 
        "System: Conversation reset"
      );
      logger.info(`Conversation reset for user ${userId} and bot ${botType}`);
    } catch (error) {
      logger.error(`Error resetting conversation for user ${userId}:`, error);
      throw error;
    }
  }

  async logConversation(
    userId: string | number, 
    botType: BotType, 
    userMessage: string, 
    assistantMessage: string
  ): Promise<void> {
    try {
      await prisma.conversation.create({
        data: {
          userId: userId.toString(),
          botType,
          userMessage,
          assistantMessage,
          timestamp: new Date()
        }
      });
      logger.info(`Conversation logged for user ${userId}`);
    } catch (error) {
      logger.error('Error logging conversation:', error);
      throw error;
    }
  }

  async getConversationLog(userId: string | number, botType: BotType): Promise<string> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          userId: userId.toString(),
          botType
        },
        orderBy: { timestamp: 'asc' },
      });

      if (conversations.length === 0) {
        return 'Лог переписки для данного пользователя и бота не найден.';
      }

      return conversations.map(conv => `
User: ${conv.userMessage}
Assistant: ${conv.assistantMessage}
Timestamp: ${conv.timestamp.toISOString()}
---
`).join('\n');
    } catch (error) {
      logger.error('Error reading conversation log:', error);
      throw error;
    }
  }
}

export const conversationService = new ConversationService(); 