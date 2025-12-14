/**
 * Settings Types (Frontend)
 */

export interface UserSettings {
  id: number;
  user_id: number;
  private_folder_path: string | null;
  shared_folder_path: string | null;
  theme: string;
  default_export_size: string;
  default_bible_translation: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsRequest {
  private_folder_path?: string | null;
  shared_folder_path?: string | null;
  theme?: string;
  default_export_size?: string;
  default_bible_translation?: string;
}

