/**
 * Offline Indicator Component
 * 
 * Zeigt einen Indikator an, wenn die App offline ist
 */

import { useEffect, useState } from 'react';
import { syncPendingChanges } from '../../services/syncService';
import { isOnline } from '../../services/syncService';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setIsSyncing(true);
      
      try {
        const result = await syncPendingChanges();
        setSyncResult(result);
        
        // Verstecke Sync-Ergebnis nach 3 Sekunden
        setTimeout(() => {
          setSyncResult(null);
        }, 3000);
      } catch (error) {
        console.error('Sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setSyncResult(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Prüfe initialen Status
    if (isOnline()) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !isSyncing && !syncResult) {
    return null;
  }

  return (
    <div
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
        alignItems: 'center',
        gap: '0.5rem',
        maxWidth: '300px'
      }}
    >
      {isOffline ? (
        <>
          <span>📴</span>
          <span>Offline - Änderungen werden lokal gespeichert</span>
        </>
      ) : isSyncing ? (
        <>
          <span>🔄</span>
          <span>Synchronisiere Änderungen...</span>
        </>
      ) : syncResult ? (
        <>
          <span>✅</span>
          <span>
            {syncResult.success > 0 && `${syncResult.success} Änderung${syncResult.success > 1 ? 'en' : ''} synchronisiert`}
            {syncResult.failed > 0 && syncResult.success > 0 && ', '}
            {syncResult.failed > 0 && `${syncResult.failed} fehlgeschlagen`}
            {syncResult.success === 0 && syncResult.failed === 0 && 'Keine ausstehenden Änderungen'}
          </span>
        </>
      ) : null}
    </div>
  );
}

