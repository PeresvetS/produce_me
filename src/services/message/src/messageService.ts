import OpenAI from 'openai';
import config from '../../../config';
import logger from '../../../utils/logger';
import { subscriptionService } from '../../subscription';
import { conversationService } from './conversationService';
import { documentReaderService } from './documentReaderService';
import { BotType } from '../../../types';
import { FileContext, FileProcessResult, RunResult, TokenUsage } from '../../../types/message';
import { fileService } from './fileService';

export class MessageService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async processMessageContent(
    userId: string | number, 
    message: string, 
    botType: BotType
  ): Promise<string> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    if (urls && (
      urls[0].includes('docs.google.com') || 
      urls[0].includes('drive.google.com') || 
      urls[0].includes('disk.yandex.ru')
    )) {
      return await documentReaderService.processDocumentUrl(urls[0], message, botType);
    }

    return message;
  }

  async waitForRunCompletion(
    threadId: string, 
    runId: string, 
    maxAttempts = 30, 
    delay = 5000
  ): Promise<RunResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      logger.info(`Run ${runId} status: ${run.status}`);

      switch (run.status) {
        case 'completed':
          const messages = await this.openai.beta.threads.messages.list(threadId);
          const content = messages.data[0].content[0];
          if ('text' in content) {
            return {
              message: content.text.value,
              usage: run.usage as TokenUsage
            };
          }
          throw new Error('Unexpected message content type');
        case 'failed':
          throw new Error(`Run failed: ${run.last_error?.message || 'Unknown error'}`);
        case 'cancelled':
          throw new Error('Run was cancelled');
        default:
          await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Run did not complete within the specified number of attempts');
  }

  private async cancelActiveRuns(threadId: string): Promise<void> {
    logger.info(`Check if need to cancel ${threadId}`);
    const runs = await this.openai.beta.threads.runs.list(threadId);
    
    for (const run of runs.data) {
      logger.info(`status ${run.status}`);
      if (run.status === 'in_progress' || run.status === 'queued' || run.status === 'requires_action') {
        try {
          const cancelledRun = await this.openai.beta.threads.runs.cancel(threadId, run.id);
          logger.info(`Cancelled run ${run.id} for thread ${threadId}. New status: ${cancelledRun.status}`);
          
          let attempts = 0;
          while (cancelledRun.status === 'cancelling' && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const updatedRun = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
            if (updatedRun.status === 'cancelled') {
              logger.info(`Run ${run.id} successfully cancelled`);
              break;
            }
            attempts++;
          }
          
          if (attempts >= 10) {
            logger.warn(`Run ${run.id} cancellation took too long, might be stuck`);
          }
        } catch (cancelError) {
          logger.error(`Failed to cancel run ${run.id}: ${cancelError instanceof Error ? cancelError.message : 'Unknown error'}`);
        }
      }
    }
  }

  async sendMessage(
    userId: string | number,
    message: string,
    botType: BotType
  ): Promise<string> {
    logger.info(`Sending message for user ${userId} to OpenAI Assistants API for bot type ${botType}`);
    try {
      let threadId = await subscriptionService.getUserThreadId(userId, botType);
      const content = await this.processMessageContent(userId, message, botType);

      if (!threadId) {
        const thread = await this.openai.beta.threads.create();
        threadId = thread.id;
        await subscriptionService.setUserThreadId(userId, botType, threadId);
      }

      await this.cancelActiveRuns(threadId);

      await this.openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: content
      });

      const assistantId = config.assistantIds[botType];
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });

      const { message: assistantMessage, usage } = await this.waitForRunCompletion(threadId, run.id);

      await conversationService.logConversation(userId, botType, message, assistantMessage);
      await this.updateTokenUsage(userId, usage);

      return assistantMessage.trim();
    } catch (error) {
      logger.error(`Error sending message to OpenAI Assistants API for bot type ${botType}:`, error);
      throw error;
    }
  }

  async processVoiceMessage(userId: string | number, filePath: string, botType: BotType): Promise<string> {
    return await fileService.processVoiceMessage(userId, filePath, botType);
  }

  async updateTokenUsage(userId: string | number, usage: TokenUsage): Promise<void> {
    if (usage?.total_tokens) {
      try {
        await subscriptionService.updateTokenUsage(userId, usage.total_tokens);
        logger.info(`Updated token usage for user ${userId}: +${usage.total_tokens} tokens`);
        const totalTokens = await subscriptionService.getTotalTokensUsed(userId);
        logger.info(`Total tokens used by user ${userId}: ${totalTokens}`);
      } catch (error) {
        logger.error(`Error updating token usage for user ${userId}:`, error);
        throw error;
      }
    }
  }

  async processFile(ctx: FileContext, userId: string | number, botType: BotType): Promise<FileProcessResult> {
    return await fileService.processFile(ctx, userId, botType);
  }

  async getConversationLog(userId: string | number, botType: BotType): Promise<string> {
    return conversationService.getConversationLog(userId, botType);
  }
}

export const messageService = new MessageService();
