// src/services/management/src/dialogService.js

const prisma = require('../../../db/prisma');
const logger = require('../../../utils/logger');

module.exports = {
  async incrementDialogCount(userId) {
    logger.info(`Incrementing dialog count for user: ${userId}`);
    try {
      const user = await prisma.user.update({
        where: { userId: userId.toString() },
        data: { messageCount: { increment: 1 } },
      });
      logger.info(`Dialog count incremented for user: ${userId}. New count: ${user.messageCount}`);
    } catch (error) {
      logger.error('Error in incrementDialogCount:', error);
      throw error;
    }
  },

  async incrementNewDialogCount(userId) {
    logger.info(`Incrementing new dialog count for user: ${userId}`);
    try {
      const user = await prisma.user.update({
        where: { userId: userId.toString() },
        data: { newDialogCount: { increment: 1 } },
      });
      logger.info(`New dialog count incremented for user: ${userId}. New count: ${user.newDialogCount}`);
    } catch (error) {
      logger.error('Error in incrementNewDialogCount:', error);
      throw error;
    }
  },

  async getDialogCounts(userId) {
    logger.info(`Getting dialog counts for user: ${userId}`);
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() },
        select: { messageCount: true, newDialogCount: true }
      });

      if (!user) {
        logger.error(`User not found: ${userId}`);
        throw new Error('Пользователь не найден');
      }

      logger.info(`Dialog counts for user ${userId}: MessageCount: ${user.messageCount}, NewDialogCount: ${user.newDialogCount}`);
      return { messageCount: user.messageCount, newDialogCount: user.newDialogCount };
    } catch (error) {
      logger.error('Error in getDialogCounts:', error);
      throw error;
    }
  },

  async resetDialogCounts(userId) {
    logger.info(`Resetting dialog counts for user: ${userId}`);
    try {
      await prisma.user.update({
        where: { userId: userId.toString() },
        data: { messageCount: 0, newDialogCount: 0 }
      });
      logger.info(`Dialog counts reset for user: ${userId}`);
    } catch (error) {
      logger.error('Error in resetDialogCounts:', error);
      throw error;
    }
  }
};