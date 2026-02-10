import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import db, { initializeDatabase } from '../../config/database';
import { createUserSettings, getUserSettings, updateUserSettings } from '../../services/settings.service';

describe('settings.service new default note settings', () => {
  let userId: number;

  beforeEach(() => {
    initializeDatabase();
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, auth_type, is_active)
      VALUES (?, ?, 'local', 1)
    `).run(`settings_${Date.now()}`, 'hash');
    userId = result.lastInsertRowid as number;
  });

  afterEach(() => {
    db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  it('createUserSettings should set defaults for note target and sidebar mode', () => {
    const created = createUserSettings(userId);
    expect(created.default_note_type).toBe('private');
    expect(created.default_note_folder_path).toBe('/');
    expect(created.sidebar_view_mode).toBe('recent');
    expect(created.non_editable_files_mode).toBe('gray');
  });

  it('updateUserSettings should persist note target and sidebar mode', () => {
    createUserSettings(userId);

    const updated = updateUserSettings(userId, {
      default_note_type: 'shared',
      default_note_folder_path: '/team/notes',
      sidebar_view_mode: 'folders',
      non_editable_files_mode: 'hide'
    });

    expect(updated.default_note_type).toBe('shared');
    expect(updated.default_note_folder_path).toBe('/team/notes');
    expect(updated.sidebar_view_mode).toBe('folders');
    expect(updated.non_editable_files_mode).toBe('hide');

    const loaded = getUserSettings(userId);
    expect(loaded?.default_note_type).toBe('shared');
    expect(loaded?.default_note_folder_path).toBe('/team/notes');
    expect(loaded?.sidebar_view_mode).toBe('folders');
    expect(loaded?.non_editable_files_mode).toBe('hide');
  });
});
