import Groq from 'groq-sdk';
import fs from 'fs';
import { promises as fsp } from 'fs';
import logger from '../utils/logger';
import config from '../config';

export class GroqService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: config.groqApiKey });
  }

  async transcribeAudio(filePath: string): Promise<string> {
    logger.info(`Начало транскрипции аудио файла: ${filePath}`);
    try {
      await fsp.access(filePath);
      
      const transcription = await this.groq.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-large-v3",
        language: "ru",
      });
      
      logger.info('Аудио успешно транскрибировано');
      return transcription.text;
    } catch (error) {
      logger.error('Ошибка при транскрипции аудио:', error);
      throw new Error(`Не удалось транскрибировать аудио: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const groqService = new GroqService(); 