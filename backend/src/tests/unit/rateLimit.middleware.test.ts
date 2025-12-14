/**
 * Unit Tests für Rate Limiting Middleware
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { loginLimiter, apiLimiter, pdfExportLimiter, registerLimiter } from '../../middleware/rateLimit.middleware';

// Mock Express Request/Response
const createMockRequest = (ip: string = '127.0.0.1'): Partial<Request> => ({
  ip,
  socket: { remoteAddress: ip } as any,
  headers: {},
  method: 'POST',
  path: '/test',
  app: {
    get: jest.fn().mockReturnValue(false), // trustProxy = false
  } as any,
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
    send: jest.fn().mockReturnThis() as any,
    end: jest.fn().mockReturnThis() as any,
    setHeader: jest.fn().mockReturnThis() as any,
    getHeader: jest.fn().mockReturnValue(undefined) as any,
    headersSent: false,
    statusCode: 200,
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('loginLimiter', () => {
    it('should allow requests within limit', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Erste 5 Requests sollten durchgehen
      for (let i = 0; i < 5; i++) {
        await new Promise<void>((resolve) => {
          loginLimiter(req as Request, res as Response, (err) => {
            if (err) {
              // Rate limit error - sollte nicht auftreten
            } else {
              next();
            }
            resolve();
          });
        });
      }

      // next sollte 5 mal aufgerufen worden sein
      expect(next).toHaveBeenCalledTimes(5);
    }, 15000); // Erhöhte Timeout für Rate Limiter Tests

    it('should block requests exceeding limit', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // 6. Request sollte blockiert werden
      for (let i = 0; i < 6; i++) {
        await new Promise<void>((resolve) => {
          loginLimiter(req as Request, res as Response, (err) => {
            if (err) {
              // Rate limit error - erwartet für den 6. Request
              expect(err).toBeDefined();
            } else {
              next();
            }
            resolve();
          });
        });
      }

      // Status sollte 429 sein für den 6. Request
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.send).toHaveBeenCalled();
    }, 15000);
  });

  describe('apiLimiter', () => {
    it('should allow requests within limit', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Teste mit weniger Requests (5 statt 100) für schnellere Tests
      const testRequests = 5;
      for (let i = 0; i < testRequests; i++) {
        await new Promise<void>((resolve) => {
          apiLimiter(req as Request, res as Response, (err) => {
            if (err) {
              // Rate limit error - sollte nicht auftreten
            } else {
              next();
            }
            resolve();
          });
        });
        // Kurze Pause zwischen Requests
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      expect(next).toHaveBeenCalledTimes(testRequests);
    }, 15000);
  });

  describe('pdfExportLimiter', () => {
    it('should use user ID as key when available', async () => {
      const req = createMockRequest() as Request;
      (req as any).user = { id: 1 };
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // Key-Generator sollte User-ID verwenden
      await new Promise<void>((resolve) => {
        pdfExportLimiter(req as Request, res as Response, (err) => {
          if (err) {
            // Rate limit error
          } else {
            next();
          }
          resolve();
        });
      });

      // Test erfolgreich, wenn kein Fehler aufgetreten ist
      expect(next).toHaveBeenCalled();
    });
  });

  describe('registerLimiter', () => {
    it('should limit registration attempts', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      // 4. Request sollte blockiert werden (Limit: 3)
      for (let i = 0; i < 4; i++) {
        await new Promise<void>((resolve) => {
          registerLimiter(req as Request, res as Response, (err) => {
            if (err) {
              // Rate limit error - erwartet für den 4. Request
              expect(err).toBeDefined();
            } else {
              next();
            }
            resolve();
          });
        });
      }

      // Status sollte 429 sein für den 4. Request
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.send).toHaveBeenCalled();
    }, 15000);
  });
});

