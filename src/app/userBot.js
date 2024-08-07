// userBot.js

const { Telegraf } = require('telegraf');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const subscriptionService = require('../services/subscriptionService');
const dialogService = require('../services/dialogService');
const goapiService = require('../services/goapiService');
const subscriptionCacheService = require('../services/subscriptionCacheService');
const logger = require('../utils/logger');

const bot = new Telegraf(config.telegramToken);

async function startNewDialog(ctx, isNewProducer = false) {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const subscriptionStatus = await subscriptionService.checkOrCreateUser(userId, username);
  if (subscriptionStatus) {
    let message = isNewProducer 
      ? 'Начинаем новый диалог с AI-продюсером! Чем я могу тебе помочь?'
      : 'Добро пожаловать, я твой AI-продюсер Лея! Чтобы начать общение, просто отправь сообщение';
    ctx.reply(message);
    await dialogService.incrementNewDialogCount(userId);
    await subscriptionService.setUserConversationId(userId, null);
  } else {
    ctx.reply('У тебя нет активной подписки Пожалуйста, обнови твою подписку через @neuro_zen_helps');
  }
}

bot.start(async (ctx) => {
  await startNewDialog(ctx);
});

bot.command('newProducer', async (ctx) => {
  await startNewDialog(ctx, true);
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message.text;

  try {
    logger.info(`Received message from user ${userId}: ${message}`);
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    logger.info(`Subscription status for user ${userId}: ${subscriptionStatus}`);
    
    if (!subscriptionStatus) {
      ctx.reply('У тебя нет активной подписки Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    ctx.sendChatAction('typing');

    logger.info(`Sending message to GoAPI for user ${userId}`);
    let response = await goapiService.sendMessage(userId, message);
    logger.info(`Received response from GoAPI for user ${userId}`);
    
    await subscriptionCacheService.logMessage(userId);

    // Конвертируем Markdown в HTML
    response = response.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Жирный текст
                       .replace(/\*(.*?)\*/g, '<i>$1</i>')     // Курсив
                       .replace(/`(.*?)`/g, '<code>$1</code>') // Код
                       .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>'); // Ссылки

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
    logger.error('Error processing message:', error.message);
    if (error.response) {
      logger.error('Error response:', {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
      });
    } else if (error.request) {
      logger.error('Error request:', error.request);
    }
    ctx.reply('Произошла ошибка при обработке твоего сообщения Пожалуйста, попробуй ещё раз');
  }
});

bot.on(['photo', 'document'], async (ctx) => {
  const userId = ctx.from.id;

  try {
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    if (!subscriptionStatus) {
      ctx.reply('У тебя нет активной подписки Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    ctx.sendChatAction('upload_photo');

    let fileId;
    let fileName;
    if (ctx.message.photo) {
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      fileName = 'image.jpg';
    } else {
      fileId = ctx.message.document.file_id;
      fileName = ctx.message.document.file_name;
    }

    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios({
      method: 'get',
      url: fileLink.href,
      responseType: 'stream'
    });

    const tempFilePath = path.join(__dirname, '../../temp', fileName);
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const goapiResponse = await goapiService.sendFile(userId, tempFilePath);

    fs.unlink(tempFilePath, (err) => {
      if (err) logger.error('Error deleting temp file:', err);
    });

    await subscriptionCacheService.logMessage(userId);

    if (goapiResponse.type === 'text') {
      await ctx.reply(goapiResponse.content, { parse_mode: 'HTML' });
    } else if (goapiResponse.type === 'image') {
      await ctx.replyWithPhoto({ source: Buffer.from(goapiResponse.content, 'base64') });
    } else {
      await ctx.reply('Получен неподдерживаемый тип ответа от AI');
    }
  } catch (error) {
    logger.error('Error processing file:', error);
    ctx.reply('Произошла ошибка при обработке файла Пожалуйста, попробуй ещё раз');
  }
});

module.exports = bot;