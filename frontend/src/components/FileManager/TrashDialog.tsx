import { useEffect, useMemo, useState } from 'react';
import { fileAPI } from '../../services/api';
import type { TrashItem } from '../../types/file';

interface TrashDialogProps {
  isOpen: boolean;
  scope: 'private' | 'shared' | 'all';
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

function getScopeLabel(scope: 'private' | 'shared'): string {
  return scope === 'private' ? 'Meine Notizen' : 'Geteilte Notizen';
}

export default function TrashDialog({ isOpen, scope, onClose, onRestored }: TrashDialogProps) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [isCompact, setIsCompact] = useState<boolean>(() => window.innerWidth < 760);
  const [activeFilter, setActiveFilter] = useState<'all' | 'private' | 'shared'>(
    scope === 'all' ? 'all' : scope
  );

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 760);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setActiveFilter(scope === 'all' ? 'all' : scope);
  }, [scope]);

  const loadTrash = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (scope === 'all') {
        const [privateResult, sharedResult] = await Promise.allSettled([
          fileAPI.listTrash('private'),
          fileAPI.listTrash('shared')
        ]);

        const mergedItems: TrashItem[] = [];
        if (privateResult.status === 'fulfilled') {
          mergedItems.push(...privateResult.value.items);
        }
        if (sharedResult.status === 'fulfilled') {
          mergedItems.push(...sharedResult.value.items);
        }

        mergedItems.sort((a, b) => {
          const left = new Date(b.deletedAt).getTime();
          const right = new Date(a.deletedAt).getTime();
          return left - right;
        });
        setItems(mergedItems);

        if (privateResult.status === 'rejected' && sharedResult.status === 'rejected') {
          setError('Papierkorb konnte nicht geladen werden');
        } else if (privateResult.status === 'rejected') {
          setError('Nur geteilte Eintraege konnten geladen werden');
        } else if (sharedResult.status === 'rejected') {
          setError('Nur private Eintraege konnten geladen werden');
        }
      } else {
        const response = await fileAPI.listTrash(scope);
        setItems(response.items);
      }
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
  }, [isOpen, scope]);

  const filteredItems = useMemo(() => (
    activeFilter === 'all'
      ? items
      : items.filter((item) => item.type === activeFilter)
  ), [activeFilter, items]);

  const counts = useMemo(() => ({
    all: items.length,
    private: items.filter((item) => item.type === 'private').length,
    shared: items.filter((item) => item.type === 'shared').length
  }), [items]);

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
          width: 'min(980px, 100%)',
          maxHeight: '85vh',
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

        {scope === 'all' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.75rem' }}>
            {([
              ['all', `Alle (${counts.all})`],
              ['private', `Meine (${counts.private})`],
              ['shared', `Geteilte (${counts.shared})`]
            ] as Array<['all' | 'private' | 'shared', string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveFilter(value)}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '999px',
                  padding: '0.3rem 0.65rem',
                  backgroundColor: activeFilter === value ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: activeFilter === value ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

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
        ) : filteredItems.length === 0 ? (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Der Papierkorb ist leer.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '0.7rem', alignItems: 'start' }}>
                  <div style={{ fontSize: '1rem' }}>
                    {item.itemType === 'folder' ? '📁' : '📝'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem', wordBreak: 'break-word' }}>
                      {item.originalPath}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      {getScopeLabel(item.type)} · geloescht: {formatDeletedAt(item.deletedAt)}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.45rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    type="button"
                    disabled={restoringId === item.id || removingId === item.id}
                    onClick={async () => {
                      setRestoringId(item.id);
                      setError(null);
                      try {
                        const response = await fileAPI.restoreTrashItem(item.id, item.type);
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
                      cursor: restoringId === item.id || removingId === item.id ? 'not-allowed' : 'pointer',
                      padding: '0.4rem 0.7rem',
                      fontSize: '0.8rem',
                      opacity: restoringId === item.id || removingId === item.id ? 0.7 : 1,
                      width: isCompact ? '100%' : 'auto'
                    }}
                  >
                    {restoringId === item.id ? 'Stellt her…' : 'Wiederherstellen'}
                  </button>
                  <button
                    type="button"
                    disabled={removingId === item.id || restoringId === item.id}
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Soll "${item.name}" endgueltig aus dem Papierkorb entfernt werden?`
                      );
                      if (!confirmed) {
                        return;
                      }
                      setRemovingId(item.id);
                      setError(null);
                      try {
                        await fileAPI.removeTrashItem(item.id, item.type);
                        await loadTrash();
                      } catch (apiError: any) {
                        setError(apiError?.response?.data?.error || 'Endgueltiges Entfernen fehlgeschlagen');
                      } finally {
                        setRemovingId(null);
                      }
                    }}
                    style={{
                      border: '1px solid var(--error-color)',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: 'var(--error-color)',
                      cursor: restoringId === item.id || removingId === item.id ? 'not-allowed' : 'pointer',
                      padding: '0.4rem 0.7rem',
                      fontSize: '0.8rem',
                      opacity: restoringId === item.id || removingId === item.id ? 0.7 : 1,
                      width: isCompact ? '100%' : 'auto'
                    }}
                  >
                    {removingId === item.id ? 'Entfernt…' : 'Endgueltig entfernen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
