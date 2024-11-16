import prisma from '../../../db/prisma';
import logger from '../../../utils/logger';
import { DialogCounts } from '../../../types/management';

export class DialogService {
  async incrementDialogCount(userId: string | number): Promise<void> {
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
  }

  async incrementNewDialogCount(userId: string | number): Promise<void> {
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
  }

  async getDialogCounts(userId: string | number): Promise<DialogCounts> {
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
  }

  async resetDialogCounts(userId: string | number): Promise<void> {
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
}

export const dialogService = new DialogService(); 