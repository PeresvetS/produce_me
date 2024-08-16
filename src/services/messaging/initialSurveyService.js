// src/services/messaging/initialSurveyService.js

const { LLMChain } = require("langchain/chains");
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const logger = require('../../utils/logger');
const prisma = require('../../db/prisma');

class InitialSurveyService {
  constructor() {
    this.llm = new ChatOpenAI({ temperature: 0.7 });
    this.surveyChain = new LLMChain({
      llm: this.llm,
      prompt: PromptTemplate.fromTemplate(
        "Ты - AI-ассистент, проводящий начальный опрос пользователя. Задай следующий вопрос из списка, основываясь на предыдущих ответах:\n\nСписок вопросов:\n1. Дата рождения\n2. Ключевые качества личности\n3. Вопросы для определения социотипа\n4. Вопросы для определения архетипа\n5. Другие параметры для позиционирования\n\nПредыдущие ответы: {previousAnswers}\n\nСледующий вопрос:"
      ),
    });
  }

  async startSurvey(userId) {
    logger.info(`Starting initial survey for user ${userId}`);
    try {
      await prisma.userData.upsert({
        where: {
          userId_key: {
            userId: BigInt(userId),
            key: 'surveyStatus'
          }
        },
        update: {
          value: { started: true, completed: false }
        },
        create: {
          userId: BigInt(userId),
          key: 'surveyStatus',
          value: { started: true, completed: false }
        }
      });
      const firstQuestion = await this.getNextQuestion(userId, []);
      return firstQuestion;
    } catch (error) {
      logger.error(`Error starting survey for user ${userId}:`, error);
      throw error;
    }
  }

  async processAnswer(userId, answer) {
    logger.info(`Processing survey answer for user ${userId}`);
    try {
      const userData = await prisma.userData.findUnique({
        where: {
          userId_key: {
            userId: BigInt(userId),
            key: 'surveyAnswers'
          }
        }
      });

      const previousAnswers = userData?.value || [];
      previousAnswers.push(answer);

      await prisma.userData.upsert({
        where: {
          userId_key: {
            userId: BigInt(userId),
            key: 'surveyAnswers'
          }
        },
        update: {
          value: previousAnswers
        },
        create: {
          userId: BigInt(userId),
          key: 'surveyAnswers',
          value: previousAnswers
        }
      });

      if (previousAnswers.length >= 5) {
        await this.completeSurvey(userId);
        return "Спасибо за ваши ответы! Начальный опрос завершен.";
      }

      const nextQuestion = await this.getNextQuestion(userId, previousAnswers);
      return nextQuestion;
    } catch (error) {
      logger.error(`Error processing survey answer for user ${userId}:`, error);
      throw error;
    }
  }

  async getNextQuestion(userId, previousAnswers) {
    logger.info(`Getting next survey question for user ${userId}`);
    try {
      const result = await this.surveyChain.call({ previousAnswers: JSON.stringify(previousAnswers) });
      return result.text.trim();
    } catch (error) {
      logger.error(`Error getting next survey question for user ${userId}:`, error);
      throw error;
    }
  }

  async completeSurvey(userId) {
    logger.info(`Completing survey for user ${userId}`);
    try {
      await prisma.userData.upsert({
        where: {
          userId_key: {
            userId: BigInt(userId),
            key: 'surveyStatus'
          }
        },
        update: {
          value: { started: true, completed: true }
        },
        create: {
          userId: BigInt(userId),
          key: 'surveyStatus',
          value: { started: true, completed: true }
        }
      });
    } catch (error) {
      logger.error(`Error completing survey for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new InitialSurveyService();