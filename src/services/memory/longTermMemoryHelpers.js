// src/services/longTermMemoryHelpers.js

const logger = require('../../utils/logger');

/**
 * Stores a memory for a specific user
 * @param {Object} mem0 - Initialized Mem0 client
 * @param {string} userId - User identifier
 * @param {string} content - Memory content
 */
async function storeMemory(mem0, userId, content) {
  try {
    await mem0.storeMemory({
      userId,
      content,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error storing memory for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Retrieves relevant memories for a user based on a query
 * @param {Object} mem0 - Initialized Mem0 client
 * @param {string} userId - User identifier
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of memories to retrieve
 * @returns {Array} Array of relevant memories
 */
async function retrieveMemories(mem0, userId, query, limit) {
  try {
    const memories = await mem0.searchMemories({
      userId,
      query,
      limit,
    });
    return memories;
  } catch (error) {
    logger.error(`Error retrieving memories for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  storeMemory,
  retrieveMemories,
};