// documentReader.js

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class DocumentReader {
  async readGoogleDoc(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      let content = '';

      // Для Google Sheets
      if (url.includes('spreadsheets')) {
        $('td').each((i, elem) => {
          content += $(elem).text() + '\t';
          if ((i + 1) % 3 === 0) content += '\n';  // Предполагаем, что в таблице 3 колонки
        });
      } else {
        // Для обычных Google Docs
        $('.kix-paragraphrenderer').each((i, elem) => {
          content += $(elem).text() + '\n';
        });
      }

      return content.trim();
    } catch (error) {
      logger.error('Error reading Google Doc:', error);
      throw new Error('Не удалось прочитать Google Document');
    }
  }

 async readYandexDiskFile(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Попытка найти прямую ссылку на скачивание
      const downloadLink = $('a[data-type="download"]').attr('href');
      
      if (downloadLink) {
        const fileResponse = await axios.get(downloadLink, { responseType: 'arraybuffer' });
        const content = fileResponse.data.toString('utf-8');
        return content;
      } else {
        throw new Error('Не удалось найти ссылку для скачивания файла');
      }
    } catch (error) {
      logger.error('Error reading Yandex.Disk file:', error);
      throw new Error('Не удалось прочитать файл с Яндекс.Диска');
    }
  }

  async readDocument(url) {
    if (url.includes('docs.google.com')) {
      return await this.readGoogleDoc(url);
    } else if (url.includes('disk.yandex.ru')) {
      return await this.readYandexDiskFile(url);
    } else {
      throw new Error('Неподдерживаемый тип документа');
    }
  }
}

module.exports = new DocumentReader();