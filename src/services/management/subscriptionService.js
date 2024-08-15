// src/services/management/subscriptionService.js

const prisma = require('../../db/prisma');
const moment = require('moment');
const logger = require('../../utils/logger');
const subscriptionCacheService = require('./subscriptionCacheService');

class SubscriptionService {
  async checkOrCreateUser(userId, username) {
    logger.info(`Checking or creating user: ${userId} (${username})`);
    try {
      let user = await prisma.user.findFirst({
        where: { OR: [{ userId: userId }, { username: username }] }
      });

      if (!user) {
        logger.info(`Creating new user: ${userId} (${username})`);
        user = await prisma.user.create({
          data: {
            userId: userId,
            username: username,
            subscriptionEnd: null,
            messageCount: 0,
            newDialogCount: 0
          }
        });
        await subscriptionCacheService.setCachedSubscription(userId, false);
        return false;
      }

      if (user.userId !== userId) {
        logger.info(`Updating UserId for user: ${user.id}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { userId: userId }
        });
      }

      const status = user.subscriptionEnd && moment(user.subscriptionEnd).isAfter(moment());
      await subscriptionCacheService.setCachedSubscription(userId, status);
      return status;
    } catch (error) {
      logger.error('Error in checkOrCreateUser:', error);
      throw error;
    }
  }

  async checkSubscription(userId) {
    logger.info(`Checking subscription for user: ${userId}`);
    try {
      const cachedStatus = await subscriptionCacheService.getCachedSubscription(userId);
      if (cachedStatus !== null) {
        logger.info(`Using cached subscription status for user ${userId}: ${cachedStatus}`);
        return cachedStatus;
      }

      const user = await prisma.user.findUnique({ where: { userId: userId } });

      if (!user) {
        logger.warn(`User not found: ${userId}`);
        await subscriptionCacheService.setCachedSubscription(userId, false);
        return false;
      }

      const status = user.subscriptionEnd && moment(user.subscriptionEnd).isAfter(moment());
      await subscriptionCacheService.setCachedSubscription(userId, status);
      
      logger.info(`Subscription status for user ${userId}: ${status}`);
      return status;
    } catch (error) {
      logger.error('Error in checkSubscription:', error);
      throw error;
    }
  }

  async addSubscription(username, months) {
    logger.info(`Adding subscription for user: ${username}, months: ${months}`);
    try {
      let user = await prisma.user.findUnique({ where: { username: username } });

      if (!user) {
        logger.info(`User not found. Creating new user: ${username}`);
        user = await prisma.user.create({
          data: {
            username: username,
            subscriptionEnd: null,
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
  }

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

      logger.info(`Stats fetched: Total users: ${totalUsers}, Active users: ${activeUsers}, Total dialogs: ${totalDialogs._sum.messageCount || 0}`);
      return { totalUsers, activeUsers, totalDialogs: totalDialogs._sum.messageCount || 0 };
    } catch (error) {
      logger.error('Error in getStats:', error);
      throw error;
    }
  }

  async getAllUsers() {
    logger.info('Fetching all users');
    try {
      const users = await prisma.user.findMany({
        select: {
          userId: true,
          name: true,
          username: true,
          messageCount: true,
          newDialogCount: true,
          subscriptionEnd: true
        }
      });
      logger.info(`Fetched ${users.length} users`);
      return users.map(user => ({
        ...user,
        name: user.name || 'Не указано',
        dialogCount: user.messageCount || 0
      }));
    } catch (error) {
      logger.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  async getUserConversationId(userId) {
    logger.info(`Getting conversation ID for user: ${userId}`);
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId },
        select: { conversationId: true }
      });

      if (!user) {
        logger.warn(`User not found: ${userId}`);
        return null;
      }

      return user.conversationId;
    } catch (error) {
      logger.error('Error in getUserConversationId:', error);
      throw error;
    }
  }

  async setUserConversationId(userId, conversationId) {
    logger.info(`Setting conversation ID for user: ${userId}`);
    try {
      await prisma.user.update({
        where: { userId: userId },
        data: { conversationId: conversationId }
      });
      logger.info(`Conversation ID set for user ${userId}: ${conversationId}`);
    } catch (error) {
      logger.error('Error in setUserConversationId:', error);
      throw error;
    }
  }
}

module.exports = new SubscriptionService();