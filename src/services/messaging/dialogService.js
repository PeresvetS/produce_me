// src/services/dialogService.js

const airtable = require('../../db/airtable');
const config = require('../../config/config');
const logger = require('../../utils/logger');

const Users = airtable(config.airtableUsersTableId);

module.exports = {
  async incrementDialogCount(userId) {
    logger.info(`Incrementing dialog count for user: ${userId}`);
    try {
      const records = await Users.select({
        filterByFormula: `{UserId} = '${userId}'`
      }).firstPage();

      if (records.length === 0) {
        logger.error(`User not found: ${userId}`);
        throw new Error('Пользователь не найден');
      }

      const user = records[0];
      const currentMessageCount = user.get('MessageCount') || 0;

      await Users.update([
        {
          id: user.id,
          fields: {
            MessageCount: currentMessageCount + 1
          }
        }
      ]);
      logger.info(`Dialog count incremented for user: ${userId}. New count: ${currentMessageCount + 1}`);
    } catch (error) {
      logger.error('Error in incrementDialogCount:', error);
      throw error;
    }
  },

  async incrementNewDialogCount(userId) {
    logger.info(`Incrementing new dialog count for user: ${userId}`);
    try {
      const records = await Users.select({
        filterByFormula: `{UserId} = '${userId}'`
      }).firstPage();

      if (records.length === 0) {
        logger.error(`User not found: ${userId}`);
        throw new Error('Пользователь не найден');
      }

      const user = records[0];
      const currentNewDialogCount = user.get('NewDialogCount') || 0;

      await Users.update([
        {
          id: user.id,
          fields: {
            NewDialogCount: currentNewDialogCount + 1
          }
        }
      ]);
      logger.info(`New dialog count incremented for user: ${userId}. New count: ${currentNewDialogCount + 1}`);
    } catch (error) {
      logger.error('Error in incrementNewDialogCount:', error);
      throw error;
    }
  },

  async getDialogCounts(userId) {
    logger.info(`Getting dialog counts for user: ${userId}`);
    try {
      const records = await Users.select({
        filterByFormula: `{UserId} = '${userId}'`
      }).firstPage();

      if (records.length === 0) {
        logger.error(`User not found: ${userId}`);
        throw new Error('Пользователь не найден');
      }

      const user = records[0];
      const messageCount = user.get('MessageCount') || 0;
      const newDialogCount = user.get('NewDialogCount') || 0;

      logger.info(`Dialog counts for user ${userId}: MessageCount: ${messageCount}, NewDialogCount: ${newDialogCount}`);
      return { messageCount, newDialogCount };
    } catch (error) {
      logger.error('Error in getDialogCounts:', error);
      throw error;
    }
  },

  async resetDialogCounts(userId) {
    logger.info(`Resetting dialog counts for user: ${userId}`);
    try {
      const records = await Users.select({
        filterByFormula: `{UserId} = '${userId}'`
      }).firstPage();

      if (records.length === 0) {
        logger.error(`User not found: ${userId}`);
        throw new Error('Пользователь не найден');
      }

      const user = records[0];

      await Users.update([
        {
          id: user.id,
          fields: {
            MessageCount: 0,
            NewDialogCount: 0
          }
        }
      ]);
      logger.info(`Dialog counts reset for user: ${userId}`);
    } catch (error) {
      logger.error('Error in resetDialogCounts:', error);
      throw error;
    }
  }
};