// logger.js

const winston = require('winston');
const { combine, timestamp, printf, errors, splat } = winston.format;
require('winston-daily-rotate-file');


// Создаем кастомный формат для логов
const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${safeStringify(metadata)}`;
  }
  return msg;
});

// Конфигурация для ротации файлов с общими логами
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'temp/logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(
    timestamp(),
    myFormat
  )
});

// Конфигурация для ротации файлов с ошибками
const errorFileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'temp/logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: combine(
    timestamp(),
    myFormat
  )
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    splat(),
    myFormat
  ),
  defaultMeta: { service: 'tg-wa-service' },
  transports: [
    fileRotateTransport,
    errorFileRotateTransport
  ],
});



logger.add(new winston.transports.Console({
  format: combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

module.exports = logger;