// src/services/management/subscriptionCacheService.js

const Redis = require('ioredis');
const logger = require('../../utils/logger');

const redis = new Redis(process.env.REDIS_URL);

class SubscriptionCacheService {
  async getCachedSubscription(userId) {
    try {
      const status = await redis.get(`subscription:${userId}`);
      return status === 'true';
    } catch (error) {
      logger.error('Error reading from cache:', error);
      return null;
    }
  }

  async setCachedSubscription(userId, status) {
    try {
      await redis.set(`subscription:${userId}`, status.toString(), 'EX', 24 * 60 * 60);
    } catch (error) {
      logger.error('Error writing to cache:', error);
    }
  }

  async logMessage(userId) {
    try {
      await redis.incr(`messages:${userId}`);
    } catch (error) {
      logger.error('Error logging message:', error);
    }
  }

  async getMessageCount(userId) {
    try {
      const count = await redis.get(`messages:${userId}`);
      return parseInt(count) || 0;
    } catch (error) {
      logger.error('Error getting message count:', error);
      return 0;
    }
  }
}

module.exports = new SubscriptionCacheService();