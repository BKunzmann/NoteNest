/**
 * Settings Service
 * 
 * Verwaltet Benutzer-Einstellungen
 */

import db from '../config/database';

export interface UserSettings {
  id: number;
  user_id: number;
  private_folder_path: string | null;
  shared_folder_path: string | null;
  default_note_type: 'private' | 'shared';
  default_note_folder_path: string;
  sidebar_view_mode: 'recent' | 'folders';
  theme: string;
  default_export_size: string;
  default_bible_translation: string;
  show_only_notes: boolean;
  non_editable_files_mode: 'gray' | 'hide';
  created_at: string;
  updated_at: string;
}

/**
 * Holt Benutzer-Einstellungen
 */
export function getUserSettings(userId: number): UserSettings | null {
  const settings = db.prepare(`
    SELECT * FROM user_settings WHERE user_id = ?
  `).get(userId) as UserSettings | undefined;
  
  return settings || null;
}

/**
 * Aktualisiert Benutzer-Einstellungen
 */
export function updateUserSettings(
  userId: number,
  updates: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): UserSettings {
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.private_folder_path !== undefined) {
    fields.push('private_folder_path = ?');
    values.push(updates.private_folder_path);
  }
  
  if (updates.shared_folder_path !== undefined) {
    fields.push('shared_folder_path = ?');
    values.push(updates.shared_folder_path);
  }

  if (updates.default_note_type !== undefined) {
    fields.push('default_note_type = ?');
    values.push(updates.default_note_type);
  }

  if (updates.default_note_folder_path !== undefined) {
    fields.push('default_note_folder_path = ?');
    values.push(updates.default_note_folder_path);
  }

  if (updates.sidebar_view_mode !== undefined) {
    fields.push('sidebar_view_mode = ?');
    values.push(updates.sidebar_view_mode);
  }
  
  if (updates.theme !== undefined) {
    fields.push('theme = ?');
    values.push(updates.theme);
  }
  
  if (updates.default_export_size !== undefined) {
    fields.push('default_export_size = ?');
    values.push(updates.default_export_size);
  }
  
  if (updates.default_bible_translation !== undefined) {
    fields.push('default_bible_translation = ?');
    values.push(updates.default_bible_translation);
  }
  
  if (updates.show_only_notes !== undefined) {
    fields.push('show_only_notes = ?');
    values.push(updates.show_only_notes ? 1 : 0);
  }

  if (updates.non_editable_files_mode !== undefined) {
    fields.push('non_editable_files_mode = ?');
    values.push(updates.non_editable_files_mode);
  }
  
  if (fields.length === 0) {
    const existing = getUserSettings(userId);
    if (!existing) {
      throw new Error('Settings not found');
    }
    return existing;
  }
  
  // updated_at wird automatisch von SQLite aktualisiert, wenn wir CURRENT_TIMESTAMP verwenden
  // Aber wir müssen es explizit setzen, da es nicht als DEFAULT CURRENT_TIMESTAMP ON UPDATE definiert ist
  const updateQuery = `
    UPDATE user_settings 
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `;
  
  // userId muss am Ende der values-Array sein für die WHERE-Klausel
  values.push(userId);
  db.prepare(updateQuery).run(...values);
  
  const updated = getUserSettings(userId);
  if (!updated) {
    throw new Error('Failed to update settings');
  }
  
  return updated;
}

/**
 * Erstellt Standard-Einstellungen für einen Benutzer
 */
export function createUserSettings(
  userId: number,
  defaults?: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): UserSettings {
  const settings: Partial<UserSettings> = {
    private_folder_path: defaults?.private_folder_path ?? null,
    shared_folder_path: defaults?.shared_folder_path ?? null,
    default_note_type: defaults?.default_note_type ?? 'private',
    default_note_folder_path: defaults?.default_note_folder_path ?? '/',
    sidebar_view_mode: defaults?.sidebar_view_mode ?? 'recent',
    theme: defaults?.theme ?? 'light',
    default_export_size: defaults?.default_export_size ?? 'A4',
    default_bible_translation: defaults?.default_bible_translation ?? 'LUT1912',
    show_only_notes: defaults?.show_only_notes ?? false,
    non_editable_files_mode: defaults?.non_editable_files_mode ?? 'gray',
    ...defaults
  };

  db.prepare(`
    INSERT INTO user_settings (
      user_id,
      private_folder_path,
      shared_folder_path,
      default_note_type,
      default_note_folder_path,
      sidebar_view_mode,
      theme,
      default_export_size,
      default_bible_translation,
      show_only_notes,
      non_editable_files_mode
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    settings.private_folder_path,
    settings.shared_folder_path,
    settings.default_note_type,
    settings.default_note_folder_path,
    settings.sidebar_view_mode,
    settings.theme,
    settings.default_export_size,
    settings.default_bible_translation,
    settings.show_only_notes ? 1 : 0,
    settings.non_editable_files_mode
  );

  const created = getUserSettings(userId);
  if (!created) {
    throw new Error('Failed to create settings');
  }

  return created;
}

