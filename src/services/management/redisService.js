// src/services/management/redisService.js

const Redis = require('ioredis');
const { promisify } = require('util');
const config = require('../../config');

class RedisService {
  constructor() {
    this.redis = new Redis(config.database.redis);
    this.getAsync = promisify(this.redis.get).bind(this.redis);
    this.setAsync = promisify(this.redis.set).bind(this.redis);
    this.delAsync = promisify(this.redis.del).bind(this.redis);
  }

  // Кэширование
  async cacheGet(key) {
    return await this.getAsync(key);
  }

  async cacheSet(key, value, expireTime = 3600) {
    await this.setAsync(key, value, 'EX', expireTime);
  }

  async cacheDel(key) {
    await this.delAsync(key);
  }

  // Управление состоянием диалогов
  async setDialogState(userId, state) {
    await this.setAsync(`dialog:${userId}`, JSON.stringify(state));
  }

  async getDialogState(userId) {
    const state = await this.getAsync(`dialog:${userId}`);
    return state ? JSON.parse(state) : null;
  }

  // Ограничение скорости запросов
  async isRateLimited(key, limit, window) {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    return current > limit;
  }

  // Очереди задач
  async addToQueue(queue, task) {
    await this.redis.rpush(queue, JSON.stringify(task));
  }

  async getFromQueue(queue) {
    const task = await this.redis.lpop(queue);
    return task ? JSON.parse(task) : null;
  }

  // Хранение сессий
  async setSession(sessionId, data, expireTime = 3600) {
    await this.setAsync(`session:${sessionId}`, JSON.stringify(data), 'EX', expireTime);
  }

  async getSession(sessionId) {
    const session = await this.getAsync(`session:${sessionId}`);
    return session ? JSON.parse(session) : null;
  }

  // Pub/Sub для реального времени
  subscribe(channel, callback) {
    const subscriber = this.redis.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (chan, message) => {
      if (chan === channel) {
        callback(JSON.parse(message));
      }
    });
  }

  publish(channel, message) {
    this.redis.publish(channel, JSON.stringify(message));
  }
}

module.exports = new RedisService();