// src/services/management/adminService.js

const prisma = require('../../db/prisma');
const logger = require('../../utils/logger');

class AdminService {
  async isAdmin(userId) {
    logger.info(`Checking if user ${userId} is an admin`);
    try {
      const admin = await prisma.admin.findUnique({
        where: { userId: userId }
      });

      return !!admin;
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }

  async addAdmin(userId) {
    logger.info(`Adding new admin: ${userId}`);
    try {
      await prisma.admin.create({
        data: { userId: userId }
      });
      logger.info(`Admin added successfully: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error adding admin:', error);
      return false;
    }
  }

  async removeAdmin(userId) {
    logger.info(`Removing admin: ${userId}`);
    try {
      await prisma.admin.delete({
        where: { userId: userId }
      });
      logger.info(`Admin removed successfully: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error removing admin:', error);
      return false;
    }
  }

  async listAdmins() {
    logger.info('Listing all admins');
    try {
      const admins = await prisma.admin.findMany();
      return admins.map(admin => admin.userId);
    } catch (error) {
      logger.error('Error listing admins:', error);
      return [];
    }
  }
}

module.exports = new AdminService();