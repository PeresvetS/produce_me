// src/services/message/src/fileService.js

const fs = require('fs'); // Используем обычный fs для работы с потоками
const fsp = require('fs').promises; // Используем fs.promises для работы с промисами
const path = require('path');
const axios = require('axios');
const mime = require('mime-types');
const sizeOf = require('image-size');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const groqService = require('../../groqService');
const messageService = require('./messageService');
const subscriptionService = require('../../subscription');
const managementService = require('../../management');

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: config.openaiApiKey });

module.exports = {

  async processFile(ctx, userId) {
    let file;
    let caption;
    if (ctx.message.document) {
      file = ctx.message.document;
      caption = ctx.message.caption || 'Проанализируй этот документ';
    } else if (ctx.message.photo) {
      file = ctx.message.photo[ctx.message.photo.length - 1];
      caption = ctx.message.caption || 'Опиши это изображение';
    }

    await ctx.reply('Минуту, обрабатываю файл');
  
    const fileId = file.file_id;
    const fileInfo = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.userBotToken}/${fileInfo.file_path}`;
    
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'arraybuffer'
    });

    const tempDir = path.join(__dirname, '../../../../temp');
    await fsp.mkdir(tempDir, { recursive: true }); // Используем fs.promises.mkdir

    const tempFilePath = path.join(tempDir, `file_${userId}_${Date.now()}${path.extname(fileInfo.file_path)}`);
    await fsp.writeFile(tempFilePath, response.data); // Используем fs.promises.writeFile

    logger.info(`File saved: ${tempFilePath}`);

    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(tempFilePath), // Используем обычный fs для потоков
      purpose: 'assistants',
    });

    logger.info(`File uploaded to OpenAI: ${JSON.stringify(uploadedFile)}`);

    const threadId = await subscriptionService.getUserThreadId(userId);
    let thread;

    if (!threadId) {
      thread = await openai.beta.threads.create();
      await subscriptionService.setUserThreadId(userId, thread.id);
    } else {
      thread = { id: threadId };
    }

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: config.assistantId,
    });
  
    const { message: aiResponse, usage } = await messageService.waitForRunCompletion(thread.id, run.id);
  
    await fsp.unlink(tempFilePath); // Используем fs.promises.unlink
  
    await subscriptionService.logMessage(userId);
    await managementService.incrementDialogCount(userId);
  
    // Обновляем использование токенов
    if (usage && usage.total_tokens) {
      await subscriptionService.updateTokenUsage(userId, usage.total_tokens);
      logger.info(`Updated token usage for user ${userId}: +${usage.total_tokens} tokens`);
    }
  
    return { aiResponse, usage };
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
    const stats = await fsp.stat(filePath); // Используем fs.promises.stat
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    let width = 0;
    let height = 0;

    if (mimeType.startsWith('image/')) {
      try {
        const dimensions = sizeOf(await fsp.readFile(filePath)); // Используем fs.promises.readFile
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
