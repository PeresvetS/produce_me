// src/services/insightExtractionService.js

const { GroqClient } = require('groq-sdk');
const config = require('../config/config');
const logger = require('../utils/logger');
const { extractInsightsLLaMA, extractInsightsGemini } = require('./insightExtractionHelpers');
const simpleNlpService = require('./simpleNlpService');

class InsightExtractionService {
  constructor() {
    this.groqClient = new GroqClient({ apiKey: config.groqApiKey });
  }

  async extractInsights(userId, conversation) {
    try {
      // Анализируем последнее сообщение на наличие ключевых слов
      const lastMessage = conversation.split('\n').pop();
      const containsKeywords = simpleNlpService.analyzeText(lastMessage);

      // Добавляем информацию о ключевых словах в промпт
      const keywordInfo = containsKeywords ? "Обрати особое внимание на последнее сообщение, так как оно содержит ключевые слова." : "";

      // По умолчанию используем LLaMA 3.1-70B
      const insights = await this.extractInsightsLLaMA(conversation, keywordInfo);
      logger.info(`Extracted insights for user ${userId}`);
      return insights;
    } catch (error) {
      logger.error(`Error extracting insights for user ${userId}:`, error);
      throw error;
    }
  }

  async extractInsightsLLaMA(conversation, keywordInfo) {
    return extractInsightsLLaMA(this.groqClient, conversation, keywordInfo);
  }

  async extractInsightsGemini(conversation, keywordInfo) {
    // Примечание: эта функция пока не реализована, так как Gemini Flash 1.5 не доступен
    return extractInsightsGemini(conversation, keywordInfo);
  }
}

module.exports = new InsightExtractionService();