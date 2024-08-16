// src/services/documentReader.js

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class DocumentReader {
  async readGoogleDoc(url) {
    logger.info(`Начало чтения Google документа: ${url}`);
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      let content = '';

      if (url.includes('spreadsheets')) {
        $('td').each((i, elem) => {
          content += $(elem).text() + '\t';
          if ((i + 1) % 3 === 0) content += '\n';  // Предполагаем, что в таблице 3 колонки
        });
      } else {
        $('.kix-paragraphrenderer').each((i, elem) => {
          content += $(elem).text() + '\n';
        });
      }

      logger.info('Google документ успешно прочитан');
      return content.trim();
    } catch (error) {
      logger.error('Ошибка при чтении Google документа:', error);
      throw new Error('Не удалось прочитать Google Document: ' + error.message);
    }
  }

  async readYandexDiskFile(url) {
    logger.info(`Начало чтения файла с Яндекс.Диска: ${url}`);
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      const downloadLink = $('a[data-type="download"]').attr('href');
      
      if (downloadLink) {
        const fileResponse = await axios.get(downloadLink, { responseType: 'arraybuffer' });
        const content = fileResponse.data.toString('utf-8');
        logger.info('Файл с Яндекс.Диска успешно прочитан');
        return content;
      } else {
        throw new Error('Не удалось найти ссылку для скачивания файла');
      }
    } catch (error) {
      logger.error('Ошибка при чтении файла с Яндекс.Диска:', error);
      throw new Error('Не удалось прочитать файл с Яндекс.Диска: ' + error.message);
    }
  }

  async readDocument(url) {
    logger.info(`Начало чтения документа: ${url}`);
    try {
      if (url.includes('docs.google.com')) {
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
}

module.exports = new DocumentReader();