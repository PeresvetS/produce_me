// src/services/insightExtractionHelpers.js

const logger = require('../utils/logger');

async function extractInsightsLLaMA(groqClient, conversation, keywordInfo) {
  try {
    const prompt = `
      Analyze the following conversation and extract key insights about the user:
      ${conversation}
      
      ${keywordInfo}
      
      Please provide a concise summary of the main points, user preferences, and any notable information.
    `;

    const completion = await groqClient.chat.completions.create({
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

async function extractInsightsGemini(conversation, keywordInfo) {
  // Заглушка для будущей реализации Gemini Flash 1.5
  logger.warn('Gemini Flash 1.5 API not implemented yet');
  throw new Error('Gemini Flash 1.5 API not implemented yet');
}

module.exports = {
  extractInsightsLLaMA,
  extractInsightsGemini,
};