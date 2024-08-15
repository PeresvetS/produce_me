// src/services/messaging/voiceMessageService.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const botLogicService = require('../management/botLogicService');

class VoiceMessageService {
  async processVoiceMessage(userId, fileLink) {
    let tempFilePath = '';
    try {
      // Создаем временную директорию, если она не существует
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      if (!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      tempFilePath = path.join(tempDir, `voice_${userId}_${Date.now()}.ogg`);
      
      // Загружаем файл
      const response = await axios({
        method: 'get',
        url: fileLink,
        responseType: 'stream'
      });

      // Сохраняем файл
      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      logger.info(`Voice message saved to ${tempFilePath}`);

      // Обрабатываем голосовое сообщение
      const botResponse = await botLogicService.processVoiceMessage(userId, tempFilePath);

      return botResponse;

    } catch (error) {
      logger.error('Error processing voice message:', error);
      throw error;
    } finally {
      // Удаляем временный файл
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlink(tempFilePath, (err) => {
          if (err) {
            logger.error('Error deleting temporary file:', err);
          } else {
            logger.info(`Temporary file ${tempFilePath} deleted`);
          }
        });
      }
    }
  }
}

module.exports = new VoiceMessageService();