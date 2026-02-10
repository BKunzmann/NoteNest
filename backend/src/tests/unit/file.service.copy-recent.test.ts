import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import db, { initializeDatabase } from '../../config/database';
import { copyFile, getFileStats, listDirectory, listRecentFiles, moveFile } from '../../services/file.service';

describe('file.service copy/recent', () => {
  let userId: number;
  let privateDir: string;
  let sharedDir: string;

  beforeEach(async () => {
    initializeDatabase();

    const user = db.prepare(`
      INSERT INTO users (username, password_hash, auth_type, is_active)
      VALUES (?, ?, 'local', 1)
    `).run(`copy_recent_${Date.now()}`, 'hash');
    userId = user.lastInsertRowid as number;

    privateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notenest-private-'));
    sharedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notenest-shared-'));

    db.prepare(`
      INSERT INTO user_settings (user_id, private_folder_path, shared_folder_path)
      VALUES (?, ?, ?)
    `).run(userId, privateDir, sharedDir);
  });

  afterEach(async () => {
    db.prepare('DELETE FROM search_tokens').run();
    db.prepare('DELETE FROM search_index').run();
    db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    try {
      await fs.rm(privateDir, { recursive: true, force: true });
      await fs.rm(sharedDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures in tests
    }
  });

  it('listRecentFiles should return latest editable notes grouped by mtime', async () => {
    const hiddenFolder = path.join(privateDir, '._DAV');
    await fs.mkdir(hiddenFolder, { recursive: true });
    await fs.mkdir(path.join(privateDir, 'sermons'), { recursive: true });

    const oldFile = path.join(privateDir, 'old-note.md');
    const newFile = path.join(privateDir, 'sermons', 'new-note.txt');
    const pdfFile = path.join(privateDir, 'manual.pdf');
    const hiddenFile = path.join(hiddenFolder, 'secret.md');

    await fs.writeFile(oldFile, '# Old');
    await fs.writeFile(newFile, 'Newest');
    await fs.writeFile(pdfFile, 'binary');
    await fs.writeFile(hiddenFile, 'hidden');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await fs.utimes(oldFile, twoDaysAgo, twoDaysAgo);
    await fs.utimes(newFile, now, now);
    await fs.utimes(pdfFile, yesterday, yesterday);

    // Befülle file_metadata über reguläre List-Operationen
    await listDirectory(userId, '/', 'private');
    await listDirectory(userId, '/sermons', 'private');

    const notesOnly = await listRecentFiles(userId, 'private', { notesOnly: true, limit: 10 });
    const allFiles = await listRecentFiles(userId, 'private', { notesOnly: false, limit: 10 });

    expect(notesOnly.map((item) => item.path)).toEqual(['/sermons/new-note.txt', '/old-note.md']);
    expect(allFiles.some((item) => item.path === '/manual.pdf')).toBe(true);
    expect(allFiles.some((item) => item.path.includes('._DAV'))).toBe(false);
  });

  it('copyFile should copy files and folders across storage types', async () => {
    await fs.mkdir(path.join(privateDir, 'source-folder'), { recursive: true });
    await fs.writeFile(path.join(privateDir, 'source-file.md'), '# source');
    await fs.writeFile(path.join(privateDir, 'source-folder', 'inside.txt'), 'inside');

    await copyFile(userId, '/source-file.md', '/target-file.md', 'private', 'private');
    await copyFile(userId, '/source-folder', '/copied-folder', 'private', 'shared');

    const copiedFileContent = await fs.readFile(path.join(privateDir, 'target-file.md'), 'utf-8');
    const copiedNestedContent = await fs.readFile(path.join(sharedDir, 'copied-folder', 'inside.txt'), 'utf-8');

    expect(copiedFileContent).toContain('source');
    expect(copiedNestedContent).toBe('inside');
  });

  it('copyFile and moveFile should resolve name conflicts automatically', async () => {
    await fs.writeFile(path.join(privateDir, 'source.md'), '# source');
    await fs.writeFile(path.join(privateDir, 'target.md'), '# target');
    await fs.writeFile(path.join(privateDir, 'move-source.pdf'), 'move source');
    await fs.writeFile(path.join(privateDir, 'move-target.pdf'), 'move target');

    const copiedTo = await copyFile(userId, '/source.md', '/target.md', 'private', 'private');
    const movedTo = await moveFile(userId, '/move-source.pdf', '/move-target.pdf', 'private', 'private');

    expect(copiedTo).toBe('/target (1).md');
    expect(movedTo).toBe('/move-target (1).pdf');

    const copiedContent = await fs.readFile(path.join(privateDir, 'target (1).md'), 'utf-8');
    const movedContent = await fs.readFile(path.join(privateDir, 'move-target (1).pdf'), 'utf-8');
    expect(copiedContent).toContain('source');
    expect(movedContent).toContain('move source');
  });

  it('listDirectory notesOnly should hide folders without notes', async () => {
    await fs.mkdir(path.join(privateDir, 'has-notes', 'nested'), { recursive: true });
    await fs.mkdir(path.join(privateDir, 'only-docs'), { recursive: true });

    await fs.writeFile(path.join(privateDir, 'has-notes', 'nested', 'note.md'), '# note');
    await fs.writeFile(path.join(privateDir, 'only-docs', 'manual.pdf'), 'pdf');
    await fs.writeFile(path.join(privateDir, 'root-note.txt'), 'note');
    await fs.writeFile(path.join(privateDir, 'root-image.png'), 'img');

    const items = await listDirectory(userId, '/', 'private', { notesOnly: true });

    expect(items.map((item) => item.name)).toContain('has-notes');
    expect(items.map((item) => item.name)).toContain('root-note.txt');
    expect(items.map((item) => item.name)).not.toContain('only-docs');
    expect(items.map((item) => item.name)).not.toContain('root-image.png');
  });

  it('getFileStats should return total files and notes', async () => {
    await fs.mkdir(path.join(privateDir, 'sub'), { recursive: true });
    await fs.writeFile(path.join(privateDir, 'sub', 'a.md'), '# note');
    await fs.writeFile(path.join(privateDir, 'b.txt'), 'note');
    await fs.writeFile(path.join(privateDir, 'c.pdf'), 'pdf');

    // Metadata wird beim Listen aufgebaut.
    await listDirectory(userId, '/', 'private');
    await listDirectory(userId, '/sub', 'private');

    const stats = getFileStats(userId, 'private');
    expect(stats.totalFiles).toBe(3);
    expect(stats.totalNotes).toBe(2);
  });
});
