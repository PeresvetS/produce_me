// src/main.js

const { PrismaClient } = require('@prisma/client');
const userBot = require('./app/userBot');
const adminBot = require('./app/adminBot');
const logger = require('./utils/logger');
// const longTermMemoryService = require('./services/memory/longTermMemoryService');

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
}

async function initServices() {
  try {
    // await longTermMemoryService.initialize();
    logger.info('Long-term memory service initialized');
  } catch (error) {
    logger.error('Error initializing services:', error);
    throw error;
  }
}

async function startBots() {
  try {
    logger.info('User bot starting');
    await userBot.launch();
    logger.info('User bot started');

    await adminBot.launch();
    logger.info('Admin bot started');
  } catch (error) {
    logger.error('Error starting bots:', error);
    throw error;
  }
}

async function initialize() {
  try {
    await initDatabase();
    await initServices();
    await startBots();
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Error during initialization:', error);
    throw error;
  }
}

async function shutdown() {
  try {
    await userBot.stop('SIGINT');
    await adminBot.stop('SIGINT');
    await prisma.$disconnect();
    logger.info('Graceful shutdown completed');
  } catch (error) {
    logger.error('Error during shutdown:', error);
    throw error;
  }
}

module.exports = { initialize, shutdown };