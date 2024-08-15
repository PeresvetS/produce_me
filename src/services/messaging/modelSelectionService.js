// src/services/messaging/modelSelectionService.js

const { OpenAI } = require("langchain/llms/openai");
const config = require('../../config/');
const logger = require('../../utils/logger');

class ModelSelectionService {
  constructor() {
    this.models = {
      'gpt-4o': new OpenAI({ modelName: "gpt-4", temperature: 0.7, maxTokens: 1000 }),
      'claude-3.5-sonnet': null // Claude model not implemented yet
    };
  }

  async selectModel(userId, message) {
    // Здесь может быть логика выбора модели на основе сообщения или пользователя
    // Пока что будем использовать GPT-4 по умолчанию
    return this.models['gpt-4o'];
  }

  async useModel(modelName, message) {
    try {
      const model = this.models[modelName];
      if (!model) {
        throw new Error(`Model ${modelName} not implemented`);
      }
      const response = await model.call(message);
      return response;
    } catch (error) {
      logger.error(`Error using model ${modelName}:`, error);
      throw error;
    }
  }
}

module.exports = new ModelSelectionService();