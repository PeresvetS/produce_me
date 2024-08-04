// userBot.js

const { Telegraf } = require('telegraf');
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

module.exports = bot;