const Airtable = require('airtable');
const config = require('../config/config');
const logger = require('../utils/logger');

logger.info('Configuring Airtable with API key:', config.airtableApiKey.substring(0, 5) + '...');
logger.info('Using Airtable base ID:', config.airtableBaseId);

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: config.airtableApiKey
});

const base = Airtable.base(config.airtableBaseId);

// Экспортируем функцию для получения таблицы по её ID
module.exports = (tableId) => base(tableId);