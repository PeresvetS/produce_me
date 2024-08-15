// src/services/memory/longTermMemoryService.js

const { PineconeClient } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const config = require('../../config/config');
const logger = require('../../utils/logger');

class LongTermMemoryService {
  constructor() {
    this.client = new PineconeClient();
    this.embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small"
    });
  }

  async initialize() {
    await this.client.init({
      apiKey: config.pineconeApiKey,
      environment: config.pineconeEnvironment,
    });
    this.index = this.client.Index(config.pineconeIndexName);
    logger.info('Pinecone client initialized with text-embedding-3-small');
  }

  async addMemory(userId, content) {
    try {
      const embedding = await this.embeddings.embedQuery(content);
      await this.index.upsert({
        upsertRequest: {
          vectors: [{
            id: `user_${userId}_${Date.now()}`,
            values: embedding,
            metadata: { userId, text: content },
          }],
        },
      });
      logger.info(`New memory added for user ${userId}`);
    } catch (error) {
      logger.error(`Error adding memory for user ${userId}:`, error);
      throw error;
    }
  }

  async getRelevantMemories(userId, query, k = 5) {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const searchResponse = await this.index.query({
        queryRequest: {
          vector: queryEmbedding,
          topK: k,
          includeMetadata: true,
          filter: { userId: userId },
        },
      });
      return searchResponse.matches.map(match => match.metadata.text);
    } catch (error) {
      logger.error(`Error retrieving relevant memories for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new LongTermMemoryService();