/**
 * Integration Tests für Authentifizierung
 * 
 * Testet die vollständige Auth-Flow (Register → Login → Refresh)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import path from 'path';
import fs from 'fs';

let app: express.Application;
let dbPath: string;
let baseRefreshToken = '';

const baseUser = {
  username: 'authuser',
  password: 'TestPassword123!',
  email: 'authuser@example.com'
};

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'local';
    process.env.DEPLOYMENT_MODE = 'standalone';
    process.env.REGISTRATION_ENABLED = 'true';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

    dbPath = path.join(__dirname, '../../../data/database/test-auth.db');
    process.env.DB_PATH = dbPath;

    const { initializeDatabase } = await import('../../config/database');
    initializeDatabase();

    const authRoutes = (await import('../../routes/auth.routes')).default;
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(baseUser)
      .expect(201);

    baseRefreshToken = registerResponse.body.refreshToken;
  });

  afterAll(() => {
    const cleanupFiles = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
    for (const file of cleanupFiles) {
      try {
        if (file && fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // Ignore cleanup failures
      }
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'TestPassword123!',
          email: 'newuser@example.com'
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.username).toBe('newuser');
    });

    it('should reject duplicate username', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: baseUser.username,
          password: baseUser.password
        })
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: baseUser.username,
          password: baseUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.username).toBe(baseUser.username);
    });

    it('should reject incorrect password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: baseUser.username,
          password: 'WrongPassword123!'
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: baseRefreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });
  });
});

