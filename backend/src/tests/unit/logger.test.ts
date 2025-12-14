/**
 * Unit Tests für Logger
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { logInfo, logError, logWarn, logDebug } from '../../config/logger';

// Mock Winston Logger
jest.mock('../../config/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  return {
    default: mockLogger,
    logInfo: jest.fn((message: string, meta?: Record<string, any>) => {
      mockLogger.info(message, meta);
    }),
    logError: jest.fn((message: string, error?: Error | any, meta?: Record<string, any>) => {
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
      mockLogger.error(message, errorMeta);
    }),
    logWarn: jest.fn((message: string, meta?: Record<string, any>) => {
      mockLogger.warn(message, meta);
    }),
    logDebug: jest.fn((message: string, meta?: Record<string, any>) => {
      mockLogger.debug(message, meta);
    }),
  };
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logInfo', () => {
    it('should log info message', () => {
      logInfo('Test message');
      expect(logInfo).toHaveBeenCalledTimes(1);
      expect(logInfo).toHaveBeenCalledWith('Test message');
    });

    it('should log info message with metadata', () => {
      const meta = { userId: 1, action: 'login' };
      logInfo('User logged in', meta);
      expect(logInfo).toHaveBeenCalledWith('User logged in', meta);
    });
  });

  describe('logError', () => {
    it('should log error message', () => {
      logError('Test error');
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith('Test error');
    });

    it('should log error with Error object', () => {
      const error = new Error('Test error');
      logError('Failed operation', error);
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith('Failed operation', error);
    });

    it('should log error with metadata', () => {
      const error = new Error('Test error');
      const meta = { filePath: '/test.md' };
      logError('Failed to save file', error, meta);
      expect(logError).toHaveBeenCalledWith('Failed to save file', error, meta);
    });
  });

  describe('logWarn', () => {
    it('should log warning message', () => {
      logWarn('Test warning');
      expect(logWarn).toHaveBeenCalledTimes(1);
      expect(logWarn).toHaveBeenCalledWith('Test warning');
    });

    it('should log warning with metadata', () => {
      const meta = { ip: '192.168.1.1' };
      logWarn('Rate limit exceeded', meta);
      expect(logWarn).toHaveBeenCalledWith('Rate limit exceeded', meta);
    });
  });

  describe('logDebug', () => {
    it('should log debug message', () => {
      logDebug('Test debug');
      expect(logDebug).toHaveBeenCalledTimes(1);
      expect(logDebug).toHaveBeenCalledWith('Test debug');
    });
  });
});

