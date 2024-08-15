// src/db/postgresConfig.js

const prisma = require('./prisma');
const logger = require('../utils/logger');

module.exports = {
  query: async (sql, params) => {
    logger.info('Executing query:', sql);
    return prisma.$queryRawUnsafe(sql, ...params);
  },
  getClient: () => prisma,
};