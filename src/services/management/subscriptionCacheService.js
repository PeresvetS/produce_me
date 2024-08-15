// src/services/subscriptionCacheService.js

const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

const CACHE_FILE = path.join(__dirname, '../../data/subscription_cache.json');
const MESSAGE_LOG_FILE = path.join(__dirname, '../../data/message_log.json');

module.exports = {
  async getCachedSubscription(userId) {
    try {
      const data = await fs.readFile(CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);
      const userCache = cache[userId];
      if (userCache && Date.now() - userCache.timestamp < 24 * 60 * 60 * 1000) {
        return userCache.status;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Error reading cache file:', error);
      }
    }
    return null;
  },

  async setCachedSubscription(userId, status) {
    try {
      let cache = {};
      try {
        const data = await fs.readFile(CACHE_FILE, 'utf8');
        cache = JSON.parse(data);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.error('Error reading cache file:', error);
        }
      }
      cache[userId] = { status, timestamp: Date.now() };
      await fs.writeFile(CACHE_FILE, JSON.stringify(cache));
    } catch (error) {
      logger.error('Error writing cache file:', error);
    }
  },

  async logMessage(userId) {
    try {
      let log = {};
      try {
        const data = await fs.readFile(MESSAGE_LOG_FILE, 'utf8');
        log = JSON.parse(data);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.error('Error reading message log file:', error);
        }
      }
      log[userId] = (log[userId] || 0) + 1;
      await fs.writeFile(MESSAGE_LOG_FILE, JSON.stringify(log));
    } catch (error) {
      logger.error('Error writing message log file:', error);
    }
  },

  async getMessageCount(userId) {
    try {
      const data = await fs.readFile(MESSAGE_LOG_FILE, 'utf8');
      const log = JSON.parse(data);
      return log[userId] || 0;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Error reading message log file:', error);
      }
      return 0;
    }
  }
};