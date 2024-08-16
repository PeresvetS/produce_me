// src/services/messaging/groqService.js

const Groq = require('groq-sdk');
const fs = require('fs');
const logger = require('../../utils/logger');

class GroqService {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async transcribeAudio(filePath) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const transcription = await this.groq.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-large-v3",
        language: "ru",  // Предполагаем, что сообщения на русском языке
      });
      
      logger.info('Audio transcribed successfully');
      return transcription.text;
    } catch (error) {
      logger.error('Error transcribing audio:', error);
      throw error;
    }
  }

  async getChatCompletion(messages, model = "llama3-8b-8192") {
    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: messages,
        model: model,
      });

      logger.info('Chat completion generated successfully');
      return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
      logger.error('Error generating chat completion:', error);
      throw error;
    }
  }
}

module.exports = new GroqService();