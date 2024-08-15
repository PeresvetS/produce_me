// src/services/dataManagementService.js

const db = require('../../db/postgresConfig');
const logger = require('../../utils/logger');

class DataManagementService {
  async createUser(userId, username) {
    const query = 'INSERT INTO users(user_id, username) VALUES($1, $2) ON CONFLICT (user_id) DO NOTHING';
    try {
      await db.query(query, [userId, username]);
      logger.info(`User created or already exists: ${userId}`);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUserData(userId, data) {
    const query = 'UPDATE users SET data = data || $1 WHERE user_id = $2';
    try {
      await db.query(query, [data, userId]);
      logger.info(`User data updated: ${userId}`);
    } catch (error) {
      logger.error('Error updating user data:', error);
      throw error;
    }
  }

  async getUserData(userId) {
    const query = 'SELECT data FROM users WHERE user_id = $1';
    try {
      const result = await db.query(query, [userId]);
      return result.rows[0]?.data || {};
    } catch (error) {
      logger.error('Error getting user data:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    const query = 'DELETE FROM users WHERE user_id = $1';
    try {
      await db.query(query, [userId]);
      logger.info(`User deleted: ${userId}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async listUsers(limit = 10, offset = 0) {
    const query = 'SELECT user_id, username, data FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    try {
      const result = await db.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }
}

module.exports = new DataManagementService();