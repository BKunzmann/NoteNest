/**
 * Authentifizierungs-Types
 */

export interface User {
  id: number;
  username: string;
  password_hash: string | null;
  email: string | null;
  auth_type: 'local' | 'ldap' | 'synology';
  auth_source: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_admin: boolean;
}

export interface UserSettings {
  id: number;
  user_id: number;
  private_folder_path: string | null;
  shared_folder_path: string | null;
  theme: string;
  default_export_size: string;
  default_bible_translation: string;
  show_only_notes: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    email: string | null;
    auth_type: string;
    is_admin?: boolean;
  };
}

export interface JWTPayload {
  userId: number;
  username: string;
  jti: string; // JWT ID
}

