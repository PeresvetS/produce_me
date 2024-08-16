// src/app/userBot.js

const { Bot, session, InputFile } = require('grammy');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { subscriptionService, subscriptionCacheService } = require('../services/subscription');
const dialogService = require('../services/dialogService');
const goapiService = require('../services/goApi');
const logger = require('../utils/logger');

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
    await ctx.reply(message);
    await dialogService.incrementNewDialogCount(userId);
    await subscriptionService.setUserConversationId(userId, null);
    ctx.session.conversationId = null;
  } else {
    await ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
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
    let response = await goapiService.sendMessage(userId, message);
    logger.info(`Received response from GoAPI for user ${userId}: ${response}`);
    
    await subscriptionCacheService.logMessage(userId);
    await dialogService.incrementDialogCount(userId);

    // Отправляем ответ пользователю
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

    const aiResponse = await goapiService.processVoiceMessage(userId, tempFilePath);

    fs.unlink(tempFilePath, (err) => {
      if (err) logger.error('Error deleting temp file:', err);
    });

    await subscriptionCacheService.logMessage(userId);
    await dialogService.incrementDialogCount(userId);

    await ctx.reply(aiResponse);
  } catch (error) {
    logger.error('Error processing voice message:', error);
    await ctx.reply('Произошла ошибка при обработке голосового сообщения. Пожалуйста, попробуйте еще раз.');
  }
});

// bot.command('mindmap', async (ctx) => {
//   const userId = ctx.from.id;
//   const topic = ctx.match;

//   if (!topic) {
//     await ctx.reply('Пожалуйста, укажите тему для mindmap. Например: /mindmap Искусственный интеллект');
//     return;
//   }

//   try {
//     const subscriptionStatus = await subscriptionService.checkSubscription(userId);
//     if (!subscriptionStatus) {
//       await ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
//       return;
//     }

//     await ctx.replyWithChatAction('upload_photo');

//     const mindmapJSON = await goapiService.createMindMapJSON(userId, topic);

//     // Здесь должна быть логика создания изображения mindmap
//     // Так как у нас нет прямого доступа к объекту go, мы должны использовать
//     // другую библиотеку для создания изображения или получать его от внешнего сервиса

//     // Предположим, что у нас есть функция createMindMapImage, которая возвращает Buffer
//     const mindmapImageBuffer = await createMindMapImage(mindmapJSON);

//     await ctx.replyWithPhoto(new InputFile(mindmapImageBuffer));

//     await subscriptionCacheService.logMessage(userId);
//     await dialogService.incrementDialogCount(userId);

//   } catch (error) {
//     logger.error('Error creating mindmap:', error);
//     await ctx.reply('Произошла ошибка при создании mindmap. Пожалуйста, попробуйте еще раз или обратитесь в службу поддержки.');
//   }
// });

module.exports = bot;