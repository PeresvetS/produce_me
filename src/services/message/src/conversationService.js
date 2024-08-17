// src/services/message/src/conversationService.js

const fs = require('fs').promises;
const path = require('path');
const prisma = require('../../../db/prisma');
const logger = require('../../../utils/logger');

module.exports = {
  async resetConversation(userId) {
    await prisma.user.update({
      where: { userId: userId.toString() },
      data: { conversationId: null }
    });
    await this.logConversation(userId, "System: Conversation reset", "System: Conversation reset");
  },

  async logConversation(userId, userMessage, assistantMessage) {
    const logDir = path.join(__dirname, '../../../logs/conversations/');
    const logFile = path.join(logDir, `${userId}.log`);

    const logEntry = `
User: ${userMessage}
Assistant: ${assistantMessage}
Timestamp: ${new Date().toISOString()}
---
`;

    try {
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      logger.error('Error logging conversation:', error);
    }
  },

  async getConversationLog(userId) {
    const logFile = path.join(__dirname, `../../../logs/conversations/${userId}.log`);
    try {
      const log = await fs.readFile(logFile, 'utf-8');
      return log;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 'Лог переписки для данного пользователя не найден.';
      }
      logger.error('Error reading conversation log:', error);
      throw error;
    }
  }
};