// groqService.js

const Groq = require('groq-sdk');
const fs = require('fs');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

module.exports = {
  async transcribeAudio(filePath) {
    try {
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
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
};