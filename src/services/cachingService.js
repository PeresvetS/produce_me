// src/services/cachingService.js

const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CachingService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
  }

  set(key, value, ttl = 600) {
    try {
      const success = this.cache.set(key, value, ttl);
      if (success) {
        logger.info(`Cached value for key: ${key}`);
      } else {
        logger.warn(`Failed to cache value for key: ${key}`);
      }
      return success;
    } catch (error) {
      logger.error(`Error caching value for key ${key}:`, error);
      return false;
    }
  }

  get(key) {
    try {
      const value = this.cache.get(key);
      if (value) {
        logger.info(`Cache hit for key: ${key}`);
      } else {
        logger.info(`Cache miss for key: ${key}`);
      }
      return value;
    } catch (error) {
      logger.error(`Error retrieving cached value for key ${key}:`, error);
      return null;
    }
  }

  del(key) {
    try {
      const deleted = this.cache.del(key);
      if (deleted) {
        logger.info(`Deleted cache for key: ${key}`);
      } else {
        logger.warn(`Failed to delete cache for key: ${key}`);
      }
      return deleted;
    } catch (error) {
      logger.error(`Error deleting cache for key ${key}:`, error);
      return false;
    }
  }

  flush() {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Error flushing cache:', error);
    }
  }
}

module.exports = new CachingService();