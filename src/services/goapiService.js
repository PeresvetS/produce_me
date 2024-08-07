// goapiService.js

const axios = require('axios');
const config = require('../config/config');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const util = require('util');
const subscriptionService = require('./subscriptionService');

module.exports = {
  async sendMessage(userId, message) {
    logger.info(`Sending message for user ${userId} to GoAPI`);
    try {
      let conversationId = await subscriptionService.getUserConversationId(userId);
      const url = conversationId 
        ? `${config.goapiUrl}/conversation/${conversationId}`
        : `${config.goapiUrl}/conversation`;

      logger.info(`Using URL: ${url}`);
      logger.info(`Using API Key: ${config.goapiKey.substring(0, 5)}...`);

      const response = await axios.post(url, {
        model: 'gpt-4o',
        content: {
          content_type: 'text',
          parts: [message]
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

      let assistantMessage = '';
      let buffer = '';

      for await (const chunk of response.data) {
        buffer += chunk.toString();
        let lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              if (data.message && data.message.content && data.message.content.parts) {
                assistantMessage = data.message.content.parts.join(' ');
              }
              if (!conversationId && data.conversation_id) {
                conversationId = data.conversation_id;
                await subscriptionService.setUserConversationId(userId, conversationId);
              }
            } catch (error) {
              logger.error('Error parsing JSON:', error.message);
            }
          }
        }
      }

      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(5));
          if (data.message && data.message.content && data.message.content.parts) {
            assistantMessage = data.message.content.parts.join(' ');
          }
        } catch (error) {
          logger.error('Error parsing JSON from remaining buffer:', error.message);
        }
      }

      await this.logConversation(userId, message, assistantMessage);

      return assistantMessage.trim();
    } catch (error) {
      logger.error('Error sending message to GoAPI:', error.message);
      if (error.response) {
        logger.error('Response data:', util.inspect(error.response.data, { depth: null }));
        logger.error('Response status:', error.response.status);
        logger.error('Response headers:', util.inspect(error.response.headers, { depth: null }));
      } else if (error.request) {
        logger.error('No response received:', util.inspect(error.request, { depth: null }));
      } else {
        logger.error('Error details:', error.message);
      }
      throw error;
    }
  },

  async resetConversation(userId) {
    conversations.delete(userId);
    await this.logConversation(userId, "System: Conversation reset", "System: Conversation reset");
  },

  async logConversation(userId, userMessage, assistantMessage) {
    const logDir = path.join(__dirname, '..', '..', 'logs', 'conversations');
    const logFile = path.join(logDir, `${userId}.log`);

    const logEntry = `
User: ${userMessage}
Assistant: ${assistantMessage}
Timestamp: ${new Date().toISOString()}
---
`;

    try {
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Error logging conversation:', error);
    }
  },

  async getConversationLog(userId) {
    const logFile = path.join(__dirname, '..', '..', 'logs', 'conversations', `${userId}.log`);
    try {
      const log = await fs.readFile(logFile, 'utf-8');
      return log;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 'Лог переписки для данного пользователя не найден.';
      }
      console.error('Error reading conversation log:', error);
      throw error;
    }
  },

  async sendFile(userId, filePath) {
    logger.info(`Sending file for user ${userId} to GoAPI`);
    try {
      let conversationId = await subscriptionService.getUserConversationId(userId);
      const url = conversationId 
        ? `${config.goapiUrl}/conversation/${conversationId}/file`
        : `${config.goapiUrl}/conversation/file`;

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

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

      // Обработка ответа от GoAPI
      if (response.data.type === 'text') {
        return {
          type: 'text',
          content: this.convertMarkdownToHtml(response.data.content)
        };
      } else if (response.data.type === 'image') {
        return {
          type: 'image',
          content: response.data.content // предполагается, что это base64-encoded изображение
        };
      } else {
        throw new Error('Unsupported response type from GoAPI');
      }
    } catch (error) {
      logger.error('Error sending file to GoAPI:', error);
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