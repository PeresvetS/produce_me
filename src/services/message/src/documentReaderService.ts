import axios from 'axios';
import cheerio from 'cheerio';
import xlsx from 'xlsx';
import logger from '../../../utils/logger';
import { BotType } from '../../../types';
import { SheetData, DocumentContent } from '../../../types/document';

export class DocumentReaderService {
  async readGoogleDoc(url: string): Promise<DocumentContent> {
    logger.info(`Начало чтения Google документа: ${url}`);
    try {
      const response = await axios.get(url, { 
        params: { output: 'csv' },
        responseType: 'arraybuffer'
      });
      
      const workbook = xlsx.read(response.data, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      
      logger.info('Google документ успешно прочитан (первый лист)');
      return { [firstSheetName]: this.cleanSheetData(jsonData as { [key: string]: string | number }[]) };
    } catch (error) {
      logger.error('Ошибка при чтении Google документа:', error);
      throw new Error(`Не удалось прочитать Google Document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  private cleanSheetData(jsonData: { [key: string]: string | number }[]): SheetData[] {
    return jsonData
      .map(row => Object.fromEntries(
        Object.entries(row)
          .filter(([key, value]) => key !== '__EMPTY' && value !== '')
      ) as SheetData)
      .filter(row => Object.keys(row).length > 0);
  }

  async readYandexDiskFile(url: string): Promise<string> {
    logger.info(`Начало чтения файла с Яндекс.Диска: ${url}`);
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      const downloadLink = $('a[data-type="download"]').attr('href');
      
      if (!downloadLink) {
        throw new Error('Не удалось найти ссылку для скачивания файла');
      }

      const fileResponse = await axios.get(downloadLink, { responseType: 'arraybuffer' });
      const workbook = xlsx.read(fileResponse.data, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet);
      
      logger.info('Файл с Яндекс.Диска успешно прочитан и преобразован в JSON');
      return JSON.stringify(jsonData, null, 2);
    } catch (error) {
      logger.error('Ошибка при чтении файла с Яндекс.Диска:', error);
      throw new Error(`Не удалось прочитать файл с Яндекс.Диска: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processDocumentUrl(documentUrl: string, originalMessage: string, botType: BotType): Promise<string> {
    try {
      const documentContent = await this.readDocument(documentUrl);
      logger.info(`Тип полученных данных: ${typeof documentContent}`);
      logger.info(`Структура данных: ${JSON.stringify(documentContent, null, 2).slice(0, 200)}...`);

      if (!documentContent || (typeof documentContent === 'object' && Object.keys(documentContent).length === 0)) {
        return 'Не удалось прочитать содержимое документа. Возможно, документ пуст или у меня нет доступа к нему.';
      }

      let content = this.formatDocumentContent(documentContent, documentUrl);
      content = this.appendUserMessage(content, originalMessage, documentUrl);
      
      if (botType === 'PRODUCER') {
        content = this.appendProducerAnalysis(content);
      }

      return content;
    } catch (error) {
      logger.error('Error reading document:', error);
      return `Не удалось прочитать документ: ${error instanceof Error ? error.message : 'Unknown error'}. Пожалуйста, убедитесь, что ссылка корректна, документ доступен для чтения и не является приватным.`;
    }
  }

  private formatDocumentContent(documentContent: DocumentContent | string, documentUrl: string): string {
    let content = `Содержимое документа по ссылке ${documentUrl}:\n\n`;
    
    if (typeof documentContent === 'object') {
      return this.formatObjectContent(content, documentContent);
    } else if (typeof documentContent === 'string') {
      return this.formatStringContent(content, documentContent);
    }
    
    return content + 'Неподдерживаемый формат данных\n';
  }

  private appendUserMessage(content: string, originalMessage: string, documentUrl: string): string {
    const originalUserText = originalMessage.replace(documentUrl, '').trim();
    if (originalUserText) {
      content += `\nТакже мой запрос: ${originalUserText}\n\n`;
    }
    return content;
  }

  private appendProducerAnalysis(content: string): string {
    return content + '\nВАЖНО! Пожалуйста, проанализируй этот документ и дай креативный вывод по моему архетипу, позиционированию, сильным сторонам, Икигай, социотипу';
  }

  async readDocument(url: string): Promise<DocumentContent | string> {
    logger.info(`Начало чтения документа: ${url}`);
    try {
      if (url.includes('docs.google.com') || url.includes('drive.google.com')) {
        return await this.readGoogleDoc(url);
      } else if (url.includes('disk.yandex.ru')) {
        return await this.readYandexDiskFile(url);
      } else {
        throw new Error('Неподдерживаемый тип документа');
      }
    } catch (error) {
      logger.error('Ошибка при чтении документа:', error);
      throw error;
    }
  }

  private formatObjectContent(content: string, documentContent: DocumentContent): string {
    const [sheetName, sheetData] = Object.entries(documentContent)[0];
    content += `Вкладка "${sheetName}":\n`;
    
    if (Array.isArray(sheetData) && sheetData.length > 0) {
      const headers = Object.keys(sheetData[0]);
      content += headers.join(' | ') + '\n';
      content += headers.map(() => '---').join(' | ') + '\n';
      
      sheetData.forEach((row, index) => {
        if (index < 20) {
          content += headers.map(header => row[header] || '').join(' | ') + '\n';
        }
      });
      
      if (sheetData.length > 20) {
        content += `... и еще ${sheetData.length - 20} строк\n`;
      }
    } else {
      content += 'Пустая вкладка или нет данных\n';
    }
    
    return content;
  }

  private formatStringContent(content: string, documentContent: string): string {
    try {
      const jsonContent = JSON.parse(documentContent);
      content += 'Содержимое таблицы:\n';
      
      for (const [index, row] of jsonContent.entries()) {
        if (index < 20) {
          content += `Строка ${index + 1}:\n`;
          for (const [key, value] of Object.entries(row)) {
            content += `  ${key}: ${value}\n`;
          }
          content += '\n';
        } else {
          content += `... и еще ${jsonContent.length - 20} строк\n`;
          break;
        }
      }
    } catch (jsonError) {
      logger.error('Error parsing JSON content:', jsonError);
      content += documentContent.slice(0, 1000) + '...';
    }
    
    return content;
  }
}

export const documentReaderService = new DocumentReaderService(); 