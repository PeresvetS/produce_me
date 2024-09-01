// src/services/subscription/src/subscriptionService.js

const moment = require('moment');
const prisma = require('../../../db/prisma');
const logger = require('../../../utils/logger');
const managementService = require('../../management/');
const subscriptionCacheService = require('./subscriptionCacheService');

module.exports = {

  async checkSubscription(userId) {
    logger.info(`Checking subscription for user: ${userId}`);
    try {
      const cachedStatus = await subscriptionCacheService.getCachedSubscription(userId);
      logger.info(`Cache ${cachedStatus}`);
      if (cachedStatus != undefined && cachedStatus != null) {
        logger.info(`Using cached subscription status for user ${userId}: ${cachedStatus}`);
        return cachedStatus;
      }

      logger.info(`Cache miss for user ${userId}, checking database`);
      return this.checkSubscriptionFromDatabase(userId);
    } catch (error) {
      logger.error('Error in checkSubscription:', error);
      throw error;
    }
  },


  async checkSubscriptionFromDatabase(userId) {
    logger.info(`Checking subscription in database for user: ${userId}`);
    try {
      const user = await managementService.checkUserByID(userId);
      if (!user) {
        logger.warn(`User not found in database: ${userId}`);
        await subscriptionCacheService.setCachedSubscription(userId, false);
        return false;
      }
      logger.info(`Checking subscription in database for user DATE: ${user.subscriptionEnd}`);
      const status = user.subscriptionEnd && moment(user.subscriptionEnd).isAfter(moment());
      if (status === true) {
        await subscriptionCacheService.setCachedSubscription(userId, status);
      }
      
      logger.info(`Subscription status for user ${userId}: ${status}`);
      return status;
    } catch (error) {
      logger.error('Error checking subscription in database:', error);
      throw error;
    }
  },

  async addSubscription(username, months) {
    logger.info(`Adding subscription for user: ${username}, months: ${months}`);
    try {
      let user = await managementService.checkUserByUsername(username);
      if (!user) {
        logger.info(`User ${username} not found. Creating new user.`);
        user = await managementService.createUserByUsername(username);
      }
  
      let currentEnd = user.subscriptionEnd;
      
      const newEnd = currentEnd && moment(currentEnd).isAfter(moment())
        ? moment(currentEnd).add(months, 'months')
        : moment().add(months, 'months');
  
      user = await prisma.user.update({
        where: { username: username },
        data: { subscriptionEnd: newEnd.toDate() }
      });
  
      logger.info(`Subscription added for user ${username} until ${newEnd.format('DD.MM.YYYY')}`);
      return `Подписка для пользователя @${username} успешно добавлена до ${newEnd.format('DD.MM.YYYY')}`;
    } catch (error) {
      logger.error('Error in addSubscription:', error);
      throw error;
    }
  },

  async getStats() {
    logger.info('Fetching user statistics');
    try {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({
        where: {
          subscriptionEnd: {
            gt: new Date()
          }
        }
      });
      const totalDialogs = await prisma.user.aggregate({
        _sum: {
          messageCount: true
        }
      });

      logger.info(`Stats fetched: Total users: ${totalUsers}, Active users: ${activeUsers}, Total dialogs: ${totalDialogs._sum.messageCount}`);
      return { totalUsers, activeUsers, totalDialogs: totalDialogs._sum.messageCount };
    } catch (error) {
      logger.error('Error in getStats:', error);
      throw error;
    }
  },


  async getUserThreadId(userId, botType) {
    try {
      const botThread = await prisma.botThread.findUnique({
        where: {
          userId_botType: {
            userId: userId.toString(),
            botType: botType
          }
        }
      });
      if (botThread) {
        return botThread.threadId;
      }
      
      // Fallback к старому полю threadId в таблице User
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() }
      });
      if (user && user.threadId) {
        // Если нашли старый threadId, перенесем его в BotThread
        await this.setUserThreadId(userId, botType, user.threadId);
        return user.threadId;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting thread ID for user ${userId} and bot type ${botType}:`, error);
      throw error;
    }
  },

  async setUserThreadId(userId, botType, threadId) {
    try {
      // Сначала проверяем, существует ли пользователь
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() }
      });
  
      if (!user) {
        logger.error(`User with ID ${userId} not found. Cannot set threadId.`);
        throw new Error(`User with ID ${userId} not found`);
      }
  
      // Используем upsert для создания или обновления записи
      await prisma.botThread.upsert({
        where: {
          userId_botType: {
            userId: userId.toString(),
            botType: botType
          }
        },
        update: {
          threadId: threadId // Обновляем threadId, даже если он null
        },
        create: {
          botType: botType,
          threadId: threadId, // Может быть null при создании
          user: {
            connect: { userId: userId.toString() }
          }
        }
      });
  
      logger.info(`Successfully set thread ID for user ${userId} and bot type ${botType}. ThreadId: ${threadId || 'null'}`);
    } catch (error) {
      logger.error(`Error setting thread ID for user ${userId} and bot type ${botType}:`, error);
      throw error;
    }
  },


  async getTotalTokensUsed(userId) {
    const user = await prisma.user.findUnique({
      where: { userId: userId.toString() },
      select: { totalTokensUsed: true }
    });
    return user?.totalTokensUsed || 0;
  },

  async updateTokenUsage(userId, tokensUsed) {
    logger.info(`Updating token usage for user ${userId}: +${tokensUsed} tokens`);
    try {
      await prisma.user.update({
        where: { userId: userId.toString() },
        data: {
          totalTokensUsed: {
            increment: tokensUsed
          }
        }
      });
      logger.info(`Token usage updated for user ${userId}`);
    } catch (error) {
      logger.error(`Error updating token usage for user ${userId}:`, error);
      throw error;
    }
  },
};

