// src/services/systemPromptManager.js

const { LLMChain } = require("langchain/chains");
const { OpenAI } = require("langchain/llms/openai");
const { PromptTemplate } = require("langchain/prompts");
const logger = require('../../utils/logger');
const dataManagementService = require('./dataManagementService');

class SystemPromptManager {
  constructor() {
    this.llm = new OpenAI({ temperature: 0.7 });
    this.promptSelectionChain = new LLMChain({
      llm: this.llm,
      prompt: PromptTemplate.fromTemplate(
        "Based on the following context and user data, select the most appropriate system prompt from the list or generate a new one if necessary. Context: {context}\n\nUser data: {userData}\n\nAvailable prompts:\n1. You are an AI assistant focused on personal growth and development.\n2. You are an AI career advisor helping with professional development.\n3. You are an AI therapist providing emotional support and guidance.\n\nSelected or generated prompt:"
      ),
    });
  }

  async getSystemPrompt(userId, context) {
    logger.info(`Getting system prompt for user ${userId}`);
    try {
      const userData = await dataManagementService.getUserData(userId);
      const result = await this.promptSelectionChain.call({ 
        context: context,
        userData: JSON.stringify(userData)
      });
      const selectedPrompt = result.text.trim();
      logger.info(`Selected system prompt for user ${userId}: ${selectedPrompt}`);
      return selectedPrompt;
    } catch (error) {
      logger.error(`Error getting system prompt for user ${userId}:`, error);
      throw error;
    }
  }

  async updateSystemPrompt(userId, newPrompt) {
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

module.exports = new SystemPromptManager();