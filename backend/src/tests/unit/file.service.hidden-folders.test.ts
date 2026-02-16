/**
 * Tests für Hidden Folders Funktionalität
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db, { initializeDatabase } from '../../config/database';
import { 
  getHiddenFoldersConfig, 
  isPathInHiddenFolder,
  listDirectory 
} from '../../services/file.service';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Hidden Folders Configuration', () => {
  beforeEach(() => {
    initializeDatabase();
    // Setze Standard-Konfiguration für Tests
    const defaultHiddenFolders = JSON.stringify([
      '._DAV',
      '.Trashes',
      '@eaDir',
      '#recycle',
      '.git',
      'node_modules'
    ]);
    
    db.prepare(`
      INSERT OR REPLACE INTO app_config (key, value, description)
      VALUES ('hidden_folders', ?, 'Test config')
    `).run(defaultHiddenFolders);
  });

  afterEach(() => {
    // Cleanup
    db.prepare('DELETE FROM app_config WHERE key = ?').run('hidden_folders');
  });

  describe('getHiddenFoldersConfig', () => {
    it('should return default folders when config is missing', () => {
      // Entferne Config
      db.prepare('DELETE FROM app_config WHERE key = ?').run('hidden_folders');
      
      const config = getHiddenFoldersConfig();
      expect(config).toBeInstanceOf(Array);
      expect(config.length).toBeGreaterThan(0);
      expect(config).toContain('._DAV');
      expect(config).toContain('@eaDir');
    });

    it('should return configured folders from database', () => {
      const customFolders = JSON.stringify(['custom_folder', 'test_folder']);
      db.prepare(`
        INSERT OR REPLACE INTO app_config (key, value, description)
        VALUES ('hidden_folders', ?, 'Test config')
      `).run(customFolders);
      
      const config = getHiddenFoldersConfig();
      expect(config).toContain('.notenest-trash');
      expect(config).toContain('custom_folder');
      expect(config).toContain('test_folder');
    });
  });

  describe('isPathInHiddenFolder', () => {
    it('should detect files in hidden folders at root level', () => {
      expect(isPathInHiddenFolder('/._DAV/file.txt')).toBe(true);
      expect(isPathInHiddenFolder('/@eaDir/test.md')).toBe(true);
      expect(isPathInHiddenFolder('/#recycle/document.pdf')).toBe(true);
      expect(isPathInHiddenFolder('/.git/config')).toBe(true);
    });

    it('should detect files in nested hidden folders', () => {
      expect(isPathInHiddenFolder('/documents/._DAV/file.txt')).toBe(true);
      expect(isPathInHiddenFolder('/notes/@eaDir/test.md')).toBe(true);
      expect(isPathInHiddenFolder('/projects/.git/hooks/pre-commit')).toBe(true);
    });

    it('should not detect files in normal folders', () => {
      expect(isPathInHiddenFolder('/documents/file.txt')).toBe(false);
      expect(isPathInHiddenFolder('/notes/test.md')).toBe(false);
      expect(isPathInHiddenFolder('/projects/src/index.ts')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isPathInHiddenFolder('/._dav/file.txt')).toBe(true);
      expect(isPathInHiddenFolder('/@EADIR/test.md')).toBe(true);
      expect(isPathInHiddenFolder('/.GIT/config')).toBe(true);
    });

    it('should handle Windows paths', () => {
      expect(isPathInHiddenFolder('\\._DAV\\file.txt')).toBe(true);
      expect(isPathInHiddenFolder('\\@eaDir\\test.md')).toBe(true);
    });

    it('should handle paths with multiple segments', () => {
      expect(isPathInHiddenFolder('/folder1/folder2/._DAV/file.txt')).toBe(true);
      expect(isPathInHiddenFolder('/folder1/.git/folder2/file.txt')).toBe(true);
    });
  });
});

describe('listDirectory with Hidden Folders', () => {
  let testUserId: number;
  let testDir: string;

  beforeEach(async () => {
    initializeDatabase();
    // Erstelle Test-User
    const userResult = db.prepare(`
      INSERT INTO users (username, password_hash, auth_type, is_active)
      VALUES (?, ?, 'local', 1)
    `).run('testuser_hidden', 'hash');
    testUserId = userResult.lastInsertRowid as number;

    // Erstelle User Settings
    testDir = path.join(os.tmpdir(), `notenest_test_${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    db.prepare(`
      INSERT INTO user_settings (user_id, private_folder_path)
      VALUES (?, ?)
    `).run(testUserId, testDir);

    // Erstelle Test-Struktur
    await fs.mkdir(path.join(testDir, 'normal_folder'), { recursive: true });
    await fs.mkdir(path.join(testDir, '._DAV'), { recursive: true });
    await fs.mkdir(path.join(testDir, '@eaDir'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.git'), { recursive: true });
    
    await fs.writeFile(path.join(testDir, 'normal_file.md'), 'content');
    await fs.writeFile(path.join(testDir, '._DAV', 'hidden_file.md'), 'hidden');
    await fs.writeFile(path.join(testDir, '@eaDir', 'test.txt'), 'test');
    await fs.writeFile(path.join(testDir, 'normal_folder', 'file.md'), 'content');
  });

  afterEach(async () => {
    // Cleanup
    if (testUserId) {
      db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    }
    
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should not list hidden folders', async () => {
    const items = await listDirectory(testUserId, '/', 'private');
    
    const folderNames = items.filter(item => item.type === 'folder').map(item => item.name);
    
    expect(folderNames).not.toContain('._DAV');
    expect(folderNames).not.toContain('@eaDir');
    expect(folderNames).not.toContain('.git');
    expect(folderNames).toContain('normal_folder');
  });

  it('should list normal files and folders', async () => {
    const items = await listDirectory(testUserId, '/', 'private');
    
    const names = items.map(item => item.name);
    
    expect(names).toContain('normal_file.md');
    expect(names).toContain('normal_folder');
  });

  it('should not list files from hidden folders when navigating', async () => {
    // Navigiere in normal_folder
    const items = await listDirectory(testUserId, '/normal_folder', 'private');
    
    const names = items.map(item => item.name);
    expect(names).toContain('file.md');
    expect(names.length).toBe(1); // Nur die normale Datei
  });
});
 