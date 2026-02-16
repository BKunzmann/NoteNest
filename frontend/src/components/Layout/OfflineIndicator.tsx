/**
 * Offline Indicator Component
 * 
 * Zeigt einen Indikator an, wenn die App offline ist
 */

import { useEffect, useRef, useState } from 'react';
import { syncPendingChanges } from '../../services/syncService';
import { isOnline } from '../../services/syncService';
import type { SyncSummary } from '../../services/syncService';
import { getPendingChanges } from '../../services/offlineStorage';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isPwaUpdateAvailable, setIsPwaUpdateAvailable] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);

  const clearAutoCloseTimer = () => {
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    const refreshPendingCount = async () => {
      try {
        const pending = await getPendingChanges();
        setPendingCount(pending.length);
      } catch {
        setPendingCount(0);
      }
    };

    const handleOnline = async () => {
      setIsOffline(false);
      setIsSyncing(true);
      await refreshPendingCount();
      
      try {
        const result = await syncPendingChanges();
        setSyncResult(result);
        await refreshPendingCount();
      } catch (error) {
        console.error('Sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setSyncResult(null);
      setShowDetails(false);
      clearAutoCloseTimer();
      void refreshPendingCount();
    };

    const handlePwaUpdateAvailable = () => {
      setIsPwaUpdateAvailable(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('notenest:pwa-update-available', handlePwaUpdateAvailable as EventListener);
    void refreshPendingCount();

    // Prüfe initialen Status
    if (isOnline()) {
      void handleOnline();
    }

    return () => {
      clearAutoCloseTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('notenest:pwa-update-available', handlePwaUpdateAvailable as EventListener);
    };
  }, []);

  useEffect(() => {
    clearAutoCloseTimer();
    if (!syncResult || showDetails) {
      return;
    }

    autoCloseTimerRef.current = window.setTimeout(() => {
      setSyncResult(null);
    }, 3000);

    return () => {
      clearAutoCloseTimer();
    };
  }, [showDetails, syncResult]);

  useEffect(() => {
    if (!syncResult) {
      setShowDetails(false);
    }
  }, [syncResult]);

  useEffect(() => {
    if (!syncResult || !showDetails) {
      return;
    }

    const handleOutsideClose = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current?.contains(target)) {
        return;
      }
      setShowDetails(false);
      setSyncResult(null);
    };

    document.addEventListener('mousedown', handleOutsideClose);
    document.addEventListener('touchstart', handleOutsideClose);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClose);
      document.removeEventListener('touchstart', handleOutsideClose);
    };
  }, [showDetails, syncResult]);

  if (!isOffline && !isSyncing && !syncResult && !isPwaUpdateAvailable) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        backgroundColor: isOffline 
          ? 'var(--error-bg, #fee)' 
          : isSyncing 
            ? 'var(--warning-bg, #ffa)' 
            : 'var(--success-bg, #efe)',
        color: isOffline 
          ? 'var(--error-text, #c33)' 
          : isSyncing 
            ? 'var(--warning-text, #880)' 
            : 'var(--success-text, #3c3)',
        border: `1px solid ${isOffline 
          ? 'var(--error-border, #c33)' 
          : isSyncing 
            ? 'var(--warning-border, #880)' 
            : 'var(--success-border, #3c3)'}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        maxWidth: '420px',
        flexDirection: 'column'
      }}
    >
      {isOffline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📴</span>
          <span>
            Offline: Änderungen werden lokal gespeichert
            {pendingCount > 0 ? ` (${pendingCount} ausstehend)` : ''}
          </span>
        </div>
      )}

      {isSyncing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔄</span>
          <span>
            Synchronisiere lokale Offline-Änderungen...
            {pendingCount > 0 ? ` (${pendingCount})` : ''}
          </span>
        </div>
      )}

      {syncResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{syncResult.failed > 0 ? '⚠️' : '✅'}</span>
            <span>
              {syncResult.success > 0 && `${syncResult.success} Änderung${syncResult.success > 1 ? 'en' : ''} synchronisiert`}
              {syncResult.failed > 0 && syncResult.success > 0 && ', '}
              {syncResult.failed > 0 && `${syncResult.failed} fehlgeschlagen`}
              {syncResult.success === 0 && syncResult.failed === 0 && 'Keine ausstehenden Änderungen'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            style={{
              alignSelf: 'flex-start',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: '0.25rem 0.45rem',
              fontSize: '0.75rem',
              color: 'inherit'
            }}
          >
            {showDetails ? 'Details ausblenden' : 'Details anzeigen'}
          </button>

          {showDetails && (
            <div style={{
              marginTop: '0.25rem',
              padding: '0.45rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.35)',
              fontSize: '0.78rem',
              lineHeight: 1.4
            }}>
              <div><strong>Was wird synchronisiert?</strong> Lokale Offline-Dateiänderungen (Create/Update/Delete) aus der IndexedDB-Queue.</div>
              {syncResult.syncedPaths.length > 0 && (
                <div style={{ marginTop: '0.35rem' }}>
                  <strong>Synchronisiert:</strong>
                  <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0 }}>
                    {syncResult.syncedPaths.slice(0, 5).map((syncedPath) => (
                      <li key={syncedPath}>{syncedPath}</li>
                    ))}
                  </ul>
                </div>
              )}
              {syncResult.failures.length > 0 && (
                <div style={{ marginTop: '0.35rem' }}>
                  <strong>Fehler:</strong>
                  <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0 }}>
                    {syncResult.failures.slice(0, 5).map((failure) => (
                      <li key={failure.id}>{failure.path}: {failure.error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: '0.35rem' }}>
                Hinweis: Manifest/Service-Worker steuern Caching & Update-Auslieferung, die Datei-Synchronisation passiert separat über die Offline-Queue.
              </div>
            </div>
          )}
        </div>
      )}

      {isPwaUpdateAvailable && (
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('notenest:pwa-apply-update'));
            setIsPwaUpdateAvailable(false);
          }}
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '0.35rem 0.6rem',
            fontSize: '0.78rem'
          }}
        >
          App-Update installieren
        </button>
      )}
    </div>
  );
}

