// src/services/memory/insightExtractionService.js

const { GroqClient } = require('groq-sdk');
const config = require('../../config/config');
const logger = require('../../utils/logger');
const { extractInsightsLLaMA, extractInsightsGemini } = require('./insightExtractionHelpers');
const simpleNlpService = require('../messaging/simpleNlpService');
const prisma = require('../db/prisma');

class InsightExtractionService {
  constructor() {
    this.groqClient = new GroqClient({ apiKey: config.groqApiKey });
  }

  async extractInsights(userId, conversation) {
    try {
      const lastMessage = conversation.split('\n').pop();
      const containsKeywords = simpleNlpService.analyzeText(lastMessage);
      const keywordInfo = containsKeywords ? "Обрати особое внимание на последнее сообщение, так как оно содержит ключевые слова." : "";

      const insights = await this.extractInsightsLLaMA(conversation, keywordInfo);
      
      await this.saveInsights(userId, insights);
      
      logger.info(`Extracted and saved insights for user ${userId}`);
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
    return extractInsightsGemini(conversation, keywordInfo);
  }

  async saveInsights(userId, insights) {
    try {
      await prisma.userData.upsert({
        where: {
          userId_key: {
            userId: BigInt(userId),
            key: 'insights'
          }
        },
        update: {
          value: insights
        },
        create: {
          userId: BigInt(userId),
          key: 'insights',
          value: insights
        }
      });
    } catch (error) {
      logger.error(`Error saving insights for user ${userId}:`, error);
      throw error;
    }
  }

  async getInsights(userId) {
    logger.info(`Retrieving insights for user ${userId}`);
    try {
      const userData = await prisma.userData.findUnique({
        where: {
          userId_key: {
            userId: BigInt(userId),
            key: 'insights'
          }
        }
      });

      return userData?.value || '';
    } catch (error) {
      logger.error(`Error retrieving insights for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new InsightExtractionService();