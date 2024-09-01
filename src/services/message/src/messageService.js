// src/services/message/src/messageService.js

const OpenAI = require('openai');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const subscriptionService = require('../../subscription/');
const conversationService = require('./conversationService');
const documentReaderService = require('./documentReaderService');

const openai = new OpenAI({ apiKey: config.openaiApiKey });

async function processMessageContent(userId, message, botType) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.match(urlRegex);

  if (urls && (urls[0].includes('docs.google.com') || urls[0].includes('drive.google.com') || urls[0].includes('disk.yandex.ru'))) {
    return await documentReaderService.processDocumentUrl(urls[0], message, botType);
  }

  return message;
}

async function waitForRunCompletion(threadId, runId, maxAttempts = 30, delay = 5000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    logger.info(`Run ${runId} status: ${run.status}`);

    switch (run.status) {
      case 'completed':
        const messages = await openai.beta.threads.messages.list(threadId);
        return {
          message: messages.data[0].content[0].text.value,
          usage: run.usage
        };
      case 'failed':
        throw new Error(`Run failed: ${run.last_error?.message || 'Unknown error'}`);
      case 'cancelled':
        throw new Error('Run was cancelled');
      case 'expired':
        throw new Error('Run expired');
      default:
        await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  await cancelActiveRuns(threadId);
  throw new Error(`Run ${runId} did not complete after ${maxAttempts} attempts`);
}

async function cancelActiveRuns(threadId) {
  logger.info(`Check if need to cancel ${threadId}`);
  const runs = await openai.beta.threads.runs.list(threadId);
  for (const run of runs.data) {
    logger.info(`status ${run.status}`);
    if (run.status === 'in_progress' || run.status === 'queued' || run.status === 'requires_action') {
      try {
        const cancelledRun = await openai.beta.threads.runs.cancel(threadId, run.id);
        logger.info(`Cancelled run ${run.id} for thread ${threadId}. New status: ${cancelledRun.status}`);
        
        // Ожидание полной отмены запуска
        let attempts = 0;
        while (cancelledRun.status === 'cancelling' && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const updatedRun = await openai.beta.threads.runs.retrieve(threadId, run.id);
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
        logger.error(`Failed to cancel run ${run.id}: ${cancelError.message}`);
      }
    }
  }
}

// async function cleanupOldMessages(threadId, maxMessages = 10) {
//   const messages = await openai.beta.threads.messages.list(threadId);
//   if (messages.data.length > maxMessages) {
//     const messagesToDelete = messages.data.slice(maxMessages);
//     for (const message of messagesToDelete) {
//       await openai.beta.threads.messages.del(threadId, message.id);
//     }
//     logger.info(`Cleaned up ${messagesToDelete.length} old messages from thread ${threadId}`);
//   }
// }

async function sendMessage(userId, message, botType) {
  logger.info(`Sending message for user ${userId} to OpenAI Assistants API for bot type ${botType}`);
  try {
    let threadId = await subscriptionService.getUserThreadId(userId, botType);
    const content = await processMessageContent(userId, message, botType);

    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      await subscriptionService.setUserThreadId(userId, botType, threadId);
    }

    await cancelActiveRuns(threadId);

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: content
    });

    const assistantId = config.assistantIds[botType];
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    const { message: assistantMessage, usage } = await waitForRunCompletion(threadId, run.id);

    await conversationService.logConversation(userId, botType, message, assistantMessage);
    await updateTokenUsage(userId, usage);

    return assistantMessage.trim();
  } catch (error) {
    logger.error(`Error sending message to OpenAI Assistants API for bot type ${botType}:`, error);
    throw error;
  }
}



async function updateTokenUsage(userId, usage) {
  if (usage && usage.total_tokens) {
    try {
      await subscriptionService.updateTokenUsage(userId, usage.total_tokens);
      logger.info(`Updated token usage for user ${userId}: +${usage.total_tokens} tokens`);
      const totalTokens = await subscriptionService.getTotalTokensUsed(userId);
      logger.info(`Total tokens used by user ${userId}: ${totalTokens}`);
    } catch (error) {
      logger.error(`Error updating token usage for user ${userId}:`, error);
    }
  }
}

module.exports = {  
  sendMessage,
  updateTokenUsage,
  waitForRunCompletion,
  processMessageContent,
};