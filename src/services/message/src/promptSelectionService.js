// src/services/message/src/promptSelectionService.js

const { LLMChain } = require("langchain/chains");
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const config = require('../../../config');
const logger = require('../../../utils/logger');
const managementService = require('../../management');

class PromptSelectionService {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      openAIApiKey: config.openaiApiKey,
    });

    this.promptSelectionChain = new LLMChain({
      llm: this.llm,
      prompt: PromptTemplate.fromTemplate(
        "Based on the following user data and their current message, select the most appropriate system prompt from the list or generate a new one if necessary. User data: {userData}\n\nUser's current message: {userMessage}\n\nAvailable prompts:\n1. You are an AI assistant focused on personal growth and development.\n2. You are an AI career advisor helping with professional development.\n3. You are an AI therapist providing emotional support and guidance.\n\nSelected or generated prompt:"
      ),
      outputParser: new StringOutputParser(),
    });
  }

  async selectPrompt(userId, userMessage) {
    logger.info(`Selecting prompt for user ${userId}`);
    try {
    //   const userData = await managementService.getUserData(userId);
    //   const result = await this.chain.call({
    //     userData: JSON.stringify(userData, null, 2),
    //     userMessage: userMessage,
    //   });

    //   const selectedPrompt = result.text.trim();
      const selectedPrompt = "Ответь на сообщение ниже";
      logger.info(`Selected system prompt for user ${userId}: ${selectedPrompt}`);
      return selectedPrompt;
    } catch (error) {
      logger.error(`Error selecting prompt for user ${userId}:`, error);
      return "Ответь на сообщение ниже"; // Возвращаем стандартный промпт в случае ошибки
    }
  }

  async updatePrompt(userId, newPrompt) {
    logger.info(`Updating system prompt for user ${userId}`);
    try {
      await dataManagementService.updateUserData(userId, { currentSystemPrompt: newPrompt });
      logger.info(`System prompt updated for user ${userId}`);
    } catch (error) {
      logger.error(`Error updating system prompt for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new PromptSelectionService();