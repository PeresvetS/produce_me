// src/services/goapiService.js

const axios = require('axios');
const config = require('../config/config');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const documentReader = require('./documentReader');
const subscriptionService = require('./subscriptionService');
const groqService = require('./groqService');


module.exports = {
  async sendMessage(userId, message) {
    logger.info(`Sending message for user ${userId} to GoAPI`);
    try {
      let conversationId = await subscriptionService.getUserConversationId(userId);
      const url = conversationId 
        ? `${config.goapiUrl}/conversation/${conversationId}`
        : `${config.goapiUrl}/conversation`;

      logger.info(`Using URL: ${url}`);

      let content = message;
      let originalUserText = '';
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.match(urlRegex);

      if (urls && (urls[0].includes('docs.google.com') || urls[0].includes('docs.yandex.ru'))) {
        const documentUrl = urls[0];
        originalUserText = message.replace(documentUrl, '').trim();
        
        try {
          const documentContent = await documentReader.readDocument(documentUrl);
          logger.info(`Document content read successfully for user ${userId}`);
          if (documentContent.trim() === '') {
            return 'Не удалось прочитать содержимое документа. Возможно, документ пуст или у меня нет доступа к нему.';
          }
          content = `Содержимое документа по ссылке ${documentUrl}:\n\n${documentContent}\n\n`;
          if (originalUserText) {
            content += `Также мой запрос: ${originalUserText}\n\n`;
          }
          content += `Пожалуйста, проанализируй этот документ, он важен для нашего диалога.`;
        } catch (error) {
          logger.error('Error reading document:', error);
          return `Не удалось прочитать документ: ${error.message}. Пожалуйста, убедитесь, что ссылка корректна, документ доступен для чтения и не является приватным.`;
        }
      }

      const requestData = conversationId
        ? {
            content: {
              content_type: "text",
              parts: [content]
            }
          }
        : {
            model: 'gpt-4o',
            content: {
              content_type: "text",
              parts: [content]
            }
          };

      logger.info(`Request data: ${JSON.stringify(requestData)}`);

      const response = await axios.post(url, requestData, {
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
                await subscriptionService.setUserConversationId(userId, conversationId);
              }
            } catch (error) {
              logger.error('Error parsing JSON:', error.message);
            }
          }
        }
      }

      logger.info(`Assistant message: ${assistantMessage}`);

      await this.logConversation(userId, message, assistantMessage);

      return assistantMessage.trim();
    } catch (error) {
      logger.error('Error sending message to GoAPI:', error.message);
      logger.error('Error stack:', error.stack);
      if (error.response) {
        logger.error('Response data:', JSON.stringify(error.response.data));
        logger.error('Response status:', error.response.status);
        logger.error('Response headers:', JSON.stringify(error.response.headers));
      } else if (error.request) {
        logger.error('No response received:', error.request);
      } else {
        logger.error('Error details:', error.message);
      }
      throw error;
    }
  },

    async createMindMapJSON(userId, topic) {
    logger.info(`Creating mindmap JSON for user ${userId} on topic: ${topic}`);
    try {
      const url = `${config.goapiUrl}/conversation`;
      
      const prompt = `Создай структуру для mindmap на тему "${topic}". Используй следующий формат:
      - Корневой узел: ${topic}
        - Подтема 1 (цвет: skyblue, направление: right)
          - Подподтема 1.1
          - Подподтема 1.2
        - Подтема 2 (цвет: darkseagreen, направление: left)
          - Подподтема 2.1
          - Подподтема 2.2
      
      Создай не менее 5 подтем и 2-3 подподтемы для каждой. Используй различные цвета (skyblue, darkseagreen, coral, palevioletred) и направления (right или left).`;

      const requestData = {
        model: 'gpt-4o',
        content: {
          content_type: "text",
          parts: [prompt]
        }
      };

      const response = await axios.post(url, requestData, {
        headers: {
          'X-API-Key': config.goapiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });

      let mindmapContent = '';
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
                mindmapContent += data.message.content.parts[0];
              }
            } catch (error) {
              logger.error('Error parsing JSON:', error.message);
            }
          }
        }
      }

      // Преобразуем текстовую структуру в JSON
      const jsonStructure = this.convertTextToJSON(mindmapContent, topic);
      return jsonStructure;
    } catch (error) {
      logger.error('Error creating mindmap JSON:', error.message);
      throw error;
    }
  },

  convertTextToJSON(text, rootTopic) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const nodeDataArray = [{ key: 0, text: rootTopic, loc: "0 0" }];
    let currentKey = 1;
    let stack = [{ key: 0, level: 0 }];

    for (const line of lines) {
      const level = (line.match(/^-+/) || [''])[0].length - 1;
      const content = line.replace(/^-+\s*/, '');
      
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      const parentKey = stack[stack.length - 1].key;
      const [text, meta] = content.split('(');
      const color = (meta && meta.match(/цвет:\s*(\w+)/)) ? meta.match(/цвет:\s*(\w+)/)[1] : 'lightgray';
      const direction = (meta && meta.match(/направление:\s*(\w+)/)) ? meta.match(/направление:\s*(\w+)/)[1] : 'right';

      nodeDataArray.push({
        key: currentKey,
        parent: parentKey,
        text: text.trim(),
        brush: color,
        dir: direction
      });

      stack.push({ key: currentKey, level });
      currentKey++;
    }

    return { class: "go.TreeModel", nodeDataArray };
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

  async processVoiceMessage(userId, filePath) {
    try {
      const transcribedText = await groqService.transcribeAudio(filePath);
      logger.info(`Voice message transcribed successfully for user ${userId}`);
      return this.sendMessage(userId, transcribedText);
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