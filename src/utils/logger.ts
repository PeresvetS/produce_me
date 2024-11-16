import winston from 'winston';
import 'winston-daily-rotate-file';
import { Format } from 'logform';

const { combine, timestamp, printf, errors, splat } = winston.format;

interface LogMetadata {
  [key: string]: any;
  level: string;
  message: string;
  timestamp: string;
}

const safeStringify = (obj: any): string => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  }, 2);
};

const myFormat: Format = printf((info) => {
  const { level, message, ...metadata } = info;
  const timestamp = info[Symbol.for('timestamp')] || new Date().toISOString();
  let msg = `${timestamp} [${level}] : ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${safeStringify(metadata)}`;
  }
  return msg;
});

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

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;