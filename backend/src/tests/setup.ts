/**
 * Jest Test Setup
 * 
 * Globale Test-Konfiguration
 */

import { jest } from '@jest/globals';

// Setze Test-Umgebungsvariablen
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DB_PATH = ':memory:'; // In-Memory-Datenbank für Tests
process.env.LOG_LEVEL = 'error'; // Reduziere Logging in Tests

// Mock Winston Logger für Tests (reduziert Log-Output)
jest.mock('../config/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
  logDebug: jest.fn(),
}));

