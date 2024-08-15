// src/services/modelSelectionService.js

const { Configuration, OpenAIApi } = require('openai');
const config = require('../../config/config');
const logger = require('../../utils/logger');

class ModelSelectionService {
  constructor() {
    this.openai = new OpenAIApi(new Configuration({ apiKey: config.openaiApiKey }));
    this.models = {
      'gpt-4o': this.useGPT4,
      'claude-3.5-sonnet': this.useClaude
    };
  }

  async selectModel(userId, message) {
    // Здесь может быть логика выбора модели на основе сообщения или пользователя
    // Пока что будем использовать GPT-4 по умолчанию
    return this.models['gpt-4o'];
  }

  async useGPT4(message) {
    try {
      const response = await this.openai.createChatCompletion({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
        max_tokens: 1000
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('Error using GPT-4:', error);
      throw error;
    }
  }

  async useClaude(message) {
    // Реализация запроса к Claude 3.5 Sonnet
    // Примечание: этот метод нужно будет реализовать, когда у нас будет доступ к API Claude
    logger.warn('Claude 3.5 Sonnet API not implemented yet');
    throw new Error('Claude 3.5 Sonnet API not implemented yet');
  }
}

module.exports = new ModelSelectionService();