// src/services/vectorSearchService.js

const { PineconeClient } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const logger = require('../../utils/logger');
const config = require('../../config/config');

class VectorSearchService {
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

  async searchSimilarDocuments(query, topK = 5) {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const searchResponse = await this.index.query({
        queryRequest: {
          vector: queryEmbedding,
          topK,
          includeMetadata: true,
        },
      });
      return searchResponse.matches.map(match => match.metadata.text);
    } catch (error) {
      logger.error('Error searching similar documents:', error);
      throw error;
    }
  }

  async addDocument(text, metadata = {}) {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      await this.index.upsert({
        upsertRequest: {
          vectors: [{
            id: `doc_${Date.now()}`,
            values: embedding,
            metadata: { ...metadata, text },
          }],
        },
      });
      logger.info('Document added to Pinecone index');
    } catch (error) {
      logger.error('Error adding document to Pinecone:', error);
      throw error;
    }
  }
}

module.exports = new VectorSearchService();