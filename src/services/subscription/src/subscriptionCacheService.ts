import NodeCache from 'node-cache';
import logger from '../../../utils/logger';
import { BotType } from '../../../types';

class SubscriptionCacheService {
  private cache: NodeCache;

  constructor(ttlSeconds: number = 3600) {
    this.cache = new NodeCache({ stdTTL: ttlSeconds });
  }

  async setCachedSubscription(userId: string | number, status: boolean): Promise<void> {
    logger.info(`Setting cached subscription for user ${userId}: ${status}`);
    this.cache.set(userId.toString(), status);
  }

  async getCachedSubscription(userId: string | number): Promise<boolean | undefined> {
    logger.info(`Getting cached subscription for user ${userId}`);
    return this.cache.get<boolean>(userId.toString());
  }

  async logMessage(userId: string | number, botType: BotType): Promise<void> {
    logger.info(`Logging message for user ${userId} in bot ${botType}`);
    const key = `message_count_${userId}_${botType}`;
    const count = this.cache.get<number>(key) || 0;
    this.cache.set(key, count + 1);
  }

  async getMessageCount(userId: string | number, botType: BotType): Promise<number> {
    logger.info(`Getting message count for user ${userId} in bot ${botType}`);
    const key = `message_count_${userId}_${botType}`;
    return this.cache.get<number>(key) || 0;
  }

  async resetMessageCount(userId: string | number, botType: BotType): Promise<void> {
    logger.info(`Resetting message count for user ${userId} in bot ${botType}`);
    const key = `message_count_${userId}_${botType}`;
    this.cache.set(key, 0);
  }
}

export const subscriptionCacheService = new SubscriptionCacheService(); 