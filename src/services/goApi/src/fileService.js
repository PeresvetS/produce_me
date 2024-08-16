// src/services/goApi/src/fileService.js

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const subscriptionService = require('../../subscription/src/subscriptionService');
const groqService = require('../../groqService');
const messageService = require('./messageService');

module.exports = {
  async sendFile(userId, filePath) {
    logger.info(`Sending file for user ${userId} to GoAPI`);
    try {
      let conversationId = await subscriptionService.getUserConversationId(userId);
      const url = conversationId 
        ? `${config.goapiUrl}/conversation/${conversationId}/file`
        : `${config.goapiUrl}/conversation/file`;

      const formData = new FormData();
      formData.append('file', await fs.readFile(filePath), path.basename(filePath));

      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': config.goapiKey,
        },
      });

      logger.info(`Response received from GoAPI. Status: ${response.status}`);

      if (!conversationId && response.data.conversation_id) {
        conversationId = response.data.conversation_id;
        await subscriptionService.setUserConversationId(userId, conversationId);
      }

      return this.processFileResponse(response.data);
    } catch (error) {
      logger.error('Error sending file to GoAPI:', error);
      throw error;
    }
  },

  processFileResponse(responseData) {
    if (responseData.type === 'text') {
      return {
        type: 'text',
        content: this.convertMarkdownToHtml(responseData.content)
      };
    } else if (responseData.type === 'image') {
      return {
        type: 'image',
        content: responseData.content // предполагается, что это base64-encoded изображение
      };
    } else {
      throw new Error('Unsupported response type from GoAPI');
    }
  },

  async processVoiceMessage(userId, filePath) {
    try {
      const transcribedText = await groqService.transcribeAudio(filePath);
      logger.info(`Voice message transcribed successfully for user ${userId}`);
      return messageService.sendMessage(userId, transcribedText);
    } catch (error) {
      logger.error(`Error processing voice message for user ${userId}:`, error);
      throw error;
    }
  },

  convertMarkdownToHtml(markdown) {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Жирный текст
      .replace(/\*(.*?)\*/g, '<i>$1</i>')     // Курсив
      .replace(/`(.*?)`/g, '<code>$1</code>') // Код
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>'); // Ссылки
  }
};