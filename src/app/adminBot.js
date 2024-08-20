// src/app/adminBot.js

const { Bot, session } = require('grammy');
const config = require('../config');
const axios = require('axios');
const subscriptionService = require('../services/subscription');
const managementService = require('../services/management/');
const logger = require('../utils/logger');

axios.interceptors.request.use(request => {
  console.log('Starting Request', JSON.stringify(request, null, 2));
  return request;
});

axios.interceptors.response.use(response => {
  console.log('Response:', JSON.stringify(response.data, null, 2));
  return response;
}, error => {
  console.error('Axios Error:', error);
  return Promise.reject(error);
});

logger.info(`start of bot`);

const adminBot = new Bot(config.adminBotToken, {
  client: {
    apiRoot: `https://api.telegram.org/bot${config.adminBotToken}`,
    webhookReplyEnvelope: {
      custom_session_id: `admin_bot_${Date.now()}`
    }
  }
});

adminBot.init = async () => {
  logger.info('Initializing user bot...');
  try {
    const webhookInfo = await adminBot.api.getWebhookInfo();
    logger.info('Current webhook info:', webhookInfo);
    
    if (webhookInfo.url) {
      await adminBot.api.deleteWebhook();
      logger.info('Webhook deleted successfully');
    } else {
      logger.info('No webhook set, skipping deletion');
    }
  } catch (error) {
    logger.error('Error during bot initialization:', error);
    // Не выбрасываем ошибку, чтобы продолжить инициализацию
  }
};

adminBot.catch((err) => {
  logger.error('Global error in admin bot:', err);
});

// Middleware для проверки прав администратора
adminBot.use(async (ctx, next) => {
  const userId = ctx.from.id;
  if (await managementService.isAdmin(userId)) {
    return next();
  } else {
    logger.warn(`Unauthorized access attempt by user ${userId}`);
    return ctx.reply('У вас нет прав для выполнения этой команды.');
  }
});

adminBot.command('stats', async (ctx) => {
  logger.info('Stats command received in admin bot');
  try {
    const stats = await subscriptionService.getStats();
    logger.info('Stats retrieved:', stats);
    const message = `
Статистика пользователей:
Всего пользователей: ${stats.totalUsers}
Активных пользователей: ${stats.activeUsers}
Общее количество диалогов: ${stats.totalDialogs}
    `;
    await ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching stats:', error);
    await ctx.reply('Произошла ошибка при получении статистики');
  }
});

adminBot.command('users', async (ctx) => {
  try {
    const users = await subscriptionService.getAllUsers();
    let message = 'Список пользователей:\n\n';
    users.forEach(user => {
      const subscriptionStatus = user.subscriptionEnd ? `Подписка до ${user.subscriptionEnd}` : 'Нет активной подписки';
      message += `ID: ${user.id}, Имя: ${user.name}, Username: @${user.username}, Диалогов: ${user.dialogCount}, ${subscriptionStatus}\n\n`;
    });
    await ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching users:', error);
    await ctx.reply('Произошла ошибка при получении списка пользователей.');
  }
});

adminBot.command('addsubscription', async (ctx) => {
  logger.info('Received addsubscription command');
  const fullCommand = ctx.message.text;
  logger.info(`Full command: ${fullCommand}`);
  
  // Удаляем команду из строки и разбиваем оставшуюся часть на аргументы
  const args = fullCommand.split(' ').slice(1);
  logger.info(`Parsed args: ${JSON.stringify(args)}`);

  if (args.length !== 2) {
    await ctx.reply('Использование: /addsubscription @username количество_месяцев');
    return;
  }

  const [username, monthsStr] = args;
  const months = parseInt(monthsStr);

  logger.info(`Attempting to add subscription: username=${username}, months=${months}`);

  if (isNaN(months) || months < 1 || months > 12) {
    await ctx.reply('Количество месяцев должно быть числом от 1 до 12');
    return;
  }

  try {
    const result = await subscriptionService.addSubscription(username.replace('@', ''), months);
    logger.info(`Subscription added successfully: ${result}`);
    await ctx.reply(result);
  } catch (error) {
    logger.error('Error adding subscription:', error);
    await ctx.reply('Произошла ошибка при добавлении подписки.');
  }
});

adminBot.command('userstats', async (ctx) => {
  const userId = ctx.match;
  if (!userId) {
    await ctx.reply('Использование: /userstats userId');
    return;
  }

  try {
    const user = await subscriptionService.getUserInfo(userId);
    const messageCount = await subscriptionService.getMessageCount(userId);
    const message = `
Статистика пользователя ${userId}:
Имя: ${user.name}
Username: ${user.username}
Новых диалогов: ${user.newDialogCount}
Отправлено сообщений: ${messageCount}
Подписка до: ${user.subscriptionEnd || 'Нет активной подписки'}
    `;
    await ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    await ctx.reply('Произошла ошибка при получении статистики пользователя');
  }
});

adminBot.command('getlog', async (ctx) => {
  const userId = ctx.match;
  if (!userId) {
    await ctx.reply('Использование: /getlog userId');
    return;
  }

  try {
    const log = await goapiService.getConversationLog(userId);
    if (log.length > 4096) {
      await ctx.replyWithDocument(new InputFile(Buffer.from(log), `conversation_log_${userId}.txt`));
    } else {
      await ctx.reply(log);
    }
  } catch (error) {
    logger.error('Error fetching conversation log:', error);
    await ctx.reply('Произошла ошибка при получении лога переписки.');
  }
});

module.exports = {
  bot: adminBot,
  init: adminBot.init
};