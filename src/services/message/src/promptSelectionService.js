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
        "Based on the following user data, their current message, and the bot type, select the most appropriate system prompt from the list or generate a new one if necessary. User data: {userData}\n\nUser's current message: {userMessage}\n\nBot type: {botType}\n\nAvailable prompts:\n1. You are an AI assistant focused on personal growth and development.\n2. You are an AI career advisor helping with professional development.\n3. You are an AI therapist providing emotional support and guidance.\n4. You are an AI producer helping with content creation and strategy.\n5. You are an AI marketer assisting with marketing strategies and campaigns.\n6. You are an AI customer development specialist helping with market research and product validation.\n\nSelected or generated prompt:"
      ),
      outputParser: new StringOutputParser(),
    });
  }

  async selectPrompt(userId, userMessage, botType) {
    logger.info(`Selecting prompt for user ${userId} in bot ${botType}`);
    try {
      const userData = await managementService.getUserData(userId);
      const result = await this.promptSelectionChain.call({
        userData: JSON.stringify(userData, null, 2),
        userMessage: userMessage,
        botType: botType
      });

      const selectedPrompt = result.text.trim();
      logger.info(`Selected system prompt for user ${userId} in bot ${botType}: ${selectedPrompt}`);
      return selectedPrompt;
    } catch (error) {
      logger.error(`Error selecting prompt for user ${userId} in bot ${botType}:`, error);
      return "Ответь на сообщение ниже"; // Возвращаем стандартный промпт в случае ошибки
    }
  }

  async updatePrompt(userId, newPrompt, botType) {
    logger.info(`Updating system prompt for user ${userId} in bot ${botType}`);
    try {
      await managementService.updateUserData(userId, { [`currentSystemPrompt_${botType}`]: newPrompt });
      logger.info(`System prompt updated for user ${userId} in bot ${botType}`);
    } catch (error) {
      logger.error(`Error updating system prompt for user ${userId} in bot ${botType}:`, error);
      throw error;
    }
  }

  
}

module.exports = new PromptSelectionService();