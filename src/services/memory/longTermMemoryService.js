// // src/services/memory/longTermMemoryService.js

// const { Pinecone } = require('@pinecone-database/pinecone');
// const { OpenAIEmbeddings } = require("@langchain/openai");
// const { PineconeStore } = require("@langchain/pinecone");
// const config = require('../../config');
// const logger = require('../../utils/logger');

// class LongTermMemoryService {
//   constructor() {
//     this.pinecone = new Pinecone({
//       apiKey: config.pinecone.apiKey,
//       environment: config.pinecone.environment,
//     });
//     this.embeddings = new OpenAIEmbeddings({
//       openAIApiKey: config.llm.openai
//     });
//   }

//   async initialize() {
//     try {
//       this.pineconeIndex = this.pinecone.Index(config.pinecone.index);
//       this.vectorStore = await PineconeStore.fromExistingIndex(
//         this.embeddings,
//         { pineconeIndex: this.pineconeIndex }
//       );
//       logger.info('Pinecone vector store initialized successfully');
//     } catch (error) {
//       logger.error('Error initializing Pinecone vector store:', error);
//       throw error;
//     }
//   }

//   async addMemory(userId, content) {
//     try {
//       await this.vectorStore.addDocuments([
//         {
//           pageContent: content,
//           metadata: { userId: userId }
//         }
//       ]);
//       logger.info(`New memory added for user ${userId}`);
//     } catch (error) {
//       logger.error(`Error adding memory for user ${userId}:`, error);
//       throw error;
//     }
//   }

//   async getRelevantMemories(userId, query, k = 5) {
//     try {
//       const results = await this.vectorStore.similaritySearch(query, k, { userId: userId });
//       return results.map(doc => doc.pageContent);
//     } catch (error) {
//       logger.error(`Error retrieving relevant memories for user ${userId}:`, error);
//       throw error;
//     }
//   }
// }

// module.exports = new LongTermMemoryService();