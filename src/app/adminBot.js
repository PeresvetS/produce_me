// src/app/adminBot.js

const { Telegraf } = require('telegraf');
const config = require('../config');
const subscriptionService = require('../services/management/subscriptionService');
const subscriptionCacheService = require('../services/management/subscriptionCacheService');
const adminService = require('../services/management/adminService');
const logger = require('../utils/logger');

const adminBot = new Telegraf(config.telegram.adminBotToken);

// Middleware для проверки прав администратора
adminBot.use(async (ctx, next) => {
  const userId = ctx.from.id;
  if (await adminService.isAdmin(userId)) {
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
    ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching stats:', error);
    ctx.reply('Произошла ошибка при получении статистики');
  }
});

adminBot.command('users', async (ctx) => {
  try {
    const users = await subscriptionService.getAllUsers();
    let message = 'Список пользователей:\n\n';
    users.forEach(user => {
      const subscriptionStatus = user.subscriptionEnd ? `Подписка до ${user.subscriptionEnd}` : 'Нет активной подписки';
      message += `ID: ${user.userId}, Имя: ${user.name}, Username: @${user.username}, Диалогов: ${user.dialogCount}, ${subscriptionStatus}\n\n`;
    });
    ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching users:', error);
    ctx.reply('Произошла ошибка при получении списка пользователей.');
  }
});

adminBot.command('addsubscription', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
    ctx.reply('Использование: /addsubscription @username количество_месяцев');
    return;
  }

  const username = args[1].replace('@', '');
  const months = parseInt(args[2]);

  if (isNaN(months) || months < 1 || months > 12) {
    ctx.reply('Количество месяцев должно быть числом от 1 до 12');
    return;
  }

  try {
    const result = await subscriptionService.addSubscription(username, months);
    ctx.reply(result);
  } catch (error) {
    logger.error('Error adding subscription:', error);
    ctx.reply('Произошла ошибка при добавлении подписки.');
  }
});

adminBot.command('userstats', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) {
    ctx.reply('Использование: /userstats userId');
    return;
  }

  const userId = args[1];

  try {
    const user = await subscriptionService.getUserInfo(userId);
    const messageCount = await subscriptionCacheService.getMessageCount(userId);
    const message = `
Статистика пользователя ${userId}:
Имя: ${user.name}
Username: ${user.username}
Новых диалогов: ${user.newDialogCount}
Отправлено сообщений: ${messageCount}
Подписка до: ${user.subscriptionEnd || 'Нет активной подписки'}
    `;
    ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    ctx.reply('Произошла ошибка при получении статистики пользователя');
  }
});

adminBot.command('getlog', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) {
    ctx.reply('Использование: /getlog userId');
    return;
  }

  const userId = args[1];

  try {
    const log = await goapiService.getConversationLog(userId);
    if (log.length > 4096) {
      ctx.replyWithDocument({ source: Buffer.from(log), filename: `conversation_log_${userId}.txt` });
    } else {
      ctx.reply(log);
    }
  } catch (error) {
    logger.error('Error fetching conversation log:', error);
    ctx.reply('Произошла ошибка при получении лога переписки.');
  }
});



module.exports = adminBot;