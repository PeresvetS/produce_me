// // src/app/userBot.js

const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const subscriptionService = require('../services/subscriptionService');
const dialogService = require('../services/dialogService');
const goapiService = require('../services/goapiService');
const subscriptionCacheService = require('../services/subscriptionCacheService');
const contextManagementService = require('../services/contextManagementService');
const longTermMemoryService = require('../services/longTermMemoryService');
const modelSelectionService = require('../services/modelSelectionService');
const diagramService = require('../services/diagramService');
const insightExtractionService = require('../services/insightExtractionService');
const dataManagementService = require('../services/dataManagementService');
const initialSurveyService = require('../services/initialSurveyService');
const simpleNlpService = require('../services/simpleNlpService');
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

bot.command('start_survey', async (ctx) => {
  const userId = ctx.from.id;
  try {
    const firstQuestion = await initialSurveyService.startSurvey(userId);
    ctx.reply(`Давайте начнем начальный опрос. ${firstQuestion}`);
  } catch (error) {
    logger.error('Error starting survey:', error);
    ctx.reply('Произошла ошибка при начале опроса. Пожалуйста, попробуйте еще раз позже.');
  }
});



bot.command('mindmap', async (ctx) => {
  const userId = ctx.from.id;
  const topic = ctx.message.text.split('/mindmap ')[1];

  logger.info(`Received /mindmap command from user ${userId} with topic: ${topic}`);

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

    ctx.reply('Пожалуйста, немного подожди. Mindmap создаётся');

    ctx.sendChatAction('upload_document');

    logger.info(`Creating mindmap JSON for user ${userId} on topic: ${topic}`);
    let mindmapJSON;
    try {
      mindmapJSON = await goapiService.createMindMapJSON(userId, topic);
      logger.info(`Mindmap JSON created successfully: ${JSON.stringify(mindmapJSON)}`);
    } catch (error) {
      logger.error(`Error creating mindmap JSON for user ${userId}:`, error);
      throw new Error('Не удалось создать структуру mindmap');
    }
    
    logger.info(`Creating mindmap image for user ${userId}`);
    let mindmapSVG;
    try {
      mindmapSVG = await diagramService.createMindMapImage(mindmapJSON);
      logger.info(`Mindmap SVG created successfully for user ${userId}`);
    } catch (error) {
      logger.error(`Error creating mindmap SVG for user ${userId}:`, error);
      throw new Error('Не удалось создать изображение mindmap');
    }

    logger.info(`Sending mindmap SVG to user ${userId}`);
    await ctx.replyWithDocument({ source: Buffer.from(mindmapSVG), filename: 'mindmap.svg' });

    await subscriptionCacheService.logMessage(userId);
    await dialogService.incrementDialogCount(userId);

    logger.info(`Mindmap successfully sent to user ${userId}`);
  } catch (error) {
    logger.error(`Error in /mindmap command for user ${userId}:`, error);
    ctx.reply(`Произошла ошибка при создании mindmap: ${error.message}. Пожалуйста, попробуйте еще раз или обратитесь в службу поддержки.`);
  }
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const rawMessage = ctx.message.text;

  try {
    logger.info(`Received message from user ${userId}: ${rawMessage}`);
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    logger.info(`Subscription status for user ${userId}: ${subscriptionStatus}`);
    
    if (!subscriptionStatus) {
      ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    try {
      // Проверяем, находится ли пользователь в процессе опроса
      const userData = await dataManagementService.getUserData(userId);
      if (userData.surveyStarted && !userData.surveyCompleted) {
        const nextQuestion = await initialSurveyService.processAnswer(userId, rawMessage);
        ctx.reply(nextQuestion);
        return;
      }

    // Очистка входного текста
    const cleanedMessage = await inputPreprocessingService.cleanInput(rawMessage);
    
    // Предобработка очищенного текста с использованием LangChain
    const preprocessedMessage = await inputPreprocessingService.preprocess(cleanedMessage);

    logger.info(`Preprocessed message from user ${userId}: ${preprocessedMessage}`);

    ctx.sendChatAction('typing');
    const relevantMemories = await longTermMemoryService.getRelevantMemories(userId, preprocessedMessage);

    // Добавляем релевантные воспоминания к контексту
    const contextWithMemories = `Relevant memories:\n${relevantMemories.join('\n')}\n\nCurrent message: ${preprocessedMessage}`;

    // Выбираем модель и обрабатываем сообщение
    const model = await modelSelectionService.selectModel(userId, contextWithMemories);
    const response = await model(contextWithMemories);

    // Обновляем контекст беседы
    await contextManagementService.processMessage(userId, contextWithMemories);

    // Сохраняем новое воспоминание
    await longTermMemoryService.addMemory(userId, preprocessedMessage);

    const containsKeywords = simpleNlpService.analyzeText(preprocessedMessage);

    // Извлекаем инсайты каждые 15 сообщений
    const messageCount = await subscriptionCacheService.getMessageCount(userId);
    if (containsKeywords || messageCount % 15 === 0) {
      const conversation = await contextManagementService.getConversationHistory(userId);
      const insights = await insightExtractionService.extractInsights(userId, conversation);
      await longTermMemoryService.addMemory(userId, `Insights: ${insights}`);
      // Сохраняем инсайты в структурированных данных пользователя
      await dataManagementService.updateUserData(userId, { insights });
    }
    
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

module.exports = bot;