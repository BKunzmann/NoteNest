/**
 * File Store (Zustand)
 * 
 * Verwaltet Datei-Status und Ordnerstruktur
 */

import { create } from 'zustand';
import { FileItem, FileListResponse, FileContentResponse } from '../types/file';
import { fileAPI } from '../services/api';
import { getCachedNote, cacheNote, isIndexedDBAvailable } from '../services/offlineStorage';
import { isOnline } from '../services/syncService';

interface FileState {
  // Private Files
  privateFiles: FileItem[];
  privatePath: string;
  
  // Shared Files
  sharedFiles: FileItem[];
  sharedPath: string;
  
  // Current Selection
  selectedFile: FileItem | null;
  selectedPath: string | null;
  selectedType: 'private' | 'shared' | null;
  fileContent: string | null;
  
  // Loading States
  isLoading: boolean;
  isLoadingContent: boolean;
  privateError: string | null;
  sharedError: string | null;
  
  // Actions
  loadFiles: (path?: string, type?: 'private' | 'shared') => Promise<void>;
  loadFileContent: (path: string, type: 'private' | 'shared') => Promise<void>;
  selectFile: (file: FileItem | null, path: string | null, type: 'private' | 'shared' | null) => void;
  clearSelection: () => void;
  clearError: () => void;
  deleteItem: (filePath: string, type: 'private' | 'shared') => Promise<void>;
}

export const useFileStore = create<FileState>((set, get) => ({
  privateFiles: [],
  privatePath: '/',
  sharedFiles: [],
  sharedPath: '/',
  selectedFile: null,
  selectedPath: null,
  selectedType: null,
  fileContent: null,
  isLoading: false,
  isLoadingContent: false,
  privateError: null,
  sharedError: null,

  /**
   * Lädt Dateien aus einem Verzeichnis
   */
  loadFiles: async (path: string = '/', type: 'private' | 'shared' = 'private') => {
    set({ isLoading: true });
    
    // Setze Fehler für den entsprechenden Typ zurück
    if (type === 'private') {
      set({ privateError: null });
    } else {
      set({ sharedError: null });
    }
    
    try {
      const response: FileListResponse = await fileAPI.listFiles(path, type);
      
      if (type === 'private') {
        set({
          privateFiles: response.items,
          privatePath: response.path,
          isLoading: false,
          privateError: null
        });
      } else {
        set({
          sharedFiles: response.items,
          sharedPath: response.path,
          isLoading: false,
          sharedError: null
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Fehler beim Laden der Dateien';
      if (type === 'private') {
        set({
          isLoading: false,
          privateError: errorMessage
        });
      } else {
        set({
          isLoading: false,
          sharedError: errorMessage
        });
      }
    }
  },

  /**
   * Lädt Datei-Inhalt
   * Unterstützt Offline-Modus: Versucht zuerst API, dann Cache
   */
  loadFileContent: async (filePath: string, type: 'private' | 'shared') => {
    // Prüfe, ob bereits geladen wird oder der Content bereits vorhanden ist
    const state = get();
    if (state.isLoadingContent) {
      console.log('Already loading file content, skipping...');
      return;
    }
    
    set({ isLoadingContent: true });
    
    try {
      console.log('Loading file content:', { filePath, type });
      
      // Versuche zuerst API (wenn online)
      if (isOnline()) {
        try {
          const response: FileContentResponse = await fileAPI.getFileContent(filePath, type);
          
          // Cache für Offline-Nutzung speichern
          if (isIndexedDBAvailable()) {
            await cacheNote(filePath, type, response.content);
          }
          
          set({
            fileContent: response.content,
            isLoadingContent: false
          });
          console.log('File content loaded successfully:', { filePath, contentLength: response.content.length });
          return;
        } catch (error: any) {
          // API-Fehler: Versuche Cache (auch wenn online, falls Server nicht erreichbar)
          console.warn('API request failed, trying cache:', error);
        }
      }
      
      // Offline oder API-Fehler: Versuche Cache
      if (isIndexedDBAvailable()) {
        const cached = await getCachedNote(filePath, type);
        if (cached) {
          set({
            fileContent: cached.content,
            isLoadingContent: false
          });
          console.log('File content loaded from cache:', { filePath });
          return;
        }
      }
      
      // Weder API noch Cache verfügbar
      throw new Error('Datei nicht verfügbar (offline und nicht gecacht)');
    } catch (error: any) {
      const errorMessage = error.message || error.response?.data?.error || 'Fehler beim Laden der Datei';
      set({
        isLoadingContent: false,
        fileContent: null
      });
      // Fehler wird in der Komponente angezeigt
      console.error('Failed to load file content:', { filePath, type, error: errorMessage, fullError: error });
    }
  },

  /**
   * Wählt eine Datei aus
   */
  selectFile: (file: FileItem | null, filePath: string | null, fileType: 'private' | 'shared' | null) => {
    // Normalisiere den Pfad, bevor er gesetzt wird
    let normalizedPath = filePath;
    if (normalizedPath) {
      // Stelle sicher, dass der Pfad mit / beginnt
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }
      // Entferne doppelte Slashes
      normalizedPath = normalizedPath.replace(/\/+/g, '/');
    }
    
    set({
      selectedFile: file,
      selectedPath: normalizedPath,
      selectedType: fileType,
      fileContent: null // Lösche alten Inhalt
    });
    
    // Lade Datei-Inhalt, wenn es eine Datei ist
    // Prüfe sowohl isEditable als auch fileType (.md, .txt sind standardmäßig bearbeitbar)
    if (file && file.type === 'file' && normalizedPath && fileType) {
      const isEditable = file.isEditable !== false && (file.fileType === 'md' || file.fileType === 'txt');
      if (isEditable) {
        console.log('Loading file content:', { filePath: normalizedPath, fileType, fileName: file.name });
        get().loadFileContent(normalizedPath, fileType);
      }
    }
  },

  /**
   * Löscht Auswahl
   */
  clearSelection: () => {
    set({
      selectedFile: null,
      selectedPath: null,
      selectedType: null,
      fileContent: null
    });
  },

  /**
   * Löscht Fehler-Meldungen
   */
  clearError: (type?: 'private' | 'shared') => {
    if (type === 'private') {
      set({ privateError: null });
    } else if (type === 'shared') {
      set({ sharedError: null });
    } else {
      set({ privateError: null, sharedError: null });
    }
  },

  /**
   * Löscht eine Datei oder einen Ordner
   */
  deleteItem: async (filePath: string, type: 'private' | 'shared') => {
    try {
      await fileAPI.deleteFile({ path: filePath, type });
      
      // Lösche Auswahl, falls die gelöschte Datei/Ordner ausgewählt war
      const { selectedPath, selectedType } = get();
      if (selectedPath === filePath && selectedType === type) {
        get().clearSelection();
      }
      
      // Lade Dateiliste neu
      const currentPath = type === 'private' ? get().privatePath : get().sharedPath;
      await get().loadFiles(currentPath, type);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Fehler beim Löschen';
      if (type === 'private') {
        set({ privateError: errorMessage });
      } else {
        set({ sharedError: errorMessage });
      }
      throw error;
    }
  }
}));

