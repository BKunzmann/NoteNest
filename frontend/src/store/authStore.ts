/**
 * Auth Store (Zustand)
 * 
 * Verwaltet Authentifizierungs-Status und Benutzer-Informationen
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Initial true, damit beim App-Start gewartet wird
      error: null,

      /**
       * Loggt einen Benutzer ein
       */
      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await authAPI.login(data);
          
          // Speichere Tokens abhängig von "Angemeldet bleiben"
          const storage = data.rememberMe ? localStorage : sessionStorage;
          storage.setItem('accessToken', response.accessToken);
          storage.setItem('refreshToken', response.refreshToken);
          
          // Merke dir die Storage-Präferenz
          localStorage.setItem('useSessionStorage', data.rememberMe ? 'false' : 'true');
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Login fehlgeschlagen';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      /**
       * Registriert einen neuen Benutzer
       */
      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await authAPI.register(data);
          
          // Bei Registrierung immer localStorage verwenden (User will sich anmelden)
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('useSessionStorage', 'false');
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Registrierung fehlgeschlagen';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      /**
       * Meldet einen Benutzer ab
       */
      logout: async () => {
        try {
          // Hole Token aus dem richtigen Storage
          const useSessionStorage = localStorage.getItem('useSessionStorage') === 'true';
          const storage = useSessionStorage ? sessionStorage : localStorage;
          const refreshToken = storage.getItem('refreshToken');
          
          if (refreshToken) {
            await authAPI.logout(refreshToken);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Lösche lokale Daten aus beiden Storages
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('useSessionStorage');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          
          set({
            user: null,
            isAuthenticated: false,
            error: null
          });
        }
      },

      /**
       * Prüft, ob der Benutzer authentifiziert ist
       * Wird beim App-Start aufgerufen, um den Auth-Status zu validieren
       * Versucht automatisch, den Refresh Token zu verwenden, wenn der Access Token abgelaufen ist
       */
      checkAuth: async () => {
        // Prüfe beide Storages (localStorage für "Angemeldet bleiben", sessionStorage für Sitzung)
        const useSessionStorage = localStorage.getItem('useSessionStorage') === 'true';
        const storage = useSessionStorage ? sessionStorage : localStorage;
        
        const accessToken = storage.getItem('accessToken');
        const refreshToken = storage.getItem('refreshToken');
        
        if (!accessToken && !refreshToken) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
          return;
        }

        set({ isLoading: true });
        
        try {
          // Versuche zuerst mit Access Token
          if (accessToken) {
            try {
              const user = await authAPI.getMe();
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
              return;
            } catch (error: any) {
              // Access Token ungültig, versuche Refresh Token
              if (error.response?.status === 401 || error.response?.status === 403) {
                // Fall through to refresh token logic
              } else {
                throw error;
              }
            }
          }
          
          // Versuche Refresh Token zu verwenden
          if (refreshToken) {
            try {
              const response = await authAPI.refresh(refreshToken);
              storage.setItem('accessToken', response.accessToken);
              
              // Hole User-Info mit neuem Token
              const user = await authAPI.getMe();
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
              return;
            } catch (refreshError) {
              // Refresh fehlgeschlagen -> Logout
              storage.removeItem('accessToken');
              storage.removeItem('refreshToken');
              localStorage.removeItem('useSessionStorage');
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
              });
              return;
            }
          }
          
          // Kein Token verfügbar
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        } catch (error: any) {
          // Unerwarteter Fehler
          console.log('Auth check failed:', error);
          storage.removeItem('accessToken');
          storage.removeItem('refreshToken');
          localStorage.removeItem('useSessionStorage');
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      /**
       * Löscht Fehler-Meldungen
       */
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // WICHTIG: Nur Tokens werden persistiert, NICHT isAuthenticated oder user
      // Diese werden immer durch checkAuth() validiert
      partialize: () => ({}) // Keine State-Daten persistieren
    }
  )
);

