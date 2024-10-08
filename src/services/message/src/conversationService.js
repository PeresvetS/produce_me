// src/services/message/src/conversationService.js

const prisma = require('../../../db/prisma');
const logger = require('../../../utils/logger');

module.exports = {
  async resetConversation(userId, botType) {
    await prisma.botThread.update({
      where: {
        userId_botType: {
          userId: userId.toString(),
          botType: botType
        }
      },
      data: { threadId: null }
    });
    await this.logConversation(userId, botType, "System: Conversation reset", "System: Conversation reset");
  },

  async logConversation(userId, botType, userMessage, assistantMessage) {
    try {
      await prisma.conversation.create({
        data: {
          userId: userId.toString(),
          botType: botType,
          userMessage,
          assistantMessage,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Error logging conversation:', error);
    }
  },

  async getConversationLog(userId, botType) {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          userId: userId.toString(),
          botType: botType
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
};