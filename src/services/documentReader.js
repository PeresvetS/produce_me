const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class DocumentReader {
  async readGoogleDoc(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      let content = '';

      // Извлекаем текст из всех элементов с классом 'kix-paragraphrenderer'
      $('.kix-paragraphrenderer').each((i, elem) => {
        content += $(elem).text() + '\n';
      });

      return content.trim();
    } catch (error) {
      logger.error('Error reading Google Doc:', error);
      throw new Error('Не удалось прочитать Google Document');
    }
  }

  async readYandexDoc(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const fullText = $('.yfm-content').text();
      return fullText.trim();
    } catch (error) {
      logger.error('Error reading Yandex Doc:', error);
      throw new Error('Не удалось прочитать Яндекс Документ');
    }
  }

  async readDocument(url) {
    if (url.includes('docs.google.com')) {
      return await this.readGoogleDoc(url);
    } else if (url.includes('docs.yandex.ru')) {
      return await this.readYandexDoc(url);
    } else {
      throw new Error('Неподдерживаемый тип документа');
    }
  }
}

module.exports = new DocumentReader();