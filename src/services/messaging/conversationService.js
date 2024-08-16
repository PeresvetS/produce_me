// src/services/messaging/conversationService.js

const { ConversationChain } = require("langchain/chains");
const { ChatOpenAI } = require("@langchain/openai");
const { BufferMemory } = require("langchain/memory");
const { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder } = require("langchain/prompts");

class ConversationService {
  constructor() {
    this.conversations = new Map();
  }

  async getOrCreateConversation(userId) {
    if (!this.conversations.has(userId)) {
      const chat = new ChatOpenAI({ temperature: 0.7 });
      const memory = new BufferMemory({ returnMessages: true, memoryKey: "history" });
      
      const prompt = ChatPromptTemplate.fromPromptMessages([
        SystemMessagePromptTemplate.fromTemplate("The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know."),
        new MessagesPlaceholder("history"),
        HumanMessagePromptTemplate.fromTemplate("{input}")
      ]);

      const chain = new ConversationChain({
        memory: memory,
        prompt: prompt,
        llm: chat
      });

      this.conversations.set(userId, chain);
    }
    return this.conversations.get(userId);
  }

  async processMessage(userId, message) {
    const conversation = await this.getOrCreateConversation(userId);
    const response = await conversation.call({ input: message });
    return response.response;
  }
}

module.exports = new ConversationService();