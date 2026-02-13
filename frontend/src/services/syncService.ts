/**
 * Sync Service
 * 
 * Synchronisiert ausstehende Änderungen mit dem Server beim Wieder-Online-Gehen
 */

import { fileAPI } from './api';
import { getPendingChanges, removePendingChange, cacheNote } from './offlineStorage';

export interface SyncFailureDetail {
  id: string;
  path: string;
  type: 'private' | 'shared';
  action: 'create' | 'update' | 'delete';
  error: string;
}

export interface SyncSummary {
  total: number;
  success: number;
  failed: number;
  syncedPaths: string[];
  failures: SyncFailureDetail[];
}

/**
 * Synchronisiert alle ausstehenden Änderungen mit dem Server
 */
export async function syncPendingChanges(): Promise<SyncSummary> {
  const pending = await getPendingChanges();
  
  if (pending.length === 0) {
    return { total: 0, success: 0, failed: 0, syncedPaths: [], failures: [] };
  }

  let success = 0;
  let failed = 0;
  const syncedPaths: string[] = [];
  const failures: SyncFailureDetail[] = [];

  for (const change of pending) {
    try {
      switch (change.action) {
        case 'create':
          await fileAPI.createFile({
            path: change.path,
            content: change.content ?? '',
            type: change.type
          });
          if (change.content !== undefined) {
            await cacheNote(change.path, change.type, change.content);
          }
          break;
        case 'update':
          if (change.content !== undefined) {
            try {
              await fileAPI.updateFile({
                path: change.path,
                content: change.content,
                type: change.type
              });
            } catch (updateError: any) {
              // Fallback: Wenn Datei serverseitig fehlt, als create erneut versuchen.
              if (updateError?.response?.status === 404) {
                await fileAPI.createFile({
                  path: change.path,
                  content: change.content,
                  type: change.type
                });
              } else {
                throw updateError;
              }
            }
            // Aktualisiere Cache nach erfolgreichem Sync
            await cacheNote(change.path, change.type, change.content);
          }
          break;
        case 'delete':
          await fileAPI.deleteFile({
            path: change.path,
            type: change.type
          });
          break;
      }

      // Entferne aus Queue nach erfolgreichem Sync
      await removePendingChange(change.id);
      success++;
      syncedPaths.push(change.path);
    } catch (error) {
      console.error(`Failed to sync change ${change.id}:`, error);
      failed++;
      failures.push({
        id: change.id,
        path: change.path,
        type: change.type,
        action: change.action,
        error: error instanceof Error
          ? error.message
          : 'Unbekannter Synchronisationsfehler'
      });
      // Behalte in Queue für nächsten Sync-Versuch
    }
  }

  return { total: pending.length, success, failed, syncedPaths, failures };
}

/**
 * Prüft, ob der Benutzer online ist
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Registriert Event-Listener für Online/Offline-Status
 */
export function registerOnlineStatusListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => {
    console.log('App is now online, syncing pending changes...');
    onOnline();
  };

  const handleOffline = () => {
    console.log('App is now offline');
    onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Rückgabe Cleanup-Funktion
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

