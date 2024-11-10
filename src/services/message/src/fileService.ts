import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import axios from 'axios';
import mime from 'mime-types';
import sizeOf from 'image-size';
import OpenAI from 'openai';
import config from '../../../config';
import logger from '../../../utils/logger';
import { groqService } from '../../groqService';
import { messageService } from './messageService';
import { subscriptionService } from '../../subscription';
import { dataManagementService } from '../../management';
import { BotType } from '../../../types';
import { FileContext, FileProcessResult, FileMetadata } from '../../../types/message';

export class FileService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async processFile(ctx: FileContext, userId: string | number, botType: BotType): Promise<FileProcessResult> {
    let file;
    let caption: string;
    
    if (ctx.message.document) {
      file = ctx.message.document;
      caption = ctx.message.caption || 'Проанализируй этот документ';
    } else if (ctx.message.photo) {
      file = ctx.message.photo[ctx.message.photo.length - 1];
      caption = ctx.message.caption || 'Опиши это изображение';
    } else {
      throw new Error('Unsupported file type');
    }

    await ctx.reply('Минуту, обрабатываю файл');

    const fileId = file.file_id;
    const fileInfo = await ctx.api.getFile(fileId);
    const botToken = config[`${botType.toLowerCase()}BotToken` as keyof typeof config];
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;
    
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'arraybuffer'
    });

    const tempDir = path.join(__dirname, '../../../../temp');
    await fsp.mkdir(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `file_${userId}_${Date.now()}${path.extname(fileInfo.file_path || '')}`);
    await fsp.writeFile(tempFilePath, response.data);

    logger.info(`File saved: ${tempFilePath}`);

    const uploadedFile = await this.openai.files.create({
      file: fs.createReadStream(tempFilePath),
      purpose: 'assistants',
    });

    logger.info(`File uploaded to OpenAI: ${JSON.stringify(uploadedFile)}`);

    const threadId = await subscriptionService.getUserThreadId(userId, botType);
    let thread;

    if (!threadId) {
      thread = await this.openai.beta.threads.create();
      await subscriptionService.setUserThreadId(userId, botType, thread.id);
    } else {
      thread = { id: threadId };
    }

    const run = await this.openai.beta.threads.runs.create(thread.id, {
      assistant_id: config.assistantIds[botType],
    });

    const { message: aiResponse, usage } = await messageService.waitForRunCompletion(thread.id, run.id);

    await fsp.unlink(tempFilePath);

    await subscriptionService.logMessage(userId, botType);
    await dataManagementService.incrementDialogCount(userId);

    if (usage?.total_tokens) {
      await subscriptionService.updateTokenUsage(userId, usage.total_tokens);
      logger.info(`Updated token usage for user ${userId}: +${usage.total_tokens} tokens`);
    }

    return { aiResponse, usage };
  }

  async processVoiceMessage(userId: string | number, filePath: string, botType: BotType): Promise<string> {
    try {
      const transcribedText = await groqService.transcribeAudio(filePath);
      logger.info(`Voice message transcribed successfully for user ${userId}`);
      return messageService.sendMessage(userId, transcribedText, botType);
    } catch (error) {
      logger.error(`Error processing voice message for user ${userId}:`, error);
      throw error;
    }
  }

  convertMarkdownToHtml(markdown: string): string {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  }

  async getFileMetadata(filePath: string): Promise<FileMetadata> {
    const stats = await fsp.stat(filePath);
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    let width = 0;
    let height = 0;

    if (mimeType.startsWith('image/')) {
      try {
        const dimensions = sizeOf(await fsp.readFile(filePath));
        width = dimensions.width || 0;
        height = dimensions.height || 0;
      } catch (error) {
        logger.warn(`Could not determine image dimensions for ${filePath}:`, error);
      }
    }

    return {
      size: stats.size,
      mimeType,
      width,
      height
    };
  }
}

export const fileService = new FileService();