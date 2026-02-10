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
  let privateDir: string;
  let sharedDir: string;
  
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
    privateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notenest-private-'));
    sharedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notenest-shared-'));
    
    // Erstelle User-Settings
    db.prepare(`
      INSERT INTO user_settings (user_id, private_folder_path, shared_folder_path)
      VALUES (?, ?, ?)
    `).run(testUserId, privateDir, sharedDir);
  });
  
  afterEach(async () => {
    // Bereinige Datenbank
    db.prepare('DELETE FROM search_tokens').run();
    db.prepare('DELETE FROM search_index').run();
    db.prepare('DELETE FROM user_settings').run();
    db.prepare('DELETE FROM users').run();
    
    // Lösche Test-Verzeichnis
    try {
      await fs.rm(privateDir, { recursive: true, force: true });
      await fs.rm(sharedDir, { recursive: true, force: true });
    } catch {
      // Ignoriere Fehler beim Löschen
    }
  });
  
  describe('searchNotes', () => {
    beforeEach(async () => {
      // Erstelle und indexiere Test-Dateien
      const file1 = path.join(privateDir, 'projekt.md');
      await fs.writeFile(file1, '# Projekt Planung\n\nDies ist ein wichtiges Projekt.', 'utf-8');
      await indexFile(testUserId, '/projekt.md', 'private');
      
      const file2 = path.join(privateDir, 'notizen.md');
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

    it('should find matches by filename even without content match', async () => {
      const filePath = path.join(privateDir, 'agenda_2026.md');
      await fs.writeFile(filePath, '# Ohne Suchbegriff im Inhalt', 'utf-8');
      await indexFile(testUserId, '/agenda_2026.md', 'private');

      const results = await searchNotes(testUserId, 'agenda_2026');
      expect(results.some((result) => result.path === '/agenda_2026.md')).toBe(true);
    });

    it('should search across private and shared by default', async () => {
      const filePath = path.join(sharedDir, 'team-plan.md');
      await fs.writeFile(filePath, '# Team Plan', 'utf-8');
      await indexFile(testUserId, '/team-plan.md', 'shared');

      const allResults = await searchNotes(testUserId, 'team-plan');
      const privateOnlyResults = await searchNotes(testUserId, 'team-plan', 'private');
      const sharedOnlyResults = await searchNotes(testUserId, 'team-plan', 'shared');

      expect(allResults.some((result) => result.type === 'shared' && result.path === '/team-plan.md')).toBe(true);
      expect(privateOnlyResults.some((result) => result.type === 'shared')).toBe(false);
      expect(sharedOnlyResults.some((result) => result.type === 'shared' && result.path === '/team-plan.md')).toBe(true);
    });
  });
});

