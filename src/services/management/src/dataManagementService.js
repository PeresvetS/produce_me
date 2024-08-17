// src/services/management/src/dataManagementService.js

const prisma = require('../../../db/prisma');
const logger = require('../../../utils/logger');

class DataManagementService {
  async createUser(userId, username) {
    try {
      await prisma.user.create({
        data: {
          userId: userId.toString(),
          username: username,
          userData: {}
        }
      });
      logger.info(`User created: ${userId}`);
    } catch (error) {
      if (error.code === 'P2002') {
        logger.info(`User already exists: ${userId}`);
      } else {
        logger.error('Error creating user:', error);
        throw error;
      }
    }
  }

  async updateUserData(userId, data) {
    try {
      const user = await prisma.user.findUnique({ where: { userId: userId.toString() } });
      const updatedUserData = { ...user.userData, ...data };
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

  async getUserData(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() },
        select: { userData: true }
      });
      return user?.userData || {};
    } catch (error) {
      logger.error('Error getting user data:', error);
      throw error;
    }
  }

  async getAllUsers(limit = 10, offset = 0) {
    try {
      const users = await prisma.user.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      });
      return users;
    } catch (error) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }

  async getUserInfo(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { userId: userId.toString() }
      });
      return user;
    } catch (error) {
      logger.error('Error getting user info:', error);
      throw error;
    }
  }

  async getStats() {
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
      return {
        totalUsers,
        activeUsers,
        totalDialogs: totalDialogs._sum.messageCount || 0
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = new DataManagementService();