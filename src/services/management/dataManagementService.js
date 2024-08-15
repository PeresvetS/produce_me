// src/services/management/dataManagementService.js

const prisma = require('../../db/prisma');
const logger = require('../../utils/logger');

class DataManagementService {
  async createUser(userId, username) {
    try {
      await prisma.user.create({
        data: {
          userId: userId,
          username: username,
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
      await prisma.user.update({
        where: { userId: userId },
        data: { data: { ...data } }
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
        where: { userId: userId },
        select: { data: true }
      });
      return user?.data || {};
    } catch (error) {
      logger.error('Error getting user data:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      await prisma.user.delete({
        where: { userId: userId }
      });
      logger.info(`User deleted: ${userId}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async listUsers(limit = 10, offset = 0) {
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
}

module.exports = new DataManagementService();