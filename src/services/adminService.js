// src/services/adminService.js

// const prisma = require('../db/prisma');
const logger = require('../utils/logger');
const config = require('../config');

module.exports = {
  async isAdmin(userId) {
    logger.info(`Checking if user ${userId} is an admin`);
    try {
    //   const admin = await prisma.admin.findUnique({ where: { userId: userId.toString() } });
    //   return !!admin;

    if (config.adminTgId == userId) {
      return true;
    }

    return false;
 
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }
};