/**
 * Sync Service
 * 
 * Synchronisiert ausstehende Änderungen mit dem Server beim Wieder-Online-Gehen
 */

import { fileAPI } from './api';
import { getPendingChanges, removePendingChange, cacheNote } from './offlineStorage';

/**
 * Synchronisiert alle ausstehenden Änderungen mit dem Server
 */
export async function syncPendingChanges(): Promise<{ success: number; failed: number }> {
  const pending = await getPendingChanges();
  
  if (pending.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const change of pending) {
    try {
      switch (change.action) {
        case 'create':
        case 'update':
          if (change.content !== undefined) {
            await fileAPI.updateFile({
              path: change.path,
              content: change.content,
              type: change.type
            });
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
    } catch (error) {
      console.error(`Failed to sync change ${change.id}:`, error);
      failed++;
      // Behalte in Queue für nächsten Sync-Versuch
    }
  }

  return { success, failed };
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

