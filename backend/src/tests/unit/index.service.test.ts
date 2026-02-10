/**
 * Unit Tests für index.service.ts
 * 
 * Tests für Index-Service (Tokenisierung, Fuzzy Search, Indexierung)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as indexService from '../../services/index.service';
import { isIndexable } from '../../services/file.service';
import db from '../../config/database';
import { initializeDatabase } from '../../config/database';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Index Service', () => {
  let testUserId: number;
  let testDir: string;
  
  beforeEach(async () => {
    // Initialisiere Datenbank
    initializeDatabase();
    
    // Erstelle Test-Benutzer
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, auth_type, is_active)
      VALUES (?, ?, 'local', 1)
    `).run('testuser', 'hash');
    testUserId = result.lastInsertRowid as number;
    
    // Erstelle Test-Verzeichnis
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notenest-test-'));
    
    // Erstelle User-Settings
    db.prepare(`
      INSERT INTO user_settings (user_id, private_folder_path, shared_folder_path)
      VALUES (?, ?, ?)
    `).run(testUserId, testDir, testDir);
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
  
  describe('isIndexable', () => {
    it('should identify markdown files as indexable', () => {
      expect(isIndexable('test.md')).toBe(true);
      expect(isIndexable('test.markdown')).toBe(true);
      expect(isIndexable('test.mdown')).toBe(true);
      expect(isIndexable('test.mkd')).toBe(true);
      expect(isIndexable('test.mkdn')).toBe(true);
      expect(isIndexable('test.mkdown')).toBe(true);
      expect(isIndexable('test.mdwn')).toBe(true);
      expect(isIndexable('test.mdtxt')).toBe(true);
      expect(isIndexable('test.mdtext')).toBe(true);
    });
    
    it('should identify txt files as indexable', () => {
      expect(isIndexable('test.txt')).toBe(true);
    });
    
    it('should not identify other files as indexable', () => {
      expect(isIndexable('test.pdf')).toBe(false);
      expect(isIndexable('test.docx')).toBe(false);
      expect(isIndexable('test.jpg')).toBe(false);
      expect(isIndexable('test')).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(isIndexable('test.MD')).toBe(true);
      expect(isIndexable('test.TXT')).toBe(true);
    });
  });
  
  describe('indexFile', () => {
    it('should index a markdown file', async () => {
      const testFile = path.join(testDir, 'test.md');
      const content = '# Test\n\nThis is a test document with some content.';
      await fs.writeFile(testFile, content, 'utf-8');
      
      await indexService.indexFile(testUserId, '/test.md', 'private');
      
      // Prüfe, ob Datei im Index ist
      const indexEntry = db.prepare(`
        SELECT * FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/test.md') as any;
      
      expect(indexEntry).toBeDefined();
      expect(indexEntry.file_name).toBe('test.md');
      expect(indexEntry.file_extension).toBe('.md');
      
      // Prüfe, ob Tokens erstellt wurden
      const tokens = db.prepare(`
        SELECT COUNT(*) as count FROM search_tokens 
        WHERE file_id = ?
      `).get(indexEntry.id) as { count: number };
      
      expect(tokens.count).toBeGreaterThan(0);
    });
    
    it('should not index non-indexable files', async () => {
      const testFile = path.join(testDir, 'test.pdf');
      await fs.writeFile(testFile, 'content', 'utf-8');
      
      await indexService.indexFile(testUserId, '/test.pdf', 'private');
      
      // Prüfe, dass keine Index-Einträge erstellt wurden
      const indexEntry = db.prepare(`
        SELECT * FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/test.pdf') as any;
      
      expect(indexEntry).toBeUndefined();
    });
    
    it('should update index when file changes', async () => {
      const testFile = path.join(testDir, 'test.md');
      const content1 = '# Test\n\nOriginal content.';
      await fs.writeFile(testFile, content1, 'utf-8');
      
      await indexService.indexFile(testUserId, '/test.md', 'private');
      
      const entry1 = db.prepare(`
        SELECT content_hash FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/test.md') as { content_hash: string };
      const hash1 = entry1.content_hash;
      
      // Ändere Datei
      const content2 = '# Test\n\nUpdated content.';
      await fs.writeFile(testFile, content2, 'utf-8');
      
      await indexService.indexFile(testUserId, '/test.md', 'private');
      
      const entry2 = db.prepare(`
        SELECT content_hash FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/test.md') as { content_hash: string };
      const hash2 = entry2.content_hash;
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should not re-index unchanged files', async () => {
      const testFile = path.join(testDir, 'test.md');
      const content = '# Test\n\nContent.';
      await fs.writeFile(testFile, content, 'utf-8');
      
      await indexService.indexFile(testUserId, '/test.md', 'private');
      
      const entry1 = db.prepare(`
        SELECT indexed_at FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/test.md') as { indexed_at: string };
      const indexedAt1 = entry1.indexed_at;
      
      // Warte kurz, damit Zeitstempel sich ändert
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Versuche erneut zu indexieren
      await indexService.indexFile(testUserId, '/test.md', 'private');
      
      const entry2 = db.prepare(`
        SELECT indexed_at FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/test.md') as { indexed_at: string };
      const indexedAt2 = entry2.indexed_at;
      
      // Index sollte nicht aktualisiert worden sein (gleicher Hash)
      expect(indexedAt1).toBe(indexedAt2);
    });
  });
  
  describe('removeFromIndex', () => {
    it('should remove file from index', async () => {
      const testFile = path.join(testDir, 'test.md');
      await fs.writeFile(testFile, '# Test', 'utf-8');
      
      await indexService.indexFile(testUserId, '/test.md', 'private');
      
      // Prüfe, dass Datei im Index ist
      const entry = db.prepare(`
        SELECT id FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/test.md') as { id: number } | undefined;
      expect(entry).toBeDefined();
      
      // Entferne aus Index
      await indexService.removeFromIndex(testUserId, '/test.md', 'private');
      
      // Prüfe, dass Datei nicht mehr im Index ist
      const entryAfter = db.prepare(`
        SELECT id FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/test.md') as { id: number } | undefined;
      expect(entryAfter).toBeUndefined();
      
      // Prüfe, dass Tokens auch gelöscht wurden
      const tokens = db.prepare(`
        SELECT COUNT(*) as count FROM search_tokens 
        WHERE file_id = ?
      `).get(entry!.id) as { count: number };
      expect(tokens.count).toBe(0);
    });
  });
  
  describe('searchIndex', () => {
    beforeEach(async () => {
      // Erstelle Test-Dateien
      const file1 = path.join(testDir, 'test1.md');
      await fs.writeFile(file1, '# Projekt Planung\n\nDies ist ein Test-Dokument über Projektplanung.', 'utf-8');
      
      const file2 = path.join(testDir, 'test2.md');
      await fs.writeFile(file2, '# Notizen\n\nHier sind einige wichtige Notizen.', 'utf-8');
      
      // Indexiere Dateien
      await indexService.indexFile(testUserId, '/test1.md', 'private');
      await indexService.indexFile(testUserId, '/test2.md', 'private');
    });
    
    it('should find exact matches', () => {
      const results = indexService.searchIndex(testUserId, 'Projekt', 'private');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toBe('/test1.md');
      expect(results[0].matches.length).toBeGreaterThan(0);
    });
    
    it('should find fuzzy matches', () => {
      // Suche nach "Projekt" mit Tippfehler "Projek"
      const results = indexService.searchIndex(testUserId, 'Projek', 'private', 2);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toBe('/test1.md');
    });
    
    it('should return empty array for no matches', () => {
      const results = indexService.searchIndex(testUserId, 'NichtVorhanden', 'private');
      
      expect(results.length).toBe(0);
    });
    
    it('should filter by folder type', () => {
      const privateResults = indexService.searchIndex(testUserId, 'Projekt', 'private');
      const sharedResults = indexService.searchIndex(testUserId, 'Projekt', 'shared');
      
      // Private Dateien sollten gefunden werden
      expect(privateResults.length).toBeGreaterThan(0);
      // Shared sollte leer sein (keine Dateien indexiert)
      expect(sharedResults.length).toBe(0);
    });
    
    it('should sort by relevance', () => {
      const results = indexService.searchIndex(testUserId, 'Projekt', 'private');
      
      // Ergebnisse sollten nach Relevanz sortiert sein
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevance).toBeGreaterThanOrEqual(results[i].relevance);
      }
    });
  });
});

