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
        where: { OR: [{ userId: BigInt(userId) }, { username: username }] }
      });

      if (!user) {
        logger.info(`Creating new user: ${userId} (${username})`);
        user = await prisma.user.create({
          data: {
            userId: BigInt(userId),
            username: username
          }
        });
        await subscriptionCacheService.setCachedSubscription(userId, false);
        return false;
      }

      if (user.userId !== BigInt(userId)) {
        logger.info(`Updating UserId for user: ${user.id}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { userId: BigInt(userId) }
        });
      }

      // Поскольку subscriptionEnd отсутствует в схеме, мы можем использовать userData для хранения этой информации
      const userData = await prisma.userData.findFirst({
        where: { userId: BigInt(userId), key: 'subscriptionEnd' }
      });

      const status = userData && userData.value && moment(userData.value).isAfter(moment());
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

      const userData = await prisma.userData.findFirst({
        where: { userId: BigInt(userId), key: 'subscriptionEnd' }
      });

      const status = userData && userData.value && moment(userData.value).isAfter(moment());
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
          data: { username: username }
        });
      }

      const userData = await prisma.userData.findFirst({
        where: { userId: user.userId, key: 'subscriptionEnd' }
      });

      const currentEnd = userData ? userData.value : null;
      const newEnd = currentEnd && moment(currentEnd).isAfter(moment())
        ? moment(currentEnd).add(months, 'months')
        : moment().add(months, 'months');

      await prisma.userData.upsert({
        where: { 
          userId_key: {
            userId: user.userId,
            key: 'subscriptionEnd'
          }
        },
        update: { value: newEnd.toISOString() },
        create: {
          userId: user.userId,
          key: 'subscriptionEnd',
          value: newEnd.toISOString()
        }
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
      const activeUsers = await prisma.userData.count({
        where: {
          key: 'subscriptionEnd',
          value: { gt: new Date().toISOString() }
        }
      });
      const totalDialogs = await prisma.dialog.count();

      logger.info(`Stats fetched: Total users: ${totalUsers}, Active users: ${activeUsers}, Total dialogs: ${totalDialogs}`);
      return { totalUsers, activeUsers, totalDialogs };
    } catch (error) {
      logger.error('Error in getStats:', error);
      throw error;
    }
  }

  async getAllUsers() {
    logger.info('Fetching all users');
    try {
      const users = await prisma.user.findMany({
        include: {
          userData: true,
          dialogs: { select: { id: true } }
        }
      });
      logger.info(`Fetched ${users.length} users`);
      return users.map(user => ({
        userId: user.userId,
        name: user.firstName || 'Не указано',
        username: user.username,
        dialogCount: user.dialogs.length,
        subscriptionEnd: user.userData.find(d => d.key === 'subscriptionEnd')?.value
      }));
    } catch (error) {
      logger.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  async getUserConversationId(userId) {
    logger.info(`Getting conversation ID for user: ${userId}`);
    try {
      const userData = await prisma.userData.findFirst({
        where: { userId: BigInt(userId), key: 'conversationId' }
      });

      return userData ? userData.value : null;
    } catch (error) {
      logger.error('Error in getUserConversationId:', error);
      throw error;
    }
  }

  async setUserConversationId(userId, conversationId) {
    logger.info(`Setting conversation ID for user: ${userId}`);
    try {
      await prisma.userData.upsert({
        where: { 
          userId_key: {
            userId: BigInt(userId),
            key: 'conversationId'
          }
        },
        update: { value: conversationId },
        create: {
          userId: BigInt(userId),
          key: 'conversationId',
          value: conversationId
        }
      });
      logger.info(`Conversation ID set for user ${userId}: ${conversationId}`);
    } catch (error) {
      logger.error('Error in setUserConversationId:', error);
      throw error;
    }
  }
}

module.exports = new SubscriptionService();