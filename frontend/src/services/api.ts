/**
 * API-Service
 * 
 * Zentrale API-Kommunikation mit dem Backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest, AuthMode, User } from '../types/auth';
import {
  FileListResponse,
  FileContentResponse,
  CreateFileRequest,
  UpdateFileRequest,
  DeleteFileRequest,
  CreateFolderRequest,
  MoveFileRequest,
  RenameFileRequest
} from '../types/file';
import { UserSettings, UpdateSettingsRequest } from '../types/settings';

// Ermittle die API-URL automatisch basierend auf dem aktuellen Hostname
// Wenn VITE_API_URL gesetzt ist, verwende diese
// Sonst:
// - im lokalen Dev (localhost) direkt http://localhost:3000/api
// - in allen anderen Fällen relative zum aktuellen Origin: /api
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  const { origin, hostname } = window.location;

  // Lokale Entwicklung: Vite auf 5173, Backend auf 3000 (Proxy auf /api)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  
  // Production / NAS: Backend läuft im gleichen Container/Host + Port → relative API-URL
  return `${origin}/api`;
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Hilfsfunktion: Hole den richtigen Storage (sessionStorage oder localStorage)
 * Basierend auf der User-Präferenz ("Angemeldet bleiben")
 */
const getTokenStorage = (): Storage => {
  const useSessionStorage = localStorage.getItem('useSessionStorage') === 'true';
  return useSessionStorage ? sessionStorage : localStorage;
};

// Erstelle Axios-Instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Füge Access Token hinzu
api.interceptors.request.use(
  (config) => {
    const storage = getTokenStorage();
    const token = storage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Token-Refresh bei 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Prüfe auf 401 (Unauthorized) oder 403 (Forbidden) - beide können Token-Probleme sein
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const storage = getTokenStorage();
        const refreshToken = storage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

        const { accessToken } = response.data;
        storage.setItem('accessToken', accessToken);

        // Setze neuen Token im Request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        // Wiederhole den ursprünglichen Request mit neuem Token
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh fehlgeschlagen -> Logout
        const storage = getTokenStorage();
        storage.removeItem('accessToken');
        storage.removeItem('refreshToken');
        localStorage.removeItem('useSessionStorage');
        // Nur zu Login weiterleiten, wenn wir nicht bereits auf der Login-Seite sind
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Auth API
 */
export const authAPI = {
  /**
   * Gibt den aktuellen Auth-Modus zurück
   */
  async getMode(): Promise<AuthMode> {
    const response = await api.get<AuthMode>('/auth/mode');
    return response.data;
  },

  /**
   * Registriert einen neuen Benutzer
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Loggt einen Benutzer ein
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Erneuert den Access Token
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await api.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken
    });
    return response.data;
  },

  /**
   * Meldet einen Benutzer ab
   */
  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  /**
   * Gibt aktuelle Benutzer-Informationen zurück
   */
  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  }
};

/**
 * File API
 */
export const fileAPI = {
  /**
   * Listet Verzeichnis-Inhalt auf
   */
  async listFiles(path: string = '/', type: 'private' | 'shared' = 'private'): Promise<FileListResponse> {
    const response = await api.get<FileListResponse>('/files/list', {
      params: { path, type }
    });
    return response.data;
  },

  /**
   * Liest Datei-Inhalt
   */
  async getFileContent(path: string, type: 'private' | 'shared' = 'private'): Promise<FileContentResponse> {
    // Axios encoded Query-Parameter automatisch, aber Slashes können Probleme verursachen
    // Verwende einen Custom paramsSerializer, um sicherzustellen, dass der Pfad korrekt encoded wird
    console.log('API getFileContent called with:', { path, type });
    const response = await api.get<FileContentResponse>('/files/content', {
      params: { path, type },
      paramsSerializer: (params: any) => {
        // Manuelles Encoding, um sicherzustellen, dass der Pfad korrekt übergeben wird
        const searchParams = new URLSearchParams();
        searchParams.append('path', params.path);
        searchParams.append('type', params.type);
        return searchParams.toString();
      }
    });
    return response.data;
  },

  /**
   * Erstellt eine neue Datei
   */
  async createFile(data: CreateFileRequest): Promise<{ success: boolean; path: string; message: string }> {
    const response = await api.post('/files/create', data);
    return response.data;
  },

  /**
   * Aktualisiert eine Datei
   */
  async updateFile(data: UpdateFileRequest): Promise<{ success: boolean; path: string; message: string }> {
    const response = await api.put('/files/update', data);
    return response.data;
  },

  /**
   * Löscht eine Datei oder einen Ordner
   */
  async deleteFile(data: DeleteFileRequest): Promise<{ success: boolean; path: string; message: string }> {
    const response = await api.delete('/files/delete', { data });
    return response.data;
  },

  /**
   * Erstellt einen neuen Ordner
   */
  async createFolder(data: CreateFolderRequest): Promise<{ success: boolean; path: string; message: string }> {
    const response = await api.post('/files/create-folder', data);
    return response.data;
  },

  /**
   * Verschiebt oder benennt eine Datei/Ordner um
   */
  async moveFile(data: MoveFileRequest): Promise<{ success: boolean; from: string; to: string; message: string }> {
    const response = await api.post('/files/move', data);
    return response.data;
  },

  /**
   * Benennt eine Datei/Ordner um
   */
  async renameFile(data: RenameFileRequest): Promise<{ success: boolean; path: string; newPath: string; message: string }> {
    const response = await api.post('/files/rename', data);
    return response.data;
  }
};

/**
 * Settings API
 */
export const settingsAPI = {
  /**
   * Gibt aktuelle Benutzer-Einstellungen zurück
   */
  async getSettings(): Promise<UserSettings> {
    const response = await api.get<UserSettings>('/settings');
    return response.data;
  },

  /**
   * Aktualisiert Benutzer-Einstellungen
   */
  async updateSettings(data: UpdateSettingsRequest): Promise<UserSettings> {
    const response = await api.put<UserSettings>('/settings', data);
    return response.data;
  }
};

/**
 * Bible API Types
 */
export interface BibleVerseResponse {
  text: string;
  reference: string;
  translation: string;
}

export interface BibleChapterResponse {
  book: string;
  chapter: number;
  translation: string;
  verses: Array<{ verse: number; text: string }>;
}

export interface ParsedBibleReference {
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  originalText: string;
}

/**
 * Bible Favorite Types
 */
export interface BibleFavorite {
  id: number;
  user_id: number;
  translation: string;
  display_order: number;
  created_at: string;
}

export interface BibleFavoritesResponse {
  favorites: BibleFavorite[];
}

/**
 * Bible API
 */
export const bibleAPI = {
  /**
   * Ruft einen Bibelvers ab
   */
  async getVerse(reference: string, translation?: string): Promise<BibleVerseResponse> {
    const params = new URLSearchParams();
    params.append('reference', reference);
    if (translation) {
      params.append('translation', translation);
    }
    console.log('bibleAPI.getVerse called:', { reference, translation, url: `/bible/verse?${params.toString()}` });
    const response = await api.get<BibleVerseResponse>(`/bible/verse?${params.toString()}`);
    return response.data;
  },

  /**
   * Ruft ein ganzes Kapitel ab
   */
  async getChapter(book: string, chapter: number, translation?: string): Promise<BibleChapterResponse> {
    const params = new URLSearchParams({ book, chapter: chapter.toString() });
    if (translation) {
      params.append('translation', translation);
    }
    const response = await api.get<BibleChapterResponse>(`/bible/chapter?${params.toString()}`);
    return response.data;
  },

  /**
   * Parst eine Bibelstellen-Referenz
   */
  async parseReference(reference: string): Promise<ParsedBibleReference> {
    const response = await api.post<ParsedBibleReference>('/bible/parse', { reference });
    return response.data;
  },

  /**
   * Ruft alle Favoriten des eingeloggten Benutzers ab
   */
  async getFavorites(): Promise<BibleFavoritesResponse> {
    const response = await api.get<BibleFavoritesResponse>('/bible/favorites');
    return response.data;
  },

  /**
   * Fügt eine Übersetzung zu den Favoriten hinzu
   * @param translation - Übersetzungs-Code
   * @param isDefault - Wenn true, wird die Übersetzung mit display_order 0 hinzugefügt (Standard-Übersetzung)
   */
  async addFavorite(translation: string, isDefault: boolean = false): Promise<{ success: boolean; favorite: BibleFavorite }> {
    const response = await api.post<{ success: boolean; favorite: BibleFavorite }>('/bible/favorites', { translation, isDefault });
    return response.data;
  },

  /**
   * Entfernt eine Übersetzung aus den Favoriten
   */
  async deleteFavorite(translation: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/bible/favorites/${encodeURIComponent(translation)}`);
    return response.data;
  },

  /**
   * Aktualisiert die Reihenfolge der Favoriten
   */
  async updateFavoritesOrder(favorites: Array<{ translation: string; order: number }>): Promise<{ success: boolean }> {
    const response = await api.put<{ success: boolean }>('/bible/favorites/order', { favorites });
    return response.data;
  },

  /**
   * Ruft alle verfügbaren Übersetzungen ab (lokal + API)
   */
  async getTranslations(): Promise<{ local: string[]; api: string[]; all: string[] }> {
    const response = await api.get<{ local: string[]; api: string[]; all: string[] }>('/bible/translations');
    return response.data;
  }
};

/**
 * Export API
 */
export const exportAPI = {
  /**
   * Exportiert eine Datei als PDF
   */
  async exportPDF(filePath: string, fileType: 'private' | 'shared', size?: 'A4' | 'A5'): Promise<Blob> {
    const response = await api.post(
      '/export/pdf',
      { filePath, fileType, size },
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Exportiert eine Datei als Word-Dokument
   */
  async exportWord(filePath: string, fileType: 'private' | 'shared'): Promise<Blob> {
    const response = await api.post(
      '/export/word',
      { filePath, fileType },
      { responseType: 'blob' }
    );
    return response.data;
  }
};

/**
 * Search API
 */
export interface SearchMatch {
  line: number;
  text: string;
  context: string;
}

export interface SearchResult {
  path: string;
  type: 'private' | 'shared';
  name: string;
  matches: SearchMatch[];
  relevance: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

export const searchAPI = {
  /**
   * Sucht nach einem Begriff in allen Notizen
   * @param query - Suchbegriff
   * @param type - Optional: Nur in 'private' oder 'shared' suchen
   */
  async search(query: string, type?: 'private' | 'shared'): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (type) {
      params.append('type', type);
    }
    const response = await api.get<SearchResponse>(`/search?${params.toString()}`);
    return response.data;
  }
};

/**
 * Admin API Types
 */
export interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  auth_type: 'local' | 'ldap' | 'synology';
  auth_source: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_admin: boolean;
}

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface CreateUserRequest extends RegisterRequest {
  isAdmin?: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface UpdateUserRoleRequest {
  isAdmin: boolean;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
}

/**
 * Shared Folders Types
 */
export interface SharedFolder {
  name: string;
  path: string;
  exists: boolean;
}

export interface SharedFoldersResponse {
  folders: SharedFolder[];
}

export interface UserSharedFolder {
  id: number;
  user_id: number;
  folder_path: string;
  created_at: string;
}

export interface UserSharedFoldersResponse {
  folders: UserSharedFolder[];
}

export interface AddSharedFolderRequest {
  folderPath: string;
}

/**
 * Admin API
 */
export const adminAPI = {
  /**
   * Gibt alle Benutzer zurück
   */
  async getUsers(): Promise<AdminUsersResponse> {
    const response = await api.get<AdminUsersResponse>('/admin/users');
    return response.data;
  },

  /**
   * Erstellt einen neuen Benutzer
   */
  async createUser(data: CreateUserRequest): Promise<{ user: AdminUser; message: string }> {
    const response = await api.post<{ user: AdminUser; message: string }>('/admin/users', data);
    return response.data;
  },

  /**
   * Löscht einen Benutzer
   */
  async deleteUser(userId: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Setzt das Passwort eines Benutzers zurück
   */
  async resetPassword(userId: number, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/admin/users/${userId}/reset-password`, {
      newPassword
    });
    return response.data;
  },

  /**
   * Aktualisiert den Admin-Status eines Benutzers
   */
  async updateUserRole(userId: number, isAdmin: boolean): Promise<{ message: string }> {
    const response = await api.patch<{ message: string }>(`/admin/users/${userId}/role`, {
      isAdmin
    });
    return response.data;
  },

  /**
   * Aktiviert oder deaktiviert einen Benutzer
   */
  async updateUserStatus(userId: number, isActive: boolean): Promise<{ message: string }> {
    const response = await api.patch<{ message: string }>(`/admin/users/${userId}/status`, {
      isActive
    });
    return response.data;
  },

  /**
   * Gibt alle verfügbaren Shared-Ordner zurück
   */
  async getSharedFolders(): Promise<SharedFoldersResponse> {
    const response = await api.get<SharedFoldersResponse>('/admin/shared-folders');
    return response.data;
  },

  /**
   * Gibt die Shared-Ordner eines Users zurück
   */
  async getUserSharedFolders(userId: number): Promise<UserSharedFoldersResponse> {
    const response = await api.get<UserSharedFoldersResponse>(`/admin/users/${userId}/shared-folders`);
    return response.data;
  },

  /**
   * Fügt einem User Zugriff auf einen Shared-Ordner hinzu
   */
  async addUserSharedFolder(userId: number, folderPath: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/admin/users/${userId}/shared-folders`, {
      folderPath
    });
    return response.data;
  },

  /**
   * Entfernt den Zugriff eines Users auf einen Shared-Ordner
   */
  async removeUserSharedFolder(userId: number, folderId: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/admin/users/${userId}/shared-folders/${folderId}`);
    return response.data;
  }
};

export default api;

