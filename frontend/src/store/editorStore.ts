/**
 * Editor Store (Zustand)
 * 
 * Verwaltet Editor-Status (Content, Änderungen, Vorschau-Modus)
 */

import { create } from 'zustand';
import { fileAPI } from '../services/api';
import { cacheNote, addPendingChange, isIndexedDBAvailable } from '../services/offlineStorage';
import { isOnline } from '../services/syncService';

interface EditorState {
  content: string;
  originalContent: string;
  isDirty: boolean; // Hat ungespeicherte Änderungen
  isSaving: boolean;
  viewMode: 'edit' | 'preview' | 'split' | 'wysiwyg'; // Editor-Modus
  isPreviewFullscreen: boolean;
  error: string | null;
  
  // Undo/Redo
  history: string[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  
  // Actions
  setContent: (content: string, skipHistory?: boolean) => void;
  setOriginalContent: (content: string) => void;
  reset: () => void;
  saveFile: (filePath: string, type: 'private' | 'shared') => Promise<void>;
  autoSaveFile: (filePath: string, type: 'private' | 'shared') => Promise<void>;
  setViewMode: (mode: 'edit' | 'preview' | 'split' | 'wysiwyg') => void;
  setPreviewFullscreen: (enabled: boolean) => void;
  clearError: () => void;
  undo: () => void;
  redo: () => void;
}

/** Debounce für Undo-History: verhindert, dass bei jedem Tastendruck die ganze Notiz kopiert wird */
let historyCommitTimer: ReturnType<typeof setTimeout> | null = null;
let pendingHistorySnapshot: string | null = null;
const HISTORY_DEBOUNCE_MS = 400;
const MAX_HISTORY_ENTRIES = 40;

function commitPendingHistory(get: () => EditorState, set: (partial: Partial<EditorState>) => void) {
  if (pendingHistorySnapshot === null) {
    return;
  }
  const snapshot = pendingHistorySnapshot;
  pendingHistorySnapshot = null;

  const state = get();
  if (snapshot === state.content && state.history[state.historyIndex] === snapshot) {
    return;
  }

  let newHistory = state.history.slice(0, state.historyIndex + 1);
  if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== snapshot) {
    // Snapshot ist der Stand VOR der aktuellen Änderung – am Ende den aktuellen Content halten
    if (newHistory[newHistory.length - 1] !== state.content) {
      newHistory.push(snapshot);
    }
  }

  if (newHistory[newHistory.length - 1] !== state.content) {
    newHistory.push(state.content);
  }

  while (newHistory.length > MAX_HISTORY_ENTRIES) {
    newHistory.shift();
  }

  const newIndex = newHistory.length - 1;
  set({
    history: newHistory,
    historyIndex: newIndex,
    canUndo: newIndex > 0,
    canRedo: false
  });
}

export const useEditorStore = create<EditorState>((set, get) => ({
  content: '',
  originalContent: '',
  isDirty: false,
  isSaving: false,
  viewMode: 'wysiwyg',
  isPreviewFullscreen: false,
  error: null,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  /**
   * Setzt Editor-Content
   * @param content Der neue Content
   * @param skipHistory Wenn true, wird kein History-Eintrag erstellt (für Undo/Redo)
   */
  setContent: (content: string, skipHistory: boolean = false) => {
    const state = get();
    const original = state.originalContent;
    
    if (content === state.content) {
      return;
    }

    if (skipHistory) {
      if (historyCommitTimer) {
        clearTimeout(historyCommitTimer);
        historyCommitTimer = null;
      }
      pendingHistorySnapshot = null;
      set({
        content,
        isDirty: content !== original
      });
      return;
    }

    // Sofort Content aktualisieren (ohne teure History-Kopie)
    if (pendingHistorySnapshot === null) {
      pendingHistorySnapshot = state.content;
    }

    set({
      content,
      isDirty: content !== original
    });

    if (historyCommitTimer) {
      clearTimeout(historyCommitTimer);
    }
    historyCommitTimer = setTimeout(() => {
      historyCommitTimer = null;
      commitPendingHistory(get, set);
    }, HISTORY_DEBOUNCE_MS);
  },

  /**
   * Setzt Original-Content (beim Laden einer Datei)
   */
  setOriginalContent: (content: string) => {
    if (historyCommitTimer) {
      clearTimeout(historyCommitTimer);
      historyCommitTimer = null;
    }
    pendingHistorySnapshot = null;
    set({
      originalContent: content,
      content,
      isDirty: false,
      history: [content],
      historyIndex: 0,
      canUndo: false,
      canRedo: false
    });
  },

  /**
   * Setzt Editor zurück
   */
  reset: () => {
    if (historyCommitTimer) {
      clearTimeout(historyCommitTimer);
      historyCommitTimer = null;
    }
    pendingHistorySnapshot = null;
    set({
      content: '',
      originalContent: '',
      isDirty: false,
      isPreviewFullscreen: false,
      error: null,
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false
    });
  },

  /**
   * Speichert Datei (manuell)
   * Unterstützt Offline-Modus: Speichert lokal und fügt zur Sync-Queue hinzu
   * Aktualisiert originalContent, damit isDirty korrekt ist
   */
  saveFile: async (filePath: string, type: 'private' | 'shared') => {
    set({ isSaving: true, error: null });
    
    const content = get().content;
    
    try {
      // Versuche zuerst API (wenn online)
      if (isOnline()) {
        try {
          await fileAPI.updateFile({
            path: filePath,
            content,
            type
          });
          
          // Nach erfolgreichem Speichern: Original-Content aktualisieren und Cache aktualisieren
          if (isIndexedDBAvailable()) {
            await cacheNote(filePath, type, content);
          }
          
          set({
            originalContent: content,
            isDirty: false,
            isSaving: false
          });
          return;
        } catch (error: any) {
          // API-Fehler: Speichere lokal und füge zur Sync-Queue hinzu
          console.warn('API save failed, saving locally:', error);
        }
      }
      
      // Offline oder API-Fehler: Speichere lokal
      if (isIndexedDBAvailable()) {
        // Cache aktualisieren
        await cacheNote(filePath, type, content);
        
        // Zur Sync-Queue hinzufügen
        await addPendingChange(filePath, type, 'update', content);
        
        // Nach lokalem Speichern: Original-Content aktualisieren
        set({
          originalContent: content,
          isDirty: false,
          isSaving: false
        });
        console.log('File saved locally (will sync when online)');
        return;
      }
      
      throw new Error('Offline-Speicherung nicht verfügbar');
    } catch (error: any) {
      const errorMessage = error.message || error.response?.data?.error || 'Fehler beim Speichern';
      set({
        isSaving: false,
        error: errorMessage
      });
      throw error;
    }
  },

  /**
   * Automatisches Speichern (im Hintergrund)
   * Speichert die Datei im Hintergrund und aktualisiert originalContent,
   * damit der gespeicherte Stand als neuer Referenzpunkt gilt.
   */
  autoSaveFile: async (filePath: string, type: 'private' | 'shared') => {
    // Setze isSaving nicht, damit kein visuelles Feedback erscheint
    const content = get().content;
    
    try {
      // Versuche zuerst API (wenn online)
      if (isOnline()) {
        try {
          await fileAPI.updateFile({
            path: filePath,
            content,
            type
          });
          
          // Cache aktualisieren
          if (isIndexedDBAvailable()) {
            await cacheNote(filePath, type, content);
          }

          // Setze gespeicherten Stand als neue Referenz
          set({
            originalContent: content,
            isDirty: false
          });
          return;
        } catch (error: any) {
          // API-Fehler: Speichere lokal und füge zur Sync-Queue hinzu
          console.warn('API auto-save failed, saving locally:', error);
        }
      }
      
      // Offline oder API-Fehler: Speichere lokal
      if (isIndexedDBAvailable()) {
        // Cache aktualisieren
        await cacheNote(filePath, type, content);
        
        // Zur Sync-Queue hinzufügen
        await addPendingChange(filePath, type, 'update', content);
        
        set({
          originalContent: content,
          isDirty: false
        });
        return;
      }
      
      // Kein Fehler werfen bei Auto-Save, nur loggen
      console.warn('Auto-save failed: Offline-Speicherung nicht verfügbar');
    } catch (error: any) {
      // Bei Auto-Save keine Fehler anzeigen, nur loggen
      console.warn('Auto-save error:', error);
    }
  },

  /**
   * Setzt View-Modus
   */
  setViewMode: (mode: 'edit' | 'preview' | 'split' | 'wysiwyg') => {
    set({ viewMode: mode });
  },

  setPreviewFullscreen: (enabled: boolean) => {
    set({ isPreviewFullscreen: enabled });
  },

  /**
   * Löscht Fehler
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Macht die letzte Änderung rückgängig
   */
  undo: () => {
    // Offene Tipp-Session zuerst in die History schreiben
    if (historyCommitTimer) {
      clearTimeout(historyCommitTimer);
      historyCommitTimer = null;
    }
    commitPendingHistory(get, set);

    const state = get();
    if (state.historyIndex > 0 && state.history.length > 0) {
      const newIndex = state.historyIndex - 1;
      const previousContent = state.history[newIndex];
      const original = state.originalContent;
      
      set({
        content: previousContent,
        isDirty: previousContent !== original,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true
      });
    }
  },

  /**
   * Wiederholt die letzte rückgängig gemachte Änderung
   */
  redo: () => {
    if (historyCommitTimer) {
      clearTimeout(historyCommitTimer);
      historyCommitTimer = null;
    }
    pendingHistorySnapshot = null;

    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const nextIndex = state.historyIndex + 1;
      const nextContent = state.history[nextIndex];
      const original = state.originalContent;
      
      set({
        content: nextContent,
        isDirty: nextContent !== original,
        historyIndex: nextIndex,
        canUndo: true,
        canRedo: nextIndex < state.history.length - 1
      });
    }
  }
}));

