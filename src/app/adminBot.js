// src/app/adminBot.js

const { Bot, session } = require('grammy');
const config = require('../config');
const subscriptionService = require('../services/subscription');
const managementService = require('../services/management/');
const messageService = require('../services/message/');
const logger = require('../utils/logger');

logger.info(`start of bot`);

const adminBot = new Bot(config.adminBotToken);

logger.info(`next of bot`);

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
    const inputText = ctx.message.text;
    let limit = parseInt(inputText.match(/\d{1,4}$/));
    logger.info(`123 ${limit}`);
    if (isNaN(limit)) {
      await ctx.reply('Использование: /users 10 - получить список пользователей c лимитом в 10 человек');
      return;
    } 
    logger.info(`222 ${limit}`);
    const users = await managementService.getAllUsers(limit);
    let message = 'Список пользователей:\n\n';
    users.forEach(user => {
      const subscriptionStatus = user.subscriptionEnd ? `Подписка до ${user.subscriptionEnd}` : 'Нет активной подписки';
      message += `ID: ${user.id}, userId: ${user.userId}, Имя: ${user.name}, Username: @${user.username}, Диалогов: ${user.dialogCount}, Токенов: ${user.totalTokensUsed},  ${subscriptionStatus}\n\n`;
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

adminBot.command('botusers', async (ctx) => {
  const [, botType, limitStr] = ctx.message.text.split(' ');
  const limit = parseInt(limitStr) || 10;

  if (!['PRODUCER', 'MARKETER', 'CUSDEV', 'METHO', 'CONTENT', 'SALE', 'STRATEGY'].includes(botType.toUpperCase())) {
    await ctx.reply('Использование: /botusers [PRODUCER|MARKETER|CUSDEV|METHO|CONTENT|SALE] [limit]');
    return;
  }

  try {
    const users = await managementService.getBotUsers(botType.toUpperCase(), limit);
    let message = `Список пользователей бота ${botType}:\n\n`;
    users.forEach(user => {
      const subscriptionStatus = user.subscriptionEnd ? `Подписка до ${user.subscriptionEnd}` : 'Нет активной подписки';
      message += `ID: ${user.id}, userId: ${user.userId}, Имя: ${user.name}, Username: @${user.username}, Диалогов: ${user.dialogCount}, Токенов: ${user.totalTokensUsed}, ${subscriptionStatus}\n\n`;
    });
    await ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching bot users:', error);
    await ctx.reply('Произошла ошибка при получении списка пользователей бота.');
  }
});

adminBot.command('getlog', async (ctx) => {
  const [, userId, botType] = ctx.message.text.split(' ');
  if (!userId || !botType) {
    await ctx.reply('Использование: /getlog userId [PRODUCER|MARKETER|CUSDEV|METHO|CONTENT|SALE]');
    return;
  }

  try {
    const log = await messageService.getConversationLog(userId, botType.toUpperCase());
    if (log === 'Лог переписки для данного пользователя и бота не найден.') {
      await ctx.reply(log);
    } else if (log.length > 4096) {
      await ctx.replyWithDocument({
        source: Buffer.from(log),
        filename: `conversation_log_${userId}_${botType}.txt`
      });
    } else {
      await ctx.reply(log);
    }
  } catch (error) {
    logger.error('Error fetching conversation log:', error);
    await ctx.reply('Произошла ошибка при получении лога переписки.');
  }
});

module.exports = adminBot;