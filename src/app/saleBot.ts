import { Bot, session } from 'grammy';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import config from '../config';
import { subscriptionService } from '../services/subscription';
import { dataManagementService } from '../services/management';
import { messageService } from '../services/message';
import { fileService } from '../services/message/src/fileService';
import logger from '../utils/logger';
import { cleanMessage, escapeMarkdown } from '../utils/messageUtils';
import { BotContext, BotType, FileProcessingResponse } from '../types/bot';

const tempDir = process.env.TEMP_DIR || path.join(__dirname, '../../temp');

logger.info('start of sale bot');

const bot = new Bot<BotContext>(config.saleBotToken);
bot.use(
  session({
    initial: () => ({
      threadId: null as string | null
    })
  })
);

async function startNewDialog(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id.toString();
  const username = ctx.from?.username;
  
  if (!userId || !username) {
    await ctx.reply('Ошибка идентификации пользователя.');
    return;
  }

  await dataManagementService.checkOrCreateUser(userId, username);
  const subscriptionStatus = await subscriptionService.checkSubscription(userId);
  
  if (subscriptionStatus) {
    await ctx.reply('Привет! Я Марк, твой AI-маркетолог. Я помогу тебе создать разобраться с маркетинговыми аспектами твоего проекта. Расскажи мне о себе и о своей идее');
    await dataManagementService.incrementDialogCount(userId);
  } else {
    await ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
  }
}

bot.command('start', async (ctx) => {
  await startNewDialog(ctx);
});

bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id.toString();
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
    const response = await messageService.sendMessage(userId, message, BotType.SALE);
    logger.info(`Received response from OpenAI for user ${userId}: ${response}`);
    
    await subscriptionService.logMessage(userId, BotType.SALE);
    await dataManagementService.incrementDialogCount(userId);

    const maxLength = 4096;
    const cleanResponse = cleanMessage(response);
    const escapedResponse = escapeMarkdown(cleanResponse).trim();
    
    if (escapedResponse.length <= maxLength) {
      await ctx.reply(escapedResponse, { parse_mode: 'MarkdownV2' });
    } else {
      const parts = escapedResponse.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'MarkdownV2' });
      }
    }
  } catch (error) {
    logger.error('Error processing message:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : '');
    await ctx.reply('Произошла ошибка при обработке твоего сообщения. Пожалуйста, попробуй ещё раз или обратись в службу поддержки.');
  }
});

bot.on('message:voice', async (ctx) => {
  const userId = ctx.from.id.toString();

  try {
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    if (!subscriptionStatus) {
      await ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    await ctx.replyWithChatAction('typing');

    const fileId = ctx.message.voice.file_id;
    const file = await ctx.api.getFile(fileId);
    
    if (!file.file_path) {
      throw new Error('File path not found');
    }
    
    const fileUrl = `https://api.telegram.org/file/bot${config.saleBotToken}/${file.file_path}`;
    
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    });

    const tempFilePath = path.join(tempDir, `voice_${userId}_${Date.now()}.ogg`);
    
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    logger.info(`Temporary file path: ${tempFilePath}`);

      const aiResponse = await messageService.processVoiceMessage(userId, tempFilePath, BotType.SALE);

    await fs.promises.unlink(tempFilePath).catch(err => 
      logger.warn(`Failed to delete temp file: ${err}`)
    );

    await subscriptionService.logMessage(userId, BotType.SALE);
    await dataManagementService.incrementDialogCount(userId);

    const cleanResponse = cleanMessage(aiResponse);
    const escapedResponse = escapeMarkdown(cleanResponse);
    await ctx.reply(escapedResponse, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logger.error('Error processing voice message:', error);
    await ctx.reply('Произошла ошибка при обработке голосового сообщения. Пожалуйста, попробуйте еще раз.');
  }
});

bot.on(['message:document', 'message:photo'], async (ctx) => {
  const userId = ctx.from.id.toString();

  try {
    const subscriptionStatus = await subscriptionService.checkSubscription(userId);
    if (!subscriptionStatus) {
      await ctx.reply('У тебя нет активной подписки. Пожалуйста, обнови твою подписку через @neuro_zen_helps');
      return;
    }

    await ctx.replyWithChatAction('typing');

    const { aiResponse, usage } = await fileService.processFile(ctx, userId, BotType.SALE) as FileProcessingResponse;

    if (usage?.total_tokens) {
      logger.info(`File analysis for user ${userId} used ${usage.total_tokens} tokens`);
      const totalTokens = await subscriptionService.getTotalTokensUsed(userId);
      logger.info(`Total tokens used by user ${userId}: ${totalTokens}`);
    }

    const maxLength = 4096;
    const cleanResponse = cleanMessage(aiResponse).trim();
    const escapedResponse = escapeMarkdown(cleanResponse);
    
    if (escapedResponse.length <= maxLength) {
      await ctx.reply(escapedResponse, { parse_mode: 'MarkdownV2' });
    } else {
      const parts = escapedResponse.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
      for (const part of parts) {
        await ctx.reply(part, { parse_mode: 'MarkdownV2' });
      }
    }
  } catch (error) {
    logger.error('Error processing file:', error);
    await ctx.reply('Произошла ошибка при обработке файла. Пожалуйста, попробуйте еще раз.');
  }
});

export default bot; 