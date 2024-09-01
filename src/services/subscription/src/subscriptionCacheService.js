// services/subscriptionCacheService.js

const NodeCache = require('node-cache');
const logger = require('../../../utils/logger');

const subscriptionCache = new NodeCache({ stdTTL: 3600 }); // Кэш на 1 час

module.exports = {
  async setCachedSubscription(userId, status) {
    logger.info(`Setting cached subscription for user ${userId}: ${status}`);
    subscriptionCache.set(userId.toString(), status);
  },

  async getCachedSubscription(userId) {
    logger.info(`Getting cached subscription for user ${userId}`);
    return subscriptionCache.get(userId.toString());
  },

  async logMessage(userId, botType) {
    logger.info(`Logging message for user ${userId} in bot ${botType}`);
    const key = `message_count_${userId}_${botType}`;
    const count = subscriptionCache.get(key) || 0;
    subscriptionCache.set(key, count + 1);
  },

  async getMessageCount(userId, botType) {
    logger.info(`Getting message count for user ${userId} in bot ${botType}`);
    const key = `message_count_${userId}_${botType}`;
    return subscriptionCache.get(key) || 0;
  },

  async resetMessageCount(userId, botType) {
    logger.info(`Resetting message count for user ${userId} in bot ${botType}`);
    const key = `message_count_${userId}_${botType}`;
    subscriptionCache.set(key, 0);
  }
};