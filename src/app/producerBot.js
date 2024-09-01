// src/app/producerBot.js

const { Bot, session } = require('grammy');
const axios = require('axios');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const config = require('../config');
const subscriptionService = require('../services/subscription');
const managementService = require('../services/management');
const messageService = require('../services/message');
const fileService = require('../services/message/src/fileService');
const logger = require('../utils/logger');
const { cleanMessage, escapeMarkdown } = require('../utils/messageUtils');

logger.info(`start of producer bot`);

const bot = new Bot(config.producerBotToken);

bot.use(session({ initial: () => ({ threadId: null }) }));
const tempDir = process.env.TEMP_DIR || path.join(__dirname, '../../temp');

async function startNewDialog(ctx, isNewProducer = false) {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  await managementService.checkOrCreateUser(userId, username);
  const subscriptionStatus = await subscriptionService.checkSubscription(userId);
  if (subscriptionStatus) {
    let message = isNewProducer 
      ? 'Начинаем новый диалог с AI\\-продюсером\\! Чем я могу тебе помочь?'
      : 'Добро пожаловать, я твой AI\\-продюсер Лея\\! Чтобы начать общение, просто отправь сообщение';
    ctx.reply(message, { parse_mode: 'MarkdownV2' });
    await managementService.incrementNewDialogCount(userId);
  } else {
    ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
    return;
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

    logger.info(`Sending message to OpenAI for user ${userId}`);
    let response = await messageService.sendMessage(userId, message, 'PRODUCER');
    logger.info(`Received response from OpenAI for user ${userId}: ${response}`);
    
    await subscriptionService.logMessage(userId, 'PRODUCER');
    await managementService.incrementDialogCount(userId);

    const maxLength = 4096;
    const cleanResponse = cleanMessage(response);
    const escapedResponse = escapeMarkdown(cleanResponse).trim();
    if (escapedResponse.length <= maxLength) {
      await ctx.reply(escapedResponse, { parse_mode: 'MarkdownV2' });
    } else {
      const parts = escapedResponse.match(new RegExp(`.{1,${maxLength}}`, 'g'));
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'MarkdownV2' });
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
    const fileUrl = `https://api.telegram.org/file/bot${config.producerBotToken}/${file.file_path}`;
    
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    });

    const tempFilePath = path.join(tempDir, `voice_${userId}_${Date.now()}.ogg`);
    
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Проверяем, существует ли файл перед обработкой
        // Проверяем, существует ли файл перед обработкой
        logger.info(`Temporary file path: ${tempFilePath}`);
        logger.info(`File exists before processing: ${await fsp.access(tempFilePath).then(() => 'Yes', () => 'No')}`)

    const aiResponse = await messageService.processVoiceMessage(userId, tempFilePath, 'PRODUCER');

    // Используем fs.promises для асинхронного удаления файла
    await fsp.unlink(tempFilePath).catch(err => logger.warn(`Failed to delete temp file: ${err}`));


    await subscriptionService.logMessage(userId, 'PRODUCER');
    await managementService.incrementDialogCount(userId);

    const cleanResponse = cleanMessage(aiResponse);
    const escapedResponse = escapeMarkdown(cleanResponse);
    await ctx.reply(escapedResponse, { parse_mode: 'MarkdownV2' });
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

    const { aiResponse, usage } = await fileService.processFile(ctx, userId);

    // Логируем использование токенов
    if (usage && usage.total_tokens) {
      logger.info(`File analysis for user ${userId} used ${usage.total_tokens} tokens`);
      const totalTokens = await subscriptionService.getTotalTokensUsed(userId);
      logger.info(`Total tokens used by user ${userId}: ${totalTokens}`);
    }

    // Отправляем ответ пользователю
    const maxLength = 4096;
    const cleanResponse = cleanMessage(aiResponse).trim();
    const escapedResponse = escapeMarkdown(cleanResponse);
    if (escapedResponse.length <= maxLength) {
      await ctx.reply(escapedResponse, { parse_mode: 'MarkdownV2' });
    } else {
      const parts = escapedResponse.match(new RegExp(`.{1,${maxLength}}`, 'g'));
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'MarkdownV2' });
      }
    }
  } catch (error) {
    logger.error('Error processing file:', error);
    await ctx.reply('Произошла ошибка при обработке файла. Пожалуйста, попробуйте еще раз.');
  }
});

module.exports = bot;