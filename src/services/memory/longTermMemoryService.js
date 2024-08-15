// src/services/longTermMemoryService.js

const Mem0 = require('mem0ai');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const config = require('../../config/config');
const logger = require('../../utils/logger');

class LongTermMemoryService {
  constructor() {
    this.mem0 = new Mem0(config.mem0ApiKey);
    this.embeddings = new OpenAIEmbeddings();
  }

  async initialize() {
    await this.mem0.initialize();
    logger.info('LongTermMemoryService initialized');
  }

  async addMemory(userId, content) {
    try {
      const vector = await this.embeddings.embedQuery(content);
      
      // Проверяем наличие похожих воспоминаний
      const similarMemories = await this.findSimilarMemories(userId, vector);
      
      if (similarMemories.length > 0) {
        // Удаляем старые похожие воспоминания
        for (const memory of similarMemories) {
          await this.mem0.deleteMemory(memory.id);
          logger.info(`Deleted old similar memory for user ${userId}: ${memory.id}`);
        }
      }

      // Сохраняем новое воспоминание
      await this.mem0.storeMemory({
        userId,
        content,
        vector,
        timestamp: new Date().toISOString(),
      });
      
      logger.info(`New memory added for user ${userId}`);
    } catch (error) {
      logger.error(`Error processing memory for user ${userId}:`, error);
      throw error;
    }
  }

  async findSimilarMemories(userId, vector, similarityThreshold = 0.8) {
    try {
      const memories = await this.mem0.searchMemories({
        userId,
        vector,
        limit: 5,
      });

      return memories.filter(memory => memory.similarity > similarityThreshold);
    } catch (error) {
      logger.error(`Error finding similar memories for user ${userId}:`, error);
      throw error;
    }
  }

  async getRelevantMemories(userId, query, limit = 5) {
    try {
      const queryVector = await this.embeddings.embedQuery(query);
      const memories = await this.mem0.searchMemories({
        userId,
        vector: queryVector,
        limit,
      });
      
      const relevantMemories = memories.map(memory => memory.content);
      logger.info(`Retrieved ${relevantMemories.length} relevant memories for user ${userId}`);
      return relevantMemories;
    } catch (error) {
      logger.error(`Error retrieving relevant memories for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new LongTermMemoryService();