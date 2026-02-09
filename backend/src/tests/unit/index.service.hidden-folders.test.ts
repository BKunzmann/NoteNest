/**
 * Tests für Index Service mit Hidden Folders
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db, { initializeDatabase } from '../../config/database';
import { indexFile, searchIndex } from '../../services/index.service';
import { isPathInHiddenFolder } from '../../services/file.service';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Index Service with Hidden Folders', () => {
  let testUserId: number;
  let testDir: string;

  beforeEach(async () => {
    initializeDatabase();
    // Erstelle Test-User
    const userResult = db.prepare(`
      INSERT INTO users (username, password_hash, auth_type, is_active)
      VALUES (?, ?, 'local', 1)
    `).run('testuser_index', 'hash');
    testUserId = userResult.lastInsertRowid as number;

    // Erstelle User Settings
    testDir = path.join(os.tmpdir(), `notenest_index_test_${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    db.prepare(`
      INSERT INTO user_settings (user_id, private_folder_path)
      VALUES (?, ?)
    `).run(testUserId, testDir);

    // Setze Hidden Folders Config
    const defaultHiddenFolders = JSON.stringify([
      '._DAV',
      '@eaDir',
      '.git'
    ]);
    
    db.prepare(`
      INSERT OR REPLACE INTO app_config (key, value, description)
      VALUES ('hidden_folders', ?, 'Test config')
    `).run(defaultHiddenFolders);

    // Erstelle Test-Struktur
    await fs.mkdir(path.join(testDir, '._DAV'), { recursive: true });
    await fs.mkdir(path.join(testDir, '@eaDir'), { recursive: true });
    
    await fs.writeFile(path.join(testDir, 'normal_file.md'), '# Test\n\nThis is a test file.');
    await fs.writeFile(path.join(testDir, '._DAV', 'hidden_file.md'), '# Hidden\n\nThis should not be indexed.');
    await fs.writeFile(path.join(testDir, '@eaDir', 'test.md'), '# Hidden Test\n\nThis should also not be indexed.');
  });

  afterEach(async () => {
    // Cleanup
    if (testUserId) {
      db.prepare('DELETE FROM search_tokens WHERE file_id IN (SELECT id FROM search_index WHERE user_id = ?)').run(testUserId);
      db.prepare('DELETE FROM search_index WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    }
    
    db.prepare('DELETE FROM app_config WHERE key = ?').run('hidden_folders');
    
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('indexFile', () => {
    it('should not index files in hidden folders', async () => {
      // Versuche, Datei in hidden folder zu indexieren
      await indexFile(testUserId, '/._DAV/hidden_file.md', 'private');
      
      // Prüfe, ob Datei nicht im Index ist
      const indexEntry = db.prepare(`
        SELECT * FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/._DAV/hidden_file.md');
      
      expect(indexEntry).toBeUndefined();
    });

    it('should index normal files', async () => {
      await indexFile(testUserId, '/normal_file.md', 'private');
      
      const indexEntry = db.prepare(`
        SELECT * FROM search_index 
        WHERE user_id = ? AND file_path = ?
      `).get(testUserId, '/normal_file.md');
      
      expect(indexEntry).toBeDefined();
    });
  });

  describe('searchIndex', () => {
    beforeEach(async () => {
      // Indexiere normale Datei
      await indexFile(testUserId, '/normal_file.md', 'private');
      
      // Versuche, versteckte Dateien zu indexieren (sollten ignoriert werden)
      try {
        await indexFile(testUserId, '/._DAV/hidden_file.md', 'private');
        await indexFile(testUserId, '/@eaDir/test.md', 'private');
      } catch (error) {
        // Erwartet, dass diese fehlschlagen oder ignoriert werden
      }
    });

    it('should not return results from hidden folders', () => {
      const results = searchIndex(testUserId, 'test', 'private');
      
      // Prüfe, dass keine Ergebnisse aus hidden folders kommen
      const hiddenResults = results.filter(result => 
        isPathInHiddenFolder(result.path)
      );
      
      expect(hiddenResults.length).toBe(0);
    });

    it('should return results from normal files', () => {
      const results = searchIndex(testUserId, 'test', 'private');
      
      // Sollte Ergebnisse von normal_file.md finden
      const normalResults = results.filter(result => 
        result.path === '/normal_file.md'
      );
      
      expect(normalResults.length).toBeGreaterThan(0);
    });

    it('should filter out hidden folder paths even if they exist in index', () => {
      // Simuliere: Datei wurde vorher indexiert (z.B. vor Implementierung der Filterung)
      db.prepare(`
        INSERT INTO search_index (user_id, file_path, file_type, file_name, file_extension, content_hash, file_size, word_count)
        VALUES (?, ?, 'private', 'hidden_file.md', '.md', 'hash123', 100, 10)
      `).run(testUserId, '/._DAV/hidden_file.md');
      
      const fileId = db.prepare('SELECT id FROM search_index WHERE file_path = ?').get('/._DAV/hidden_file.md') as { id: number } | undefined;
      
      if (fileId) {
        db.prepare(`
          INSERT INTO search_tokens (token, file_id, line_number, position, context)
          VALUES (?, ?, 1, 0, 'test context')
        `).run('test', fileId.id);
      }
      
      // Suche sollte diese Datei nicht zurückgeben
      const results = searchIndex(testUserId, 'test', 'private');
      
      const hiddenResults = results.filter(result => 
        result.path === '/._DAV/hidden_file.md'
      );
      
      expect(hiddenResults.length).toBe(0);
    });
  });
});
 