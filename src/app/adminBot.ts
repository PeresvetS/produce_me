import { Bot, session } from 'grammy';
import config from '../config';
import { subscriptionService } from '../services/subscription';
import { dataManagementService } from '../services/management';
import { messageService } from '../services/message';
import logger from '../utils/logger';
import { 
  AdminBotContext, 
  AdminBotType, 
  BotStats, 
  User as AdminUser,
  UserInfo, 
  CustomInputFile,
  UserWithBotInfo 
} from '../types/adminBot';
import { InputFile } from 'grammy';
import { User as BaseUser } from '../types';

logger.info('start of admin bot');

const adminBot = new Bot<AdminBotContext>(config.adminBotToken);

adminBot.use(
  session({
    initial: () => ({})
  })
);

// Debug logging middleware
adminBot.use(async (ctx, next) => {
  logger.info('New update received:', {
    updateType: ctx.updateType,
    from: ctx.from,
    text: ctx.message?.text
  });
  return next();
});

// Admin rights check middleware
adminBot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) {
    logger.warn('User ID not found in context');
    return ctx.reply('Ошибка идентификации пользователя.');
  }

  logger.info(`Checking admin rights for user ${userId}`);
  
  const isAdmin = await dataManagementService.isAdmin(userId);
  logger.info(`User ${userId} isAdmin: ${isAdmin}`);
  
  if (isAdmin) {
    return next();
  } else {
    logger.warn(`Unauthorized access attempt by user ${userId}`);
    return ctx.reply('У вас нет прав для использования этого бота.');
  }
});

// Command handlers
adminBot.command('start', async (ctx) => {
  logger.info('Start command received in admin bot');
  await ctx.reply('Добро пожаловать в панель администратора!');
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
    const inputText = ctx.message?.text;
    if (!inputText) {
      await ctx.reply('Ошибка получения текста команды');
      return;
    }

    const limit = parseInt(inputText.match(/\d{1,4}$/)?.[0] || '');
    logger.info(`Requested user limit: ${limit}`);
    
    if (isNaN(limit)) {
      await ctx.reply('Использование: /users 10 - получить список пользователей c лимитом в 10 человек');
      return;
    }

    const users = await dataManagementService.getAllUsers(limit);
    let message = 'Список пользователей:\n\n';
    users.forEach((user: BaseUser) => {
      const subscriptionStatus = user.subscriptionEnd 
        ? `Подписка до ${user.subscriptionEnd}` 
        : 'Нет активной подписки';
      message += `UserId: ${user.userId}, Username: @${user.username}, Диалогов: ${user.newDialogCount}, Токенов: ${user.totalTokensUsed}, ${subscriptionStatus}\n\n`;
    });
    await ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching users:', error);
    await ctx.reply('Произошла ошибка при получении списка пользователей.');
  }
});

adminBot.command('addsubscription', async (ctx) => {
  logger.info('Received addsubscription command');
  const fullCommand = ctx.message?.text;
  if (!fullCommand) {
    await ctx.reply('Ошибка получения команды');
    return;
  }

  logger.info(`Full command: ${fullCommand}`);
  
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
    const user = await dataManagementService.getUserInfo(userId);
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
  const messageText = ctx.message?.text;
  if (!messageText) {
    await ctx.reply('Ошибка получения команды');
    return;
  }

  const [, botType, limitStr] = messageText.split(' ');
  const limit = parseInt(limitStr) || 10;

  if (!Object.values(AdminBotType).includes(botType?.toUpperCase() as AdminBotType)) {
    await ctx.reply('Использование: /botusers [PRODUCER|MARKETER|CUSDEV|METHO|CONTENT|SALE|STRATEGY|SELLER] [limit]');
    return;
  }

  try {
    const users = await dataManagementService.getBotUsers(botType.toUpperCase() as AdminBotType, limit);
    let message = `Список пользователей бота ${botType}:\n\n`;
    
    for (const user of users) {
      const subscriptionStatus = user.subscriptionEnd 
        ? `Подписка до ${user.subscriptionEnd}` 
        : 'Нет активной подписки';
      message += `UserId: ${user.userId}, Username: @${user.username}, Диалогов: ${user.newDialogCount}, Токенов: ${user.totalTokensUsed}, ${subscriptionStatus}\n\n`;
    }
    
    await ctx.reply(message);
  } catch (error) {
    logger.error('Error fetching bot users:', error);
    await ctx.reply('Произошла ошибка при получении списка пользователей бота.');
  }
});

adminBot.command('getlog', async (ctx) => {
  const messageText = ctx.message?.text;
  if (!messageText) {
    await ctx.reply('Ошибка получения команды');
    return;
  }

  const [, userId, botType] = messageText.split(' ');
  if (!userId || !botType) {
    await ctx.reply('Использование: /getlog userId [PRODUCER|MARKETER|CUSDEV|METHO|CONTENT|SALE]');
    return;
  }

  try {
    const log = await messageService.getConversationLog(userId, botType.toUpperCase() as AdminBotType);
    if (log === 'Лог переписки для данного пользователя и бота не найден.') {
      await ctx.reply(log);
    } else if (log.length > 4096) {
      await ctx.replyWithDocument(new InputFile(
        Buffer.from(log),
        `conversation_log_${userId}_${botType}.txt`
      ));
    } else {
      await ctx.reply(log);
    }
  } catch (error) {
    logger.error('Error fetching conversation log:', error);
    await ctx.reply('Произошла ошибка при получении лога переписки.');
  }
});

adminBot.on('message', (ctx) => {
  logger.info('Received message:', ctx.message);
});

adminBot.catch((err) => {
  logger.error('Error in admin bot:', err);
});

export default adminBot;