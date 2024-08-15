// src/services/inputPreprocessingService.js

const { removeStopwords } = require('stopword');
const { LLMChain } = require("langchain/chains");
const { OpenAI } = require("langchain/llms/openai");
const { PromptTemplate } = require("langchain/prompts");
const logger = require('../../utils/logger');

class InputPreprocessingService {
  constructor() {
    this.llm = new OpenAI({ temperature: 0 });
    this.preprocessChain = new LLMChain({
      llm: this.llm,
      prompt: PromptTemplate.fromTemplate(
        "Preprocess the following text for NLP tasks. Remove stopwords, perform stemming, and normalize the text:\n\n{text}\n\nPreprocessed text:"
      ),
    });
  }

  async preprocess(text) {
    logger.info('Preprocessing input text with LangChain');
    try {
      const result = await this.preprocessChain.call({ text });
      logger.info('Input preprocessing completed');
      return result.text.trim();
    } catch (error) {
      logger.error('Error during input preprocessing:', error);
      throw error;
    }
  }

  async cleanInput(text) {
    logger.info('Cleaning input text');
    try {
      // Удаление лишних пробелов
      let cleanedText = text.trim().replace(/\s+/g, ' ');

      // Удаление HTML-тегов
      cleanedText = cleanedText.replace(/<[^>]*>/g, '');

      // Удаление URL
      cleanedText = cleanedText.replace(/https?:\/\/\S+/g, '');

      // Удаление эмодзи
      cleanedText = cleanedText.replace(/[\u{1F600}-\u{1F64F}]/gu, '');

      logger.info('Input cleaning completed');
      return cleanedText;
    } catch (error) {
      logger.error('Error during input cleaning:', error);
      throw error;
    }
  }
}

module.exports = new InputPreprocessingService();