// userBot.js

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

// Хранилище для контекста разговоров
const conversations = new Map();

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
    conversations.set(userId, []);
  } else {
    ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
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
      ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    ctx.sendChatAction('typing');

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
    ctx.reply('Произошла ошибка при обработке твоего сообщения. Пожалуйста, попробуй ещё раз или обратись в службу поддержки.');
  }
});
bot.on('voice', async (ctx) => {
  const userId = ctx.from.id;

  try {
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    if (!subscriptionStatus) {
      ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    ctx.sendChatAction('typing');

    const fileId = ctx.message.voice.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios({
      method: 'get',
      url: fileLink.href,
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

    ctx.reply(aiResponse);
  } catch (error) {
    logger.error('Error processing voice message:', error);
    ctx.reply('Произошла ошибка при обработке голосового сообщения. Пожалуйста, попробуйте еще раз.');
  }
});


bot.command('mindmap', async (ctx) => {
  const userId = ctx.from.id;
  const topic = ctx.message.text.split('/mindmap ')[1];

  if (!topic) {
    ctx.reply('Пожалуйста, укажите тему для mindmap. Например: /mindmap Искусственный интеллект');
    return;
  }

  try {
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    if (!subscriptionStatus) {
      ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    ctx.sendChatAction('upload_photo');

    const mindmapJSON = await goapiService.createMindMapJSON(userId, topic);

    // Создаем диаграмму
    const $ = go.GraphObject.make;
    const diagram = $(go.Diagram, {
      initialContentAlignment: go.Spot.Center,
      layout: $(go.TreeLayout, {
        angle: 90,
        nodeSpacing: 10,
        layerSpacing: 40,
      }),
    });

    // Определяем шаблон узла
    diagram.nodeTemplate =
      $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle",
          { fill: "white" },
          new go.Binding("fill", "brush")),
        $(go.TextBlock,
          { margin: 5 },
          new go.Binding("text", "text"))
      );

    // Загружаем модель из JSON
    diagram.model = go.Model.fromJson(JSON.stringify(mindmapJSON));

    // Создаем canvas и рендерим диаграмму
    const canvas = createCanvas(800, 600);
    diagram.makeImage({
      scale: 1,
      background: "white",
      type: "image/png",
      returnType: "canvas",
      callback: (canvas) => {
        // Отправляем изображение пользователю
        ctx.replyWithPhoto({ source: canvas.toBuffer() });
      }
    });

    await subscriptionCacheService.logMessage(userId);
    await dialogService.incrementDialogCount(userId);

  } catch (error) {
    logger.error('Error creating mindmap:', error);
    ctx.reply('Произошла ошибка при создании mindmap. Пожалуйста, попробуйте еще раз или обратитесь в службу поддержки.');
  }
});

module.exports = bot;