// src/services/memory/insightExtractionService.js

const Groq = require('groq-sdk');
const config = require('../../config');
const logger = require('../../utils/logger');
const simpleNlpService = require('../messaging/simpleNlpService');
const prisma = require('../../db/prisma');

class InsightExtractionService {
  constructor() {
    this.groq = new Groq({ apiKey: config.llm.groq });
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
    try {
      const prompt = `
        Analyze the following conversation and extract key insights about the user:
        ${conversation}
        
        ${keywordInfo}
        
        Please provide a concise summary of the main points, user preferences, and any notable information.
      `;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-70b-v2",
        temperature: 0.5,
        max_tokens: 1024,
      });

      return completion.choices[0]?.message?.content || "No insights extracted";
    } catch (error) {
      logger.error('Error extracting insights with LLaMA:', error);
      throw error;
    }
  }

  async extractInsightsGemini(conversation, keywordInfo) {
    // Заглушка для будущей реализации Gemini Flash 1.5
    logger.warn('Gemini Flash 1.5 API not implemented yet');
    throw new Error('Gemini Flash 1.5 API not implemented yet');
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