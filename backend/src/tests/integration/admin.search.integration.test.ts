/**
 * Integration Tests für Admin Search-Endpoints
 * 
 * Tests für Re-Indexierung und Index-Status
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import db from '../../config/database';
import { initializeDatabase } from '../../config/database';
import { reindexAll, getIndexStatus } from '../../controllers/admin.controller';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Admin Search Endpoints', () => {
  let app: express.Application;
  let adminUserId: number;
  let regularUserId: number;
  let testDir: string;
  
  beforeEach(async () => {
    // Initialisiere Datenbank
    initializeDatabase();
    
    // Erstelle Test-Benutzer
    const adminResult = db.prepare(`
      INSERT INTO users (username, password_hash, auth_type, is_active, is_admin)
      VALUES (?, ?, 'local', 1, 1)
    `).run('admin', 'hash');
    adminUserId = adminResult.lastInsertRowid as number;
    
    const regularResult = db.prepare(`
      INSERT INTO users (username, password_hash, auth_type, is_active, is_admin)
      VALUES (?, ?, 'local', 1, 0)
    `).run('user', 'hash');
    regularUserId = regularResult.lastInsertRowid as number;
    
    // Erstelle Test-Verzeichnis
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notenest-test-'));
    
    // Erstelle User-Settings
    db.prepare(`
      INSERT INTO user_settings (user_id, private_folder_path, shared_folder_path)
      VALUES (?, ?, ?)
    `).run(adminUserId, testDir, testDir);
    
    db.prepare(`
      INSERT INTO user_settings (user_id, private_folder_path, shared_folder_path)
      VALUES (?, ?, ?)
    `).run(regularUserId, testDir, testDir);
    
    // Erstelle Express-App für Tests
    app = express();
    app.use(express.json());
    
    // Mock Auth-Middleware (setze req.user)
    app.use((req, _res, next) => {
      (req as any).user = { id: adminUserId, username: 'admin', is_admin: true };
      next();
    });
    
    app.post('/admin/search/reindex', reindexAll);
    app.get('/admin/search/index-status', getIndexStatus);
  });
  
  afterEach(async () => {
    // Bereinige Datenbank
    db.prepare('DELETE FROM search_tokens').run();
    db.prepare('DELETE FROM search_index').run();
    db.prepare('DELETE FROM user_settings').run();
    db.prepare('DELETE FROM users').run();
    
    // Lösche Test-Verzeichnis
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignoriere Fehler beim Löschen
    }
  });
  
  describe('POST /admin/search/reindex', () => {
    it('should start re-indexing for all users', async () => {
      const response = await request(app)
        .post('/admin/search/reindex')
        .expect(200);
      
      expect(response.body.message).toContain('Re-indexing started');
      expect(response.body.userCount).toBeGreaterThan(0);
    });
    
    it('should start re-indexing for specific user', async () => {
      const response = await request(app)
        .post('/admin/search/reindex?userId=' + adminUserId)
        .expect(200);
      
      expect(response.body.message).toContain('Re-indexing started');
      expect(response.body.userId).toBe(adminUserId);
    });
    
    it('should filter by folder type', async () => {
      const response = await request(app)
        .post('/admin/search/reindex?type=private')
        .expect(200);
      
      expect(response.body.folderType).toBe('private');
    });
    
    it('should reject invalid folder type', async () => {
      const response = await request(app)
        .post('/admin/search/reindex?type=invalid')
        .expect(400);
      
      expect(response.body.error).toContain('Invalid folder type');
    });
    
    it('should reject invalid user ID', async () => {
      const response = await request(app)
        .post('/admin/search/reindex?userId=invalid')
        .expect(400);
      
      expect(response.body.error).toContain('Invalid user ID');
    });
    
    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/admin/search/reindex?userId=99999')
        .expect(404);
      
      expect(response.body.error).toContain('User not found');
    });
  });
  
  describe('GET /admin/search/index-status', () => {
    beforeEach(async () => {
      // Erstelle einige Test-Index-Einträge
      const file1 = path.join(testDir, 'test1.md');
      await fs.writeFile(file1, '# Test 1', 'utf-8');
      
      const { indexFile } = await import('../../services/index.service');
      await indexFile(adminUserId, '/test1.md', 'private');
    });
    
    it('should return index statistics', async () => {
      const response = await request(app)
        .get('/admin/search/index-status')
        .expect(200);
      
      expect(response.body).toHaveProperty('totalFiles');
      expect(response.body).toHaveProperty('totalTokens');
      expect(response.body).toHaveProperty('totalSize');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('topExtensions');
      
      expect(response.body.totalFiles).toBeGreaterThan(0);
    });
  });
});

