/**
 * Winston Logger Konfiguration
 * 
 * Strukturiertes Logging mit Rotation
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Log-Verzeichnis erstellen
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log-Format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console-Format (für Development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Transport: Tägliche Rotation für alle Logs
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'notenest-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m', // Max. 20 MB pro Datei
  maxFiles: '30d', // Behalte Logs für 30 Tage
  format: logFormat,
  zippedArchive: true, // Komprimiere alte Logs
});

// Transport: Separate Error-Logs
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'notenest-error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
  level: 'error',
  zippedArchive: true,
});

// Logger erstellen
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: { service: 'notenest-backend' },
  transports: [
    dailyRotateFileTransport,
    errorFileTransport,
  ],
  // Exception Handler
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'notenest-exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      zippedArchive: true,
    }),
  ],
  // Rejection Handler
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'notenest-rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      zippedArchive: true,
    }),
  ],
});

// In Development: Auch auf Console ausgeben
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Helper-Funktionen für strukturiertes Logging
export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any, meta?: Record<string, any>) => {
  const errorMeta = {
    ...meta,
    ...(error instanceof Error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    } : { error }),
  };
  logger.error(message, errorMeta);
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

export default logger;

