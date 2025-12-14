/**
 * Theme Store (Zustand)
 * 
 * Verwaltet Theme-Einstellungen und wendet sie global an
 */

import { create } from 'zustand';
import { settingsAPI } from '../services/api';

interface ThemeState {
  theme: 'light' | 'dark';
  isLoading: boolean;
  
  // Actions
  loadTheme: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  applyTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  isLoading: false,

  /**
   * Lädt Theme aus Settings
   */
  loadTheme: async () => {
    set({ isLoading: true });
    
    try {
      const settings = await settingsAPI.getSettings();
      const theme = (settings.theme || 'light') as 'light' | 'dark';
      
      set({ theme, isLoading: false });
      get().applyTheme(theme);
    } catch (error) {
      console.error('Failed to load theme:', error);
      set({ isLoading: false });
      // Fallback: Light Theme
      get().applyTheme('light');
    }
  },

  /**
   * Setzt Theme und speichert es
   */
  setTheme: async (theme: 'light' | 'dark') => {
    set({ theme });
    get().applyTheme(theme);
    
    try {
      await settingsAPI.updateSettings({ theme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  },

  /**
   * Wendet Theme auf HTML-Element an
   */
  applyTheme: (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
  }
}));

