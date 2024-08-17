// src/services/message/src/fileService.js

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');
const sizeOf = require('image-size');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const subscriptionService = require('../../subscription');
const groqService = require('../../groqService');
const messageService = require('./messageService');

module.exports = {
  async uploadFile(userId, filePath) {
    logger.info(`Uploading file for user ${userId} to GoAPI`);
    try {
      const conversationId = await subscriptionService.getUserConversationId(userId);
      const url = `${config.goapiUrl}/conversation/${conversationId}/file`;

      const fileMetadata = await this.getFileMetadata(filePath);
      const formData = new FormData();
      formData.append('file', await fs.readFile(filePath), {
        filename: path.basename(filePath),
        contentType: fileMetadata.mimeType
      });

      const response = await axios.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': config.goapiKey,
        },
      });

      logger.info(`File upload response received from GoAPI. Status: ${response.status}`);

      if (response.data.code === 200) {
        return { ...response.data.data, ...fileMetadata };
      } else {
        throw new Error(`File upload failed: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Error uploading file to GoAPI:', error);
      throw error;
    }
  },

  async sendMessageWithFile(userId, message, fileData) {
    logger.info(`Sending message with file for user ${userId} to GoAPI`);
    try {
      const conversationId = await subscriptionService.getUserConversationId(userId);
      const url = `${config.goapiUrl}/conversation/${conversationId}`;

      const payload = {
        model: 'gpt-4o',
        content: {
          content_type: "multimodal_text",
          parts: [
            {
              asset_pointer: `file-service://${fileData.file_id}`,
              size_bytes: fileData.size,
              width: fileData.width,
              height: fileData.height
            },
            message
          ]
        },
        metadata: {
          attachments: [
            {
              name: fileData.file_name,
              id: fileData.file_id,
              size: fileData.size,
              mimeType: fileData.mimeType,
              width: fileData.width,
              height: fileData.height
            }
          ]
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'X-API-Key': config.goapiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });

      return this.processStreamResponse(response);
    } catch (error) {
      logger.error('Error sending message with file to GoAPI:', error);
      throw error;
    }
  },

  async downloadFile(userId, fileId) {
    logger.info(`Downloading file for user ${userId} from GoAPI`);
    try {
      const conversationId = await subscriptionService.getUserConversationId(userId);
      const url = `${config.goapiUrl}/conversation/${conversationId}/download`;

      const response = await axios.post(url, { file_id: fileId }, {
        headers: {
          'X-API-Key': config.goapiKey,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`File download response received from GoAPI. Status: ${response.status}`);

      if (response.data.code === 200) {
        return response.data.data;
      } else {
        throw new Error(`File download failed: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Error downloading file from GoAPI:', error);
      throw error;
    }
  },

  async processStreamResponse(response) {
    let assistantMessage = '';
    let buffer = '';
    let lastMessage = '';
  
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      let lines = buffer.split('\n');
      buffer = lines.pop();
  
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonString = line.slice(5).trim();
            if (jsonString === '[DONE]') {
              continue;
            }
            const data = JSON.parse(jsonString);
            if (data.message && data.message.content && data.message.content.parts) {
              const newPart = data.message.content.parts[0];
              if (newPart.length > lastMessage.length) {
                assistantMessage = newPart;
                lastMessage = newPart;
              }
            }
          } catch (error) {
            logger.warn(`Error parsing JSON: ${error.message}`);
            logger.warn(`Problematic line: ${line}`);
          }
        }
      }
    }
  
    // Обработка оставшегося буфера
    if (buffer) {
      try {
        const data = JSON.parse(buffer);
        if (data.message && data.message.content && data.message.content.parts) {
          const newPart = data.message.content.parts[0];
          if (newPart.length > lastMessage.length) {
            assistantMessage = newPart;
          }
        }
      } catch (error) {
        logger.warn(`Error parsing remaining buffer: ${error.message}`);
      }
    }
  
    return assistantMessage.trim();
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
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  },

  async getFileMetadata(filePath) {
    const stats = await fs.stat(filePath);
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    let width = 0;
    let height = 0;

    if (mimeType.startsWith('image/')) {
      try {
        const dimensions = sizeOf(await fs.readFile(filePath));
        width = dimensions.width;
        height = dimensions.height;
      } catch (error) {
        logger.warn(`Could not determine image dimensions for ${filePath}:`, error);
      }
    }

    return {
      size: stats.size,
      mimeType,
      width,
      height
    };
  },

  isValidMimeType(mimeType) {
    const validMimeTypes = [
      "text/x-tex", "text/x-script.python", "application/msword", "text/x-c",
      "text/x-sh", "text/x-c++", "text/x-php", "text/x-csharp",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/pdf", "application/json", "text/plain", "text/javascript",
      "text/html", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/x-ruby", "text/markdown", "application/x-latext", "text/x-typescript",
      "text/x-java", "image/png", "image/gif", "image/webp", "image/jpeg"
    ];
    return validMimeTypes.includes(mimeType);
  }


};