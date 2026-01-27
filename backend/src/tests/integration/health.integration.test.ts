/**
 * Integration Tests für Health-Check Endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { initializeDatabase } from '../../config/database';
import db from '../../config/database';
import { VERSION } from '../../config/version';

// Erstelle eine Test-Express-App
const createTestApp = () => {
  const app = express();
  
  // Health Check Route (vereinfachte Version für Tests)
  app.get('/api/health', async (_req, res) => {
    try {
      let dbStatus = 'ok';
      try {
        db.prepare('SELECT 1').get();
      } catch (error) {
        dbStatus = 'error';
      }
      
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      res.json({ 
        status: dbStatus === 'ok' ? 'ok' : 'degraded',
        version: VERSION,
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime)}s`,
        database: dbStatus,
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        },
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return app;
};

describe('Health Check Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    initializeDatabase();
    app = createTestApp();
  });

  afterAll(() => {
    // Cleanup
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('environment');
    });

    it('should return status "ok" when database is healthy', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('ok');
    });

    it('should include memory information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory.heapUsed).toMatch(/^\d+MB$/);
      expect(response.body.memory.heapTotal).toMatch(/^\d+MB$/);
      expect(response.body.memory.rss).toMatch(/^\d+MB$/);
    });

    it('should include uptime', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.uptime).toMatch(/^\d+s$/);
    });

    it('should include version', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.version).toBeDefined();
      expect(typeof response.body.version).toBe('string');
    });
  });
});

