/**
 * Unit Tests für Rate Limiting Middleware
 */

import { describe, it } from '@jest/globals';
import express, { RequestHandler } from 'express';
import request from 'supertest';
import { loginLimiter, apiLimiter, pdfExportLimiter, registerLimiter } from '../../middleware/rateLimit.middleware';

const createAppWithLimiter = (limiter: RequestHandler, beforeLimiter?: RequestHandler) => {
  const app = express();
  app.set('trust proxy', true);

  const middlewares: RequestHandler[] = [];
  if (beforeLimiter) {
    middlewares.push(beforeLimiter);
  }
  middlewares.push(limiter);
  middlewares.push((_req, res) => res.status(200).json({ ok: true }));

  app.post('/test', ...middlewares);
  return app;
};

const postWithIp = (app: express.Application, ip: string) =>
  request(app).post('/test').set('X-Forwarded-For', ip);

describe('Rate Limiting Middleware', () => {
  describe('loginLimiter', () => {
    it('should allow requests within limit and block after', async () => {
      const app = createAppWithLimiter(loginLimiter);
      const ip = '203.0.113.10';
      const limit = process.env.NODE_ENV === 'production' ? 5 : 20;

      for (let i = 0; i < limit; i++) {
        await postWithIp(app, ip).expect(200);
      }

      await postWithIp(app, ip).expect(429);
    }, 15000);
  });

  describe('apiLimiter', () => {
    it('should allow requests within limit', async () => {
      const app = createAppWithLimiter(apiLimiter);
      const ip = '203.0.113.11';

      for (let i = 0; i < 5; i++) {
        await postWithIp(app, ip).expect(200);
      }
    }, 15000);
  });

  describe('pdfExportLimiter', () => {
    it('should use user ID as key when available', async () => {
      const app = createAppWithLimiter(pdfExportLimiter, (req, _res, next) => {
        (req as any).user = { id: 1 };
        next();
      });
      const ip = '203.0.113.12';

      for (let i = 0; i < 10; i++) {
        await postWithIp(app, ip).expect(200);
      }

      await postWithIp(app, ip).expect(429);
    }, 15000);
  });

  describe('registerLimiter', () => {
    it('should limit registration attempts', async () => {
      const app = createAppWithLimiter(registerLimiter);
      const ip = '203.0.113.13';

      for (let i = 0; i < 3; i++) {
        await postWithIp(app, ip).expect(200);
      }

      await postWithIp(app, ip).expect(429);
    }, 15000);
  });
});

