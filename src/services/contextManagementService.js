// src/services/contextManagementService.js

const { ConversationChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');
const logger = require('../utils/logger');
const modelSelectionService = require('./modelSelectionService');

class ContextManagementService {
  constructor() {
    this.conversations = new Map();
  }

  async getOrCreateConversation(userId) {
    if (!this.conversations.has(userId)) {
      const memory = new BufferMemory();
      const chain = new ConversationChain({ memory });
      this.conversations.set(userId, chain);
    }
    return this.conversations.get(userId);
  }

  async processMessage(userId, message) {
    try {
      const conversation = await this.getOrCreateConversation(userId);
      const model = await modelSelectionService.selectModel(userId, message);
      
      // Используем выбранную модель для генерации ответа
      const response = await model(message);

      // Обновляем память беседы
      await conversation.memory.saveContext({ input: message }, { output: response });

      return response;
    } catch (error) {
      logger.error(`Error processing message for user ${userId}:`, error);
      throw error;
    }
  }

  async resetConversation(userId) {
    this.conversations.delete(userId);
    logger.info(`Conversation reset for user ${userId}`);
  }

  async getConversationHistory(userId) {
    const conversation = this.conversations.get(userId);
    if (!conversation) {
      return '';
    }
    return conversation.memory.chatHistory.toString();
  }
}

module.exports = new ContextManagementService();