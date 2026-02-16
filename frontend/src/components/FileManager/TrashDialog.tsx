import { useEffect, useState } from 'react';
import { fileAPI } from '../../services/api';
import type { TrashItem } from '../../types/file';

interface TrashDialogProps {
  isOpen: boolean;
  type: 'private' | 'shared';
  onClose: () => void;
  onRestored?: (restored: { path: string; type: 'private' | 'shared'; name: string; itemType: 'file' | 'folder' }) => void;
}

function formatDeletedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

export default function TrashDialog({ isOpen, type, onClose, onRestored }: TrashDialogProps) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const loadTrash = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fileAPI.listTrash(type);
      setItems(response.items);
    } catch (apiError: any) {
      setError(apiError?.response?.data?.error || 'Papierkorb konnte nicht geladen werden');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    void loadTrash();
  }, [isOpen, type]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2200,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(720px, 100%)',
          maxHeight: '80vh',
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.22)',
          padding: '1rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0 }}>Papierkorb</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '0.35rem 0.6rem'
            }}
          >
            Schliessen
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.6rem 0.75rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 59, 48, 0.12)',
            color: 'var(--error-color)',
            marginBottom: '0.75rem',
            fontSize: '0.86rem'
          }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Papierkorb wird geladen…</div>
        ) : items.length === 0 ? (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Der Papierkorb ist leer.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.7rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '1rem' }}>{item.itemType === 'folder' ? '📁' : '📝'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.originalPath}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                    geloescht: {formatDeletedAt(item.deletedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={restoringId === item.id}
                  onClick={async () => {
                    setRestoringId(item.id);
                    setError(null);
                    try {
                      const response = await fileAPI.restoreTrashItem(item.id, type);
                      onRestored?.(response.restored);
                      await loadTrash();
                    } catch (apiError: any) {
                      setError(apiError?.response?.data?.error || 'Wiederherstellung fehlgeschlagen');
                    } finally {
                      setRestoringId(null);
                    }
                  }}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-color)',
                    color: '#fff',
                    cursor: restoringId === item.id ? 'not-allowed' : 'pointer',
                    padding: '0.4rem 0.7rem',
                    fontSize: '0.8rem',
                    opacity: restoringId === item.id ? 0.7 : 1
                  }}
                >
                  {restoringId === item.id ? 'Stellt her…' : 'Wiederherstellen'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
