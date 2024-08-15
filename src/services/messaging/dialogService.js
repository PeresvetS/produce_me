// src/services/messaging/dialogService.js

const prisma = require('../../db/prisma');
const logger = require('../../utils/logger');

class DialogService {
  async incrementDialogCount(userId) {
    logger.info(`Incrementing dialog count for user: ${userId}`);
    try {
      await prisma.user.update({
        where: { userId: BigInt(userId) },
        data: { 
          userData: {
            upsert: {
              where: {
                userId_key: {
                  userId: BigInt(userId),
                  key: 'messageCount'
                }
              },
              create: {
                key: 'messageCount',
                value: 1
              },
              update: {
                value: {
                  increment: 1
                }
              }
            }
          }
        }
      });
      logger.info(`Dialog count incremented for user: ${userId}`);
    } catch (error) {
      logger.error('Error in incrementDialogCount:', error);
      throw error;
    }
  }

  async incrementNewDialogCount(userId) {
    logger.info(`Incrementing new dialog count for user: ${userId}`);
    try {
      await prisma.user.update({
        where: { userId: BigInt(userId) },
        data: { 
          userData: {
            upsert: {
              where: {
                userId_key: {
                  userId: BigInt(userId),
                  key: 'newDialogCount'
                }
              },
              create: {
                key: 'newDialogCount',
                value: 1
              },
              update: {
                value: {
                  increment: 1
                }
              }
            }
          }
        }
      });
      logger.info(`New dialog count incremented for user: ${userId}`);
    } catch (error) {
      logger.error('Error in incrementNewDialogCount:', error);
      throw error;
    }
  }

  async getDialogCounts(userId) {
    logger.info(`Getting dialog counts for user: ${userId}`);
    try {
      const userData = await prisma.userData.findMany({
        where: {
          userId: BigInt(userId),
          key: { in: ['messageCount', 'newDialogCount'] }
        }
      });

      const counts = userData.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, { messageCount: 0, newDialogCount: 0 });

      logger.info(`Dialog counts for user ${userId}:`, counts);
      return counts;
    } catch (error) {
      logger.error('Error in getDialogCounts:', error);
      throw error;
    }
  }

  async resetDialogCounts(userId) {
    logger.info(`Resetting dialog counts for user: ${userId}`);
    try {
      await prisma.userData.updateMany({
        where: {
          userId: BigInt(userId),
          key: { in: ['messageCount', 'newDialogCount'] }
        },
        data: {
          value: 0
        }
      });
      logger.info(`Dialog counts reset for user: ${userId}`);
    } catch (error) {
      logger.error('Error in resetDialogCounts:', error);
      throw error;
    }
  }
}

module.exports = new DialogService();