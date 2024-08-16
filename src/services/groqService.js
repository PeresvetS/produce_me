// src/services/groqService.js

const Groq = require('groq-sdk');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../config');

const groq = new Groq({ apiKey: config.groqApiKey });

module.exports = {
  async transcribeAudio(filePath) {
    logger.info(`Начало транскрипции аудио файла: ${filePath}`);
    try {
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-large-v3",
        language: "ru",  // Предполагаем, что сообщения на русском языке
      });
      
      logger.info('Аудио успешно транскрибировано');
      return transcription.text;
    } catch (error) {
      logger.error('Ошибка при транскрипции аудио:', error);
      throw new Error('Не удалось транскрибировать аудио: ' + error.message);
    }
  }
};