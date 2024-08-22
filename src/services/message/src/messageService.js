// src/services/message/src/messageService.js

const OpenAI = require('openai');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const documentReaderService = require('./documentReaderService');
const subscriptionService = require('../../subscription/');
const conversationService = require('./conversationService');
const promptSelectionService = require('./promptSelectionService');

const openai = new OpenAI({ apiKey: config.openaiApiKey });


async function processMessageContent(userId, message) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.match(urlRegex);

  if (urls && (urls[0].includes('docs.google.com') || urls[0].includes('drive.google.com') || urls[0].includes('disk.yandex.ru'))) {
    return await documentReaderService.processDocumentUrl(urls[0], message);
  }

  return message;
};

async function waitForRunCompletion(threadId, runId) {
  let run;
  do {
    run = await openai.beta.threads.runs.retrieve(threadId, runId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
  } while (run.status !== 'completed');

  const messages = await openai.beta.threads.messages.list(threadId);
  return messages.data[0].content[0].text.value;
};


async function sendMessage(userId, message) {
  logger.info(`Sending message for user ${userId} to OpenAI Assistants API`);
  try {
    let threadId = await subscriptionService.getUserThreadId(userId);
    const content = await processMessageContent(userId, message);
    const systemPrompt = await promptSelectionService.selectPrompt(userId, content);

    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      await subscriptionService.setUserThreadId(userId, threadId);
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `системный промпт: ${systemPrompt}\n пользовательский промпт: ${content}`
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: config.assistantId,
      instructions: "Please provide a helpful and informative response."
    });

    const assistantMessage = await waitForRunCompletion(threadId, run.id);

    await conversationService.logConversation(userId, message, assistantMessage);

    return assistantMessage.trim();
  } catch (error) {
    logger.error('Error sending message to OpenAI Assistants API:', error);
    throw error;
  }
}


// async function processResponse(response, threadId) {
//   let assistantMessage = '';
//   let buffer = '';

//   for await (const chunk of response.data) {
//     buffer += chunk.toString();
//     let lines = buffer.split('\n');
//     buffer = lines.pop();

//     for (const line of lines) {
//       if (line.startsWith('data: ')) {
//         try {
//           const data = JSON.parse(line.slice(5));
//           if (data.message && data.message.content && data.message.content.parts) {
//             assistantMessage = data.message.content.parts[0];
//           }
//           if (!threadId && data.thread_id) {
//             threadId = data.thread_id;
//           }
//         } catch (error) {
//           logger.error('Error parsing JSON:', error.message);
//         }
//       }
//     }
//   }

//   return { assistantMessage, newthreadId: threadId };
// };


module.exports = {  
  processMessageContent,
  sendMessage,
  // processResponse,
};