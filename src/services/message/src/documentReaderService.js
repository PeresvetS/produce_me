// src/services/message/src/documentReaderService.js

const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const logger = require('../../../utils/logger');

module.exports = {  async readGoogleDoc(url) {
  logger.info(`Начало чтения Google документа: ${url}`);
  try {
    const response = await axios.get(url, { 
      params: { output: 'csv' },
      responseType: 'arraybuffer'
    });
    
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    
    // Читаем только первый лист
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    
    logger.info('Google документ успешно прочитан (первый лист)');
    return { [firstSheetName]: this.cleanSheetData(jsonData) };
  } catch (error) {
    logger.error('Ошибка при чтении Google документа:', error);
    throw new Error('Не удалось прочитать Google Document: ' + error.message);
  }
},

cleanSheetData(jsonData) {
  return jsonData
    .map(row => Object.fromEntries(
      Object.entries(row)
        .filter(([key, value]) => key !== '__EMPTY' && value !== '')
    ))
    .filter(row => Object.keys(row).length > 0);
},

  async readYandexDiskFile(url) {
    logger.info(`Начало чтения файла с Яндекс.Диска: ${url}`);
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      const downloadLink = $('a[data-type="download"]').attr('href');
      
      if (downloadLink) {
        const fileResponse = await axios.get(downloadLink, { responseType: 'arraybuffer' });
        const workbook = xlsx.read(fileResponse.data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Преобразуем в JSON
        const jsonData = xlsx.utils.sheet_to_json(sheet);
        
        logger.info('Файл с Яндекс.Диска успешно прочитан и преобразован в JSON');
        return JSON.stringify(jsonData, null, 2);  // Возвращаем отформатированный JSON
      } else {
        throw new Error('Не удалось найти ссылку для скачивания файла');
      }
    } catch (error) {
      logger.error('Ошибка при чтении файла с Яндекс.Диска:', error);
      throw new Error('Не удалось прочитать файл с Яндекс.Диска: ' + error.message);
    }
  },

  async readDocument(url) {
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
  },

  async processDocumentUrl(documentUrl, originalMessage) {
    try {
      const documentContent = await this.readDocument(documentUrl);
      logger.info(`Тип полученных данных: ${typeof documentContent}`);
      logger.info(`Структура данных: ${JSON.stringify(documentContent, null, 2).slice(0, 200)}...`);

      if (!documentContent || (typeof documentContent === 'object' && Object.keys(documentContent).length === 0)) {
        return 'Не удалось прочитать содержимое документа. Возможно, документ пуст или у меня нет доступа к нему.';
      }

      let content = `Содержимое документа по ссылке ${documentUrl}:\n\n`;

      if (typeof documentContent === 'object') {
        // Обработка объекта (результат readGoogleDoc)
        const [sheetName, sheetData] = Object.entries(documentContent)[0]; // Берем только первый лист
        content += `Вкладка "${sheetName}":\n`;
        if (Array.isArray(sheetData) && sheetData.length > 0) {
          const headers = Object.keys(sheetData[0]);
          content += headers.join(' | ') + '\n';
          content += headers.map(() => '---').join(' | ') + '\n';
          sheetData.forEach((row, index) => {
            if (index < 20) { // Ограничиваем вывод первыми 20 строками
              content += headers.map(header => row[header] || '').join(' | ') + '\n';
            }
          });
          if (sheetData.length > 20) {
            content += `... и еще ${sheetData.length - 20} строк\n`;
          }
        } else {
          content += 'Пустая вкладка или нет данных\n';
        }
      } else if (typeof documentContent === 'string') {
        // Обработка строки (например, результат readYandexDiskFile)
        try {
          const jsonContent = JSON.parse(documentContent);
          content += 'Содержимое таблицы:\n';
          for (const [index, row] of jsonContent.entries()) {
            if (index < 20) { // Ограничиваем вывод первыми 20 строками
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
          content += documentContent.slice(0, 1000) + '...'; // Добавляем первые 1000 символов строки
        }
      } else {
        content += 'Неподдерживаемый формат данных\n';
      }

      content += '\n';
      const originalUserText = originalMessage.replace(documentUrl, '').trim();
      if (originalUserText) {
        content += `Также мой запрос: ${originalUserText}\n\n`;
      }
      content += `Пожалуйста, проанализируй этот документ, он важен для нашего диалога.`;
      return content;
    } catch (error) {
      logger.error('Error reading document:', error);
      return `Не удалось прочитать документ: ${error.message}. Пожалуйста, убедитесь, что ссылка корректна, документ доступен для чтения и не является приватным.`;
    }
  }
};