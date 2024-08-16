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

  async logMessage(userId) {
    logger.info(`Logging message for user ${userId}`);
    const key = `message_count_${userId}`;
    const count = subscriptionCache.get(key) || 0;
    subscriptionCache.set(key, count + 1);
  },

  async getMessageCount(userId) {
    logger.info(`Getting message count for user ${userId}`);
    const key = `message_count_${userId}`;
    return subscriptionCache.get(key) || 0;
  },

  async resetMessageCount(userId) {
    logger.info(`Resetting message count for user ${userId}`);
    const key = `message_count_${userId}`;
    subscriptionCache.set(key, 0);
  }
};