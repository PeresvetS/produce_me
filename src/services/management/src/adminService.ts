import logger from '../../../utils/logger';
import config from '../../../config';

export class AdminService {
  async isAdmin(userId: string | number): Promise<boolean> {
    logger.info(`Checking if user ${userId} is an admin`);
    try {
      return config.adminTgId === userId.toString();
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }
}

export const adminService = new AdminService(); 