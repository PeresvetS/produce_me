// adminService.js

const airtable = require('../db/airtable');
const config = require('../config/config');
const logger = require('../utils/logger');

const Admins = airtable(config.airtableAdminsTableId);

module.exports = {
  async isAdmin(userId) {
    logger.info(`Checking if user ${userId} is an admin`);
    try {
      const records = await Admins.select({
        filterByFormula: `{UserId} = '${userId}'`
      }).firstPage();

      return records.length > 0;
    } catch (error) {
      logger.error('Error checking admin status:', error);
      return false;
    }
  }
};