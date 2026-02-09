/**
 * Integration Tests für Search-Funktionalität
 * 
 * Tests für die vollständige Suchfunktion mit Index
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db from '../../config/database';
import { initializeDatabase } from '../../config/database';
import { searchNotes } from '../../services/search.service';
import { indexFile } from '../../services/index.service';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Search Integration', () => {
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
  
  describe('searchNotes', () => {
    beforeEach(async () => {
      // Erstelle und indexiere Test-Dateien
      const file1 = path.join(testDir, 'projekt.md');
      await fs.writeFile(file1, '# Projekt Planung\n\nDies ist ein wichtiges Projekt.', 'utf-8');
      await indexFile(testUserId, '/projekt.md', 'private');
      
      const file2 = path.join(testDir, 'notizen.md');
      await fs.writeFile(file2, '# Notizen\n\nHier sind einige Notizen.', 'utf-8');
      await indexFile(testUserId, '/notizen.md', 'private');
    });
    
    it('should find files with exact match', async () => {
      const results = await searchNotes(testUserId, 'Projekt');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toBe('/projekt.md');
      expect(results[0].matches.length).toBeGreaterThan(0);
    });
    
    it('should find files with fuzzy match', async () => {
      // Suche mit Tippfehler
      const results = await searchNotes(testUserId, 'Projek');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toBe('/projekt.md');
    });
    
    it('should return empty array for no matches', async () => {
      const results = await searchNotes(testUserId, 'NichtVorhanden');
      
      expect(results.length).toBe(0);
    });
    
    it('should filter by folder type', async () => {
      const privateResults = await searchNotes(testUserId, 'Projekt', 'private');
      const sharedResults = await searchNotes(testUserId, 'Projekt', 'shared');
      
      expect(privateResults.length).toBeGreaterThan(0);
      expect(sharedResults.length).toBe(0);
    });
    
    it('should sort results by relevance', async () => {
      const results = await searchNotes(testUserId, 'Projekt');
      
      // Ergebnisse sollten nach Relevanz sortiert sein
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevance).toBeGreaterThanOrEqual(results[i].relevance);
      }
    });
    
    it('should require minimum 2 characters', async () => {
      const results = await searchNotes(testUserId, 'P');
      
      expect(results.length).toBe(0);
    });
  });
});

