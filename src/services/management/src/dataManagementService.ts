import  prisma  from '../../../db/prisma';
import  logger  from '../../../utils/logger';
import { User, BotType } from '../../../types';
import { UserWithBotInfo, UserData, UserInfo } from '../../../types/management';
import config from '../../../config';

export class DataManagementService {
  async checkUserByID(userId: string | number): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { userId: userId.toString() }
    });
    return user as User | null;
  }

  async checkUserByUsername(username: string): Promise<User | null> {
    logger.info(`Checking user by username: ${username}`);
    const user = await prisma.user.findUnique({
      where: { username }
    });
    return user as User | null;
  }

  async checkUser(userId: string | number, username: string): Promise<User | false> {
    logger.info(`Checking user: ${username}`);
    const user = await this.checkUserByUsername(username);
    if (!user) {
      return false;
    }
    const currentUserId = user.userId;
    if (currentUserId.startsWith('temp')) {
      await this.updateUserID(userId, username);
    }
    return user;
  }

  async createUserByUsername(username: string): Promise<User> {
    logger.info(`Creating new user: ${username}`);

    try {
      const user = await prisma.user.create({
        data: {
          userId: `temp_${Date.now()}`,
          username,
          messageCount: 0,
          newDialogCount: 0,
          totalTokensUsed: 0,
          subscriptionEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          userData: {}
        }
      });
      
      logger.info(`User created with username: ${username}`, user);
      return user;
      
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        logger.info(`User already exists with username: ${username}`);
        const existingUser = await prisma.user.findUnique({
          where: { username }
        });
        if (!existingUser) {
          throw new Error('Unexpected error: User not found after P2002 error');
        }
        return existingUser;
      }
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserID(userId: string | number, username: string): Promise<void> {
    logger.info(`Updating user ID: ${userId}`);
    try {
      await prisma.user.update({
        where: { username },
        data: { userId: userId.toString() }
      });
      logger.info(`User ID updated: ${userId}`);
    } catch (error) {
      logger.error('Error updating user ID:', error);
      throw error;
    }
  }

  async checkOrCreateUser(userId: string | number, username: string): Promise<User | false> {
    logger.info(`Checking or creating user: ${userId}`);
    try {
      let user = await this.checkUser(userId, username);
      if (!user) {
        user = await this.createUser(userId, username);
        logger.info(`Created new user: ${userId}`);
      } else {
        logger.info(`User already exists: ${userId}`);
      }
      return user;
    } catch (error) {
      logger.error('Error in checkOrCreateUser:', error);
      throw error;
    }
  }

  async createUser(userId: string | number, username: string): Promise<User> {
    try {
      return await prisma.user.create({
        data: {
          userId: userId.toString(),
          username,
          userData: {}
        }
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        logger.info(`User already exists: ${userId}`);
        const existingUser = await prisma.user.findUnique({
          where: { username }
        });
        if (!existingUser) {
          throw new Error('Unexpected error: User not found after P2002 error');
        }
        return existingUser;
      }
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserData(userId: string | number, data: UserData): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ 
        where: { userId: userId.toString() } 
      });
      if (!user) {
        throw new Error('User not found');
      }
      const updatedUserData = { ...(user.userData as object || {}), ...data };
      await prisma.user.update({
        where: { userId: userId.toString() },
        data: { userData: updatedUserData }
      });
      logger.info(`User data updated: ${userId}`);
    } catch (error) {
      logger.error('Error updating user data:', error);
      throw error;
    }
  }

  async getUserData(userId: string | number): Promise<UserData> {
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() },
        select: { userData: true }
      });
      return (user?.userData as UserData) || {};
    } catch (error) {
      logger.error('Error getting user data:', error);
      throw error;
    }
  }

  async getAllUsers(limit = 10, offset = 0): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      });
      return users as User[];
    } catch (error) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }

  async getBotUsers(botType: BotType, limit = 10): Promise<UserWithBotInfo[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          botThreads: {
            some: {
              botType
            }
          }
        },
        take: limit,
        include: {
          botThreads: true,
          conversations: {
            where: {
              botType
            }
          }
        }
      });
      return users.map((user) => ({
          name: '',
          userId: user.userId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          userData: user.userData,
          dialogCount: user.conversations?.length ?? 0,
          threadId: user.botThreads?.find(bt => bt.botType === botType)?.threadId ?? undefined,
          messageCount: user.conversations?.length ?? 0,
          newDialogCount: 0,
          totalTokensUsed: 0,
          lastActive: user.conversations?.[0]?.timestamp,
          isActive: false,
          isBlocked: false,
          isBanned: false
      })) as unknown as UserWithBotInfo[];
    } catch (error) {
      logger.error(`Error getting users for bot type ${botType}:`, error);
      throw error;
    }
  }

  async incrementDialogCount(userId: string | number): Promise<void> {
    try {
      await prisma.user.update({
        where: { userId: userId.toString() },
        data: {
          messageCount: {
            increment: 1
          }
        }
      });
      logger.info(`Dialog count incremented for user ${userId}`);
    } catch (error) {
      logger.error(`Error incrementing dialog count for user ${userId}:`, error);
      throw error;
    }
  }

  async isAdmin(userId: string | number): Promise<boolean> {
    try {
      const adminIds = config.adminTgId ?? [];
      return adminIds.includes(userId.toString());
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }

  async getUserInfo(userId: string | number): Promise<UserInfo> {
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() }
      });
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      return {
        username: user.username,
        newDialogCount: user.newDialogCount,
        subscriptionEnd: user.subscriptionEnd
      };
    } catch (error) {
      logger.error(`Error getting user info for ${userId}:`, error);
      throw error;
    }
  }
}

export const dataManagementService = new DataManagementService(); 