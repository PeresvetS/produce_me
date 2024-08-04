// subscriptionService.js

const airtable = require('../db/airtable');
const config = require('../config/config');
const moment = require('moment');
const logger = require('../utils/logger');
const subscriptionCacheService = require('./subscriptionCacheService');

const Users = airtable(config.airtableUsersTableId);

module.exports = {
  async checkOrCreateUser(userId, username) {
    logger.info(`Checking or creating user: ${userId} (${username})`);
    try {
      const records = await Users.select({
        filterByFormula: `OR({UserId} = '${userId}', {Username} = '${username}')`
      }).firstPage();

      if (records.length === 0) {
        logger.info(`Creating new user: ${userId} (${username})`);
        await Users.create([
          {
            fields: {
              UserId: userId.toString(),
              Username: username,
              SubscriptionEnd: null,
              MessageCount: 0,
              NewDialogCount: 0
            }
          }
        ]);
        await subscriptionCacheService.setCachedSubscription(userId, false);
        return false;
      }

      const user = records[0];
      logger.info(`User found: ${user.id}`);
      if (user.get('UserId') !== userId.toString()) {
        logger.info(`Updating UserId for user: ${user.id}`);
        await Users.update([
          {
            id: user.id,
            fields: {
              UserId: userId.toString()
            }
          }
        ]);
      }

      const subscriptionEnd = user.get('SubscriptionEnd');
      const status = subscriptionEnd && moment(subscriptionEnd).isAfter(moment());
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
      if (cachedStatus !== null) {
        logger.info(`Using cached subscription status for user ${userId}: ${cachedStatus}`);
        return cachedStatus;
      }

      const records = await Users.select({
        filterByFormula: `{UserId} = '${userId}'`
      }).firstPage();

      if (records.length === 0) {
        logger.warn(`User not found: ${userId}`);
        await subscriptionCacheService.setCachedSubscription(userId, false);
        return false;
      }

      const user = records[0];
      const subscriptionEnd = user.get('SubscriptionEnd');
      
      const status = subscriptionEnd && moment(subscriptionEnd).isAfter(moment());
      await subscriptionCacheService.setCachedSubscription(userId, status);
      
      logger.info(`Subscription status for user ${userId}: ${status}`);
      return status;
    } catch (error) {
      logger.error('Error in checkSubscription:', error);
      throw error;
    }
  },

  async addSubscription(username, months) {
    logger.info(`Adding subscription for user: ${username}, months: ${months}`);
    try {
      const records = await Users.select({
        filterByFormula: `{Username} = '${username}'`
      }).firstPage();

      if (records.length === 0) {
        logger.warn(`User not found: ${username}`);
        throw new Error('Пользователь не найден');
      }

      const user = records[0];
      const currentEnd = user.get('SubscriptionEnd');
      const newEnd = currentEnd && moment(currentEnd).isAfter(moment())
        ? moment(currentEnd).add(months, 'months')
        : moment().add(months, 'months');

      await Users.update([
        {
          id: user.id,
          fields: {
            SubscriptionEnd: newEnd.format('YYYY-MM-DD')
          }
        }
      ]);

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
      const records = await Users.select().all();
      const totalUsers = records.length;
      const activeUsers = records.filter(record => {
        const subscriptionEnd = record.get('SubscriptionEnd');
        return subscriptionEnd && moment(subscriptionEnd).isAfter(moment());
      }).length;
      const totalDialogs = records.reduce((sum, record) => sum + (record.get('MessageCount') || 0), 0);

      logger.info(`Stats fetched: Total users: ${totalUsers}, Active users: ${activeUsers}, Total dialogs: ${totalDialogs}`);
      return { totalUsers, activeUsers, totalDialogs };
    } catch (error) {
      logger.error('Error in getStats:', error);
      throw error;
    }
  },

  async getAllUsers() {
    logger.info('Fetching all users');
    try {
      const records = await Users.select().all();
      const users = records.map(record => ({
        id: record.get('UserId'),
        name: record.get('Name') || 'Не указано',
        username: record.get('Username'),
        dialogCount: record.get('MessageCount') || 0,
        newDialogCount: record.get('NewDialogCount') || 0,
        subscriptionEnd: record.get('SubscriptionEnd')
      }));
      logger.info(`Fetched ${users.length} users`);
      return users;
    } catch (error) {
      logger.error('Error in getAllUsers:', error);
      throw error;
    }
  },

  async getUserConversationId(userId) {
    logger.info(`Getting conversation ID for user: ${userId}`);
    try {
      const records = await Users.select({
        filterByFormula: `{UserId} = '${userId}'`
      }).firstPage();

      if (records.length === 0) {
        logger.warn(`User not found: ${userId}`);
        return null;
      }

      const user = records[0];
      return user.get('ConversationId');
    } catch (error) {
      logger.error('Error in getUserConversationId:', error);
      throw error;
    }
  },

  async setUserConversationId(userId, conversationId) {
    logger.info(`Setting conversation ID for user: ${userId}`);
    try {
      const records = await Users.select({
        filterByFormula: `{UserId} = '${userId}'`
      }).firstPage();

      if (records.length === 0) {
        logger.warn(`User not found: ${userId}`);
        return;
      }

      const user = records[0];
      await Users.update([
        {
          id: user.id,
          fields: {
            ConversationId: conversationId
          }
        }
      ]);
      logger.info(`Conversation ID set for user ${userId}: ${conversationId}`);
    } catch (error) {
      logger.error('Error in setUserConversationId:', error);
      throw error;
    }
  }
};