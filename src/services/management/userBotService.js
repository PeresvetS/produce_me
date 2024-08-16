// src/services/management/userBotService.js

const subscriptionService = require('./subscriptionService');
const dialogService = require('../messaging/dialogService');
// const contextManagementService = require('../memory/contextManagementService');
// const longTermMemoryService = require('../memory/longTermMemoryService');
const initialSurveyService = require('../messaging/initialSurveyService');
// const inputPreprocessingService = require('../messaging/inputPreprocessingService');
// const simpleNlpService = require('../messaging/simpleNlpService');
// const insightExtractionService = require('../memory/insightExtractionService');
const groqService = require('../messaging/groqService');
const logger = require('../../utils/logger');

class BotLogicService {
  async startNewDialog(userId, username, isNewProducer = false) {
    const subscriptionStatus = await subscriptionService.checkOrCreateUser(userId, username);
    if (subscriptionStatus) {
      let message = isNewProducer 
        ? 'Начинаем новый диалог с AI-продюсером! Чем я могу тебе помочь?'
        : 'Добро пожаловать, я твой AI-продюсер Лея! Чтобы начать общение, просто отправь сообщение';
      await dialogService.incrementNewDialogCount(userId);
      // await contextManagementService.resetConversation(userId);
      return message;
    } else {
      return 'У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps';
    }
  }

  async startSurvey(userId) {
    try {
      return await initialSurveyService.startSurvey(userId);
    } catch (error) {
      logger.error('Error starting survey:', error);
      throw error;
    }
  }

  async processTextMessage(userId, rawMessage) {
    try {
      const subscriptionStatus = await subscriptionService.checkSubscription(userId);
      if (!subscriptionStatus) {
        return 'У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps';
      }

      // const cleanedMessage = await inputPreprocessingService.cleanInput(rawMessage);
      // const preprocessedMessage = await inputPreprocessingService.preprocess(cleanedMessage);

      // const relevantMemories = await longTermMemoryService.getRelevantMemories(userId, preprocessedMessage);
      // const contextWithMemories = `Relevant memories:\n${relevantMemories.join('\n')}\n\nCurrent message: ${preprocessedMessage}`;
      const contextWithMemories = rawMessage;

      const response = await contextManagementService.processMessage(userId, contextWithMemories);

      // await longTermMemoryService.addMemory(userId, preprocessedMessage);

      // const containsKeywords = simpleNlpService.analyzeText(preprocessedMessage);

      const dialogCounts = await dialogService.getDialogCounts(userId);
      // if (containsKeywords || dialogCounts.messageCount % 15 === 0) {
      //   const conversation = await contextManagementService.getConversationHistory(userId);
      //   await insightExtractionService.extractInsights(userId, conversation);
      // }
      
      await dialogService.incrementDialogCount(userId);

      return response;
    } catch (error) {
      logger.error('Error processing text message:', error);
      throw error;
    }
  }

  async processVoiceMessage(userId, filePath) {
    try {
      const transcribedText = await groqService.transcribeAudio(filePath);
      return await this.processTextMessage(userId, transcribedText);
    } catch (error) {
      logger.error('Error processing voice message:', error);
      throw error;
    }
  }
}

module.exports = new BotLogicService();