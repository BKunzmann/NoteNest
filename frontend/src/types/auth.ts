/**
 * Authentifizierungs-Types (Frontend)
 */

export interface User {
  id: number;
  username: string;
  email: string | null;
  auth_type: string;
  is_admin?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
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

export interface AuthMode {
  mode: 'local' | 'ldap' | 'synology' | 'hybrid';
  ldapEnabled: boolean;
  registrationEnabled: boolean;
}

