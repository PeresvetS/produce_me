// src/app/userBot.js

const { Bot, session } = require('grammy');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const subscriptionService = require('../services/subscription');
const managementService = require('../services/management');
const messageService = require('../services/message');
const logger = require('../utils/logger');
const cleanMessage = require('../utils/cleanMessage');

const bot = new Bot(config.userBotToken);

// Middleware для сессий
bot.use(session({ initial: () => ({ conversationId: null }) }));

async function startNewDialog(ctx, isNewProducer = false) {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const subscriptionStatus = await subscriptionService.checkOrCreateUser(userId, username);
  if (subscriptionStatus) {
    let message = isNewProducer 
      ? 'Начинаем новый диалог с AI-продюсером! Чем я могу тебе помочь?'
      : 'Добро пожаловать, я твой AI-продюсер Лея! Чтобы начать общение, просто отправь сообщение';
    ctx.reply(message);
    await managementService.incrementNewDialogCount(userId);
    await subscriptionService.setUserConversationId(userId, null);
  } else {
    ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
  }
}

bot.command('start', async (ctx) => {
  await startNewDialog(ctx);
});

bot.command('newProducer', async (ctx) => {
  await startNewDialog(ctx, true);
});

bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message.text;

  try {
    logger.info(`Received message from user ${userId}: ${message}`);
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    logger.info(`Subscription status for user ${userId}: ${subscriptionStatus}`);
    
    if (!subscriptionStatus) {
      await ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    await ctx.replyWithChatAction('typing');

    logger.info(`Sending message to GoAPI for user ${userId}`);
    let response = await messageService.sendMessage(userId, message);
    logger.info(`Received response from GoAPI for user ${userId}: ${response}`);
    
    await subscriptionService.logMessage(userId);
    await managementService.incrementDialogCount(userId);

    const maxLength = 4096;
    if (response.length <= maxLength) {
      await ctx.reply(response, { parse_mode: 'HTML' });
    } else {
      const parts = response.match(new RegExp(`.{1,${maxLength}}`, 'g'));
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'HTML' });
      }
    }
  } catch (error) {
    logger.error('Error processing message:', error);
    logger.error('Error stack:', error.stack);
    await ctx.reply('Произошла ошибка при обработке твоего сообщения. Пожалуйста, попробуй ещё раз или обратись в службу поддержки.');
  }
});

bot.on('message:voice', async (ctx) => {
  const userId = ctx.from.id;

  try {
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    if (!subscriptionStatus) {
      await ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    await ctx.replyWithChatAction('typing');

    const fileId = ctx.message.voice.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.userBotToken}/${file.file_path}`;
    
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    });

    const tempFilePath = path.join(__dirname, '../../temp', `voice_${userId}_${Date.now()}.ogg`);
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const aiResponse = await messageService.processVoiceMessage(userId, tempFilePath);

    fs.unlink(tempFilePath, (err) => {
      if (err) logger.error('Error deleting temp file:', err);
    });

    await subscriptionService.logMessage(userId);
    await managementService.incrementDialogCount(userId);

    await ctx.reply(aiResponse);
  } catch (error) {
    logger.error('Error processing voice message:', error);
    await ctx.reply('Произошла ошибка при обработке голосового сообщения. Пожалуйста, попробуйте еще раз.');
  }
});

bot.on(['message:document', 'message:photo'], async (ctx) => {
  const userId = ctx.from.id;

  try {
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    if (!subscriptionStatus) {
      await ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    await ctx.replyWithChatAction('typing');

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

    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `file_${userId}_${Date.now()}${path.extname(fileInfo.file_path)}`);
    await fs.writeFile(tempFilePath, response.data);

    logger.info(`File saved: ${tempFilePath}`);

    const uploadedFile = await messageService.uploadFile(userId, tempFilePath);
    logger.info(`File uploaded: ${JSON.stringify(uploadedFile)}`);

    const aiResponse = await messageService.sendMessageWithFile(userId, caption, uploadedFile);
    logger.info(`AI Response received, length: ${aiResponse.length}`);

    await fs.unlink(tempFilePath);

    await subscriptionService.logMessage(userId);
    await managementService.incrementDialogCount(userId);

    // Отправляем ответ пользователю
    const maxLength = 4096;
    const cleanResponse = cleanMessage(aiResponse).trim();
    if (cleanResponse.length <= maxLength) {
      await ctx.reply(cleanResponse, { parse_mode: 'HTML' });
    } else {
      const parts = cleanResponse.match(new RegExp(`.{1,${maxLength}}`, 'g'));
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'HTML' });
      }
    }
  } catch (error) {
    logger.error('Error processing file:', error);
    await ctx.reply('Произошла ошибка при обработке файла. Пожалуйста, попробуйте еще раз.');
  }

  
});





module.exports = bot;