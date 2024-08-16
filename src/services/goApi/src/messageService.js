// src/services/goApi/src/messageService.js

const axios = require('axios');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const documentReader = require('./../../documentReader');
const subscriptionService = require('../../subscription/src/subscriptionService');
const conversationService = require('./conversationService');

const messageService = {
  async sendMessage(userId, message) {
    logger.info(`Sending message for user ${userId} to GoAPI`);
    try {
      let conversationId = await subscriptionService.getUserConversationId(userId);
      const url = conversationId 
        ? `${config.goapiUrl}/conversation/${conversationId}`
        : `${config.goapiUrl}/conversation`;

      logger.info(`Using URL: ${url}`);

      const content = await messageService.processMessageContent(userId, message);

      logger.info(`Request data: ${JSON.stringify(content)}`);

      const response = await axios.post(url, {
        model: 'gpt-4o',
        content: {
          content_type: 'text',
          parts: [`системный промпт: твой собеседник работает маркетологом, промпт пользователя: ${content}`]
        },
        gizmo_id: config.gizmoId
      }, {
        headers: {
          'X-API-Key': config.goapiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });

      logger.info(`Response received from GoAPI. Status: ${response.status}`);

      const { assistantMessage, newConversationId } = await messageService.processResponse(response, conversationId);

      if (newConversationId) {
        await subscriptionService.setUserConversationId(userId, newConversationId);
      }

      await conversationService.logConversation(userId, message, assistantMessage);

      return assistantMessage.trim();
    } catch (error) {
      logger.error('Error sending message to GoAPI:', error);
      throw error;
    }
  },

  async processMessageContent(userId, message) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    if (urls && (urls[0].includes('docs.google.com') || urls[0].includes('docs.yandex.ru'))) {
      return await messageService.processDocumentUrl(userId, urls[0], message);
    }

    return message;
  },

  async processDocumentUrl(userId, documentUrl, originalMessage) {
    try {
      const documentContent = await documentReader.readDocument(documentUrl);
      if (documentContent.trim() === '') {
        return 'Не удалось прочитать содержимое документа. Возможно, документ пуст или у меня нет доступа к нему.';
      }
      let content = `Содержимое документа по ссылке ${documentUrl}:\n\n${documentContent}\n\n`;
      const originalUserText = originalMessage.replace(documentUrl, '').trim();
      if (originalUserText) {
        content += `Также мой запрос: ${originalUserText}\n\n`;
      }
      content += `Пожалуйста, проанализируй этот документ, он важен для нашего диалога.`;
      return content;
    } catch (error) {
      logger.error('Error reading document:', error);
      return `Не удалось прочитать документ: ${error.message}. Пожалуйста, убедитесь, что ссылка корректна, документ доступен для чтения и не является приватным.`;
    }
  },

  async processResponse(response, conversationId) {
    let assistantMessage = '';
    let buffer = '';

    for await (const chunk of response.data) {
      buffer += chunk.toString();
      let lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(5));
            if (data.message && data.message.content && data.message.content.parts) {
              assistantMessage = data.message.content.parts[0];
            }
            if (!conversationId && data.conversation_id) {
              conversationId = data.conversation_id;
            }
          } catch (error) {
            logger.error('Error parsing JSON:', error.message);
          }
        }
      }
    }

    return { assistantMessage, newConversationId: conversationId };
  }
};

module.exports = messageService;