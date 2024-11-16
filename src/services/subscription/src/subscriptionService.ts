import moment from 'moment';
import prisma from '../../../db/prisma';
import logger from '../../../utils/logger';
import { dataManagementService } from '../../management';
import { subscriptionCacheService } from './subscriptionCacheService';
import { BotType, User, Stats } from '../../../types';

export class SubscriptionService {
  async checkSubscription(userId: string | number): Promise<boolean> {
    logger.info(`Checking subscription for user: ${userId}`);
    try {
      const cachedStatus = await subscriptionCacheService.getCachedSubscription(userId);
      if (cachedStatus !== undefined) {
        logger.info(`Using cached subscription status for user ${userId}: ${cachedStatus}`);
        return cachedStatus;
      }

      logger.info(`Cache miss for user ${userId}, checking database`);
      return this.checkSubscriptionFromDatabase(userId);
    } catch (error) {
      logger.error('Error in checkSubscription:', error);
      throw error;
    }
  }

  async checkSubscriptionFromDatabase(userId: string | number): Promise<boolean> {
    logger.info(`Checking subscription in database for user: ${userId}`);
    try {
      const user = await dataManagementService.checkUserByID(userId);
      if (!user) {
        logger.warn(`User not found in database: ${userId}`);
        await subscriptionCacheService.setCachedSubscription(userId, false);
        return false;
      }

      const status = user.subscriptionEnd && moment(user.subscriptionEnd).isAfter(moment());
      if (status) {
        await subscriptionCacheService.setCachedSubscription(userId, status);
      }
      
      return status ?? false;
    } catch (error) {
      logger.error('Error checking subscription in database:', error);
      throw error;
    }
  }

  async addSubscription(username: string, months: number): Promise<string> {
    logger.info(`Adding subscription for user: ${username}, months: ${months}`);
    try {
      let user = await dataManagementService.checkUserByUsername(username);
      if (!user) {
        logger.info(`User ${username} not found. Creating new user.`);
        user = await dataManagementService.createUserByUsername(username);
        if (!user) {
          throw new Error(`Failed to create user ${username}`);
        }
      }

      const currentEnd = user.subscriptionEnd ? moment(user.subscriptionEnd) : moment();
      const newEnd = currentEnd.isAfter(moment()) 
        ? currentEnd.add(months, 'months')
        : moment().add(months, 'months');

      const updatedUser = await prisma.user.update({
        where: { username },
        data: { 
          subscriptionEnd: newEnd.toDate(),
          updatedAt: new Date()
        }
      });

      logger.info(`Subscription updated for user ${username}:`, updatedUser);
      return `Подписка для пользователя @${username} успешно добавлена до ${newEnd.format('DD.MM.YYYY')}`;
    } catch (error) {
      logger.error('Error in addSubscription:', error);
      throw new Error(`Ошибка при добавлении подписки: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStats(): Promise<Stats> {
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

      const stats: Stats = {
        totalUsers,
        activeUsers,
        totalDialogs: totalDialogs._sum.messageCount || 0
      };

      logger.info(`Stats fetched: Total users: ${stats.totalUsers}, Active users: ${stats.activeUsers}, Total dialogs: ${stats.totalDialogs}`);
      return stats;
    } catch (error) {
      logger.error('Error in getStats:', error);
      throw error;
    }
  }

  async getUserThreadId(userId: string | number, botType: BotType): Promise<string | null> {
    try {
      const botThread = await prisma.botThread.findUnique({
        where: {
          userId_botType: {
            userId: userId.toString(),
            botType
          }
        }
      });
      
      if (botThread) {
        return botThread.threadId;
      }
      
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() }
      });
      
      if (user?.threadId) {
        await this.setUserThreadId(userId, botType, user.threadId);
        return user.threadId;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting thread ID for user ${userId} and bot type ${botType}:`, error);
      throw error;
    }
  }

  async setUserThreadId(userId: string | number, botType: BotType, threadId: string | null): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() }
      });
  
      if (!user) {
        logger.error(`User with ID ${userId} not found. Cannot set threadId.`);
        throw new Error(`User with ID ${userId} not found`);
      }
  
      await prisma.botThread.upsert({
        where: {
          userId_botType: {
            userId: userId.toString(),
            botType
          }
        },
        update: {
          threadId
        },
        create: {
          botType,
          threadId,
          user: {
            connect: { userId: userId.toString() }
          }
        }
      });
  
      logger.info(`Successfully set thread ID for user ${userId} and bot type ${botType}. ThreadId: ${threadId || 'null'}`);
    } catch (error) {
      logger.error(`Error setting thread ID for user ${userId} and bot type ${botType}:`, error);
      throw error;
    }
  }

  async getTotalTokensUsed(userId: string | number): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { userId: userId.toString() },
      select: { totalTokensUsed: true }
    });
    return user?.totalTokensUsed || 0;
  }

  async updateTokenUsage(userId: string | number, tokensUsed: number): Promise<void> {
    logger.info(`Updating token usage for user ${userId}: +${tokensUsed} tokens`);
    try {
      await prisma.user.update({
        where: { userId: userId.toString() },
        data: {
          totalTokensUsed: {
            increment: tokensUsed
          }
        }
      });
      logger.info(`Token usage updated for user ${userId}`);
    } catch (error) {
      logger.error(`Error updating token usage for user ${userId}:`, error);
      throw error;
    }
  }

  async logMessage(userId: string | number, botType: BotType): Promise<void> {
    try {
      await prisma.conversation.create({
        data: {
          userId: userId.toString(),
          botType,
          timestamp: new Date(),
          userMessage: '',
          assistantMessage: ''
        }
      });
      logger.info(`Message logged for user ${userId} in bot ${botType}`);
    } catch (error) {
      logger.error(`Error logging message for user ${userId}:`, error);
      throw error;
    }
  }

  async getMessageCount(userId: string | number): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() },
        select: { messageCount: true }
      });
      return user?.messageCount || 0;
    } catch (error) {
      logger.error(`Error getting message count for user ${userId}:`, error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();