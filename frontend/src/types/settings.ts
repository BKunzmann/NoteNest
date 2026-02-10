/**
 * Settings Types (Frontend)
 */

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

export interface UpdateSettingsRequest {
  private_folder_path?: string | null;
  shared_folder_path?: string | null;
  default_note_type?: 'private' | 'shared';
  default_note_folder_path?: string;
  sidebar_view_mode?: 'recent' | 'folders';
  theme?: string;
  default_export_size?: string;
  default_bible_translation?: string;
  show_only_notes?: boolean;
  non_editable_files_mode?: 'gray' | 'hide';
}

export interface SettingsPathOption {
  path: string;
  label: string;
}

export interface SettingsPathOptionsResponse {
  privatePaths: SettingsPathOption[];
  sharedPaths: SettingsPathOption[];
}

