// src/services/subscriptionService.js

const prisma = require('../../../db/prisma');
const moment = require('moment');
const logger = require('../../../utils/logger');
const subscriptionCacheService = require('./subscriptionCacheService');

module.exports = {
  async checkOrCreateUser(userId, username) {
    logger.info(`Checking or creating user: ${userId} (${username})`);
    try {
      let user = await prisma.user.upsert({
        where: { userId: userId.toString() },
        update: { username },
        create: {
          userId: userId.toString(),
          username,
          messageCount: 0,
          newDialogCount: 0
        },
      });

      const status = user.subscriptionEnd && moment(user.subscriptionEnd).isAfter(moment());
      await subscriptionCacheService.setCachedSubscription(userId, status);
      return status;
    } catch (error) {
      logger.error('Error in checkOrCreateUser:', error);
      throw error;
    }
  },

  async checkSubscription(userId) {
    logger.info(`Checking subscription for user: ${userId}`);
    try {
      const cachedStatus = await subscriptionCacheService.getCachedSubscription(userId);
      if (cachedStatus !== undefined) {
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
      const user = await prisma.user.findUnique({ where: { userId: userId.toString() } });
      if (!user) {
        logger.warn(`User not found in database: ${userId}`);
        await subscriptionCacheService.setCachedSubscription(userId, false);
        return false;
      }

      const status = user.subscriptionEnd && moment(user.subscriptionEnd).isAfter(moment());
      await subscriptionCacheService.setCachedSubscription(userId, status);
      
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
      let user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        logger.info(`User not found. Creating new user: ${username}`);
        user = await prisma.user.create({
          data: {
            userId: `temp_${Date.now()}`, // Temporary userId, should be updated later
            username,
            messageCount: 0,
            newDialogCount: 0
          }
        });
      }

      const currentEnd = user.subscriptionEnd;
      const newEnd = currentEnd && moment(currentEnd).isAfter(moment())
        ? moment(currentEnd).add(months, 'months')
        : moment().add(months, 'months');

      await prisma.user.update({
        where: { id: user.id },
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

  async getAllUsers() {
    logger.info('Fetching all users');
    try {
      const users = await prisma.user.findMany({
        select: {
          userId: true,
          username: true,
          messageCount: true,
          newDialogCount: true,
          subscriptionEnd: true
        }
      });
      logger.info(`Fetched ${users.length} users`);
      return users;
    } catch (error) {
      logger.error('Error in getAllUsers:', error);
      throw error;
    }
  },

  async getUserThreadId(userId) { 
    logger.info(`Getting conversation ID for user: ${userId}`);
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() },
        select: { threadId: true }
      });

      if (!user) {
        logger.warn(`User not found: ${userId}`);
        return null;
      }

      return user.conversationId;
    } catch (error) {
      logger.error('Error in getUserThreadId:', error);
      throw error;
    }
  },

  async setUserThreadId (userId, threadId) {
    logger.info(`Устанавливаем ID разговора для пользователя: ${userId}, conversationId: ${conversationId}`);
    try {
      const result = await prisma.user.update({
        where: { userId: userId.toString() },
        data: { threadId }
      });
      logger.info(`Результат обновления: ${JSON.stringify(result)}`);
      if (!result) {
        logger.warn(`Пользователь с userId: ${userId} не найден`);
      }
    } catch (error) {
      logger.error('Ошибка в setUserConversationId:', error);
      throw error;
    }
  }
};