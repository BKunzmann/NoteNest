/**
 * FileTree Komponente
 * 
 * Zeigt Ordnerstruktur für private oder geteilte Notizen
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileStore } from '../../store/fileStore';
import { fileAPI, settingsAPI } from '../../services/api';
import { FileItem as FileItemType } from '../../types/file';
import FileItem from './FileItem';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import FileActionDialog from './FileActionDialog';
import ContextMenu, { ContextMenuAction } from './ContextMenu';
import { formatRecentDate, groupFilesByRecent } from '../../utils/recentGrouping';

interface FileTreeProps {
  type: 'private' | 'shared';
  title: string;
  icon: string;
  onFileSelect?: () => void; // Callback wenn eine Datei ausgewählt wird (für mobile Sidebar-Schließen)
}

interface ContextState {
  file: FileItemType;
  path: string;
  x: number;
  y: number;
}

function getParentPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/\/+/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return '/';
  }
  return `/${segments.slice(0, -1).join('/')}`;
}

export default function FileTree({ type, title, icon, onFileSelect }: FileTreeProps) {
  const navigate = useNavigate();
  const { 
    privateFiles, 
    privatePath, 
    sharedFiles, 
    sharedPath,
    loadFiles,
    selectFile,
    deleteItem,
    isLoading,
    privateError,
    sharedError,
    selectedPath,
    selectedType
  } = useFileStore();
  
  const [showOnlyNotes, setShowOnlyNotes] = useState(false);
  const [sidebarViewMode, setSidebarViewMode] = useState<'recent' | 'folders'>('recent');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [recentFiles, setRecentFiles] = useState<FileItemType[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContextState | null>(null);
  const [moveTarget, setMoveTarget] = useState<ContextState | null>(null);
  const [copyTarget, setCopyTarget] = useState<ContextState | null>(null);
  const recentLongPressTimerRef = useRef<number | null>(null);
  const suppressRecentClickRef = useRef(false);
  
  const error = type === 'private' ? privateError : sharedError;

  const allFiles = type === 'private' ? privateFiles : sharedFiles;
  const currentPath = type === 'private' ? privatePath : sharedPath;

  // Lade Einstellung beim Mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsAPI.getSettings();
        setShowOnlyNotes(settings.show_only_notes || false);
        setSidebarViewMode(settings.sidebar_view_mode || 'recent');
      } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error);
        setShowOnlyNotes(false);
        setSidebarViewMode('recent');
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  const refreshRecentFiles = useCallback(async (notesOnlyOverride?: boolean) => {
    setIsLoadingRecent(true);
    setRecentError(null);
    try {
      const effectiveNotesOnly = notesOnlyOverride ?? showOnlyNotes;
      const response = await fileAPI.listRecentFiles(type, effectiveNotesOnly, 1000);
      setRecentFiles(response.items);
    } catch (apiError: any) {
      setRecentError(apiError?.response?.data?.error || 'Fehler beim Laden der zuletzt bearbeiteten Notizen');
      setRecentFiles([]);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [showOnlyNotes, type]);

  const files = allFiles;

  const recentGroups = useMemo(() => groupFilesByRecent(recentFiles), [recentFiles]);

  useEffect(() => {
    if (isLoadingSettings) {
      return;
    }
    const state = useFileStore.getState();
    const pathToLoad = type === 'private' ? state.privatePath : state.sharedPath;
    void loadFiles(pathToLoad || '/', type, showOnlyNotes);
  }, [isLoadingSettings, loadFiles, showOnlyNotes, type]);

  useEffect(() => {
    if (isLoadingSettings || sidebarViewMode !== 'recent') {
      return;
    }
    void refreshRecentFiles();
  }, [isLoadingSettings, refreshRecentFiles, sidebarViewMode]);

  const handleFolderClick = (folderPath: string) => {
    void loadFiles(folderPath, type, showOnlyNotes);
  };

  const handleTitleClick = () => {
    // Navigiere zur Notes-Seite, falls nicht bereits dort
    if (window.location.pathname !== '/notes') {
      navigate('/notes');
    }
    // Zurück zum Root
    void loadFiles('/', type, showOnlyNotes);
  };

  const openFile = useCallback((file: FileItemType, filePath: string) => {
    if (window.location.pathname !== '/notes') {
      navigate('/notes');
    }
    selectFile(file, filePath, type);
    if (onFileSelect) {
      setTimeout(() => onFileSelect(), 100);
    }
  }, [navigate, onFileSelect, selectFile, type]);

  const openContextMenu = (file: FileItemType, filePath: string, x: number, y: number) => {
    setContextMenu({
      file,
      path: filePath,
      x,
      y
    });
  };

  const clearRecentLongPress = () => {
    if (recentLongPressTimerRef.current !== null) {
      window.clearTimeout(recentLongPressTimerRef.current);
      recentLongPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (recentLongPressTimerRef.current !== null) {
        window.clearTimeout(recentLongPressTimerRef.current);
        recentLongPressTimerRef.current = null;
      }
    };
  }, []);

  const handleRecentTouchStart = (event: React.TouchEvent, file: FileItemType) => {
    if (event.touches.length === 0) {
      return;
    }
    clearRecentLongPress();
    const touch = event.touches[0];
    recentLongPressTimerRef.current = window.setTimeout(() => {
      openContextMenu(file, file.path, touch.clientX, touch.clientY);
      suppressRecentClickRef.current = true;
      clearRecentLongPress();
    }, 500);
  };

  const handleRecentClick = (file: FileItemType) => {
    if (suppressRecentClickRef.current) {
      suppressRecentClickRef.current = false;
      return;
    }
    openFile(file, file.path);
  };

  const handleToggleSidebarViewMode = async (newMode: 'recent' | 'folders') => {
    if (newMode === sidebarViewMode) {
      return;
    }
    const previousMode = sidebarViewMode;
    setSidebarViewMode(newMode);
    try {
      await settingsAPI.updateSettings({ sidebar_view_mode: newMode });
      window.dispatchEvent(new CustomEvent('notenest:settings-changed', {
        detail: { sidebar_view_mode: newMode }
      }));
      if (newMode === 'recent') {
        await refreshRecentFiles();
      }
    } catch (apiError) {
      console.error('Fehler beim Speichern der Sidebar-Ansicht:', apiError);
      setSidebarViewMode(previousMode);
    }
  };

  const handleToggleShowOnlyNotes = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !showOnlyNotes;
    setShowOnlyNotes(newValue);
    
    try {
      await settingsAPI.updateSettings({ show_only_notes: newValue });
      window.dispatchEvent(new CustomEvent('notenest:settings-changed', {
        detail: { show_only_notes: newValue }
      }));
      if (sidebarViewMode === 'recent') {
        await refreshRecentFiles(newValue);
      } else {
        await loadFiles(currentPath, type, newValue);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellung:', error);
      // Revert bei Fehler
      setShowOnlyNotes(!newValue);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteItem(deleteTarget.path, type);
      if (sidebarViewMode === 'recent') {
        await refreshRecentFiles();
      } else {
        await loadFiles(currentPath, type, showOnlyNotes);
      }
    } catch (apiError) {
      console.error('Löschen fehlgeschlagen:', apiError);
    } finally {
      setDeleteTarget(null);
    }
  };

  const menuActions: ContextMenuAction[] = useMemo(() => {
    if (!contextMenu) {
      return [];
    }

    const actions: ContextMenuAction[] = [];
    if (contextMenu.file.type === 'file') {
      actions.push({
        id: 'open',
        label: 'Öffnen',
        onClick: () => openFile(contextMenu.file, contextMenu.path)
      });
    }

    actions.push(
      {
        id: 'copy',
        label: 'Kopieren...',
        onClick: () => setCopyTarget(contextMenu)
      },
      {
        id: 'move',
        label: 'Verschieben...',
        onClick: () => setMoveTarget(contextMenu)
      },
      {
        id: 'delete',
        label: 'Löschen',
        onClick: () => setDeleteTarget(contextMenu),
        destructive: true
      }
    );

    return actions;
  }, [contextMenu, openFile]);

  return (
    <div style={{ padding: '1rem', position: 'relative' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div 
            onClick={handleTitleClick}
            style={{
              fontSize: '0.875rem',
              fontWeight: 'bold',
              color: '#666',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Zum Hauptordner zurückkehren"
          >
            <span>{icon}</span>
            <span>{title}</span>
          </div>

          {!isLoadingSettings && (
            <div style={{
              display: 'inline-flex',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <button
                type="button"
                onClick={() => void handleToggleSidebarViewMode('recent')}
                style={{
                  border: 'none',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  backgroundColor: sidebarViewMode === 'recent' ? 'var(--accent-color)' : 'transparent',
                  color: sidebarViewMode === 'recent' ? '#fff' : 'var(--text-secondary)'
                }}
                title="Zuletzt bearbeitet"
              >
                Zuletzt
              </button>
              <button
                type="button"
                onClick={() => void handleToggleSidebarViewMode('folders')}
                style={{
                  border: 'none',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  backgroundColor: sidebarViewMode === 'folders' ? 'var(--accent-color)' : 'transparent',
                  color: sidebarViewMode === 'folders' ? '#fff' : 'var(--text-secondary)'
                }}
                title="Ordneransicht"
              >
                Ordner
              </button>
            </div>
          )}
        </div>
        
        {/* Toggle für Notizen/alle Dateien */}
        {!isLoadingSettings && (
          <div
            onClick={handleToggleShowOnlyNotes}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#666',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={showOnlyNotes ? 'Zeige alle Dateien' : 'Zeige nur Notizen (Markdown + TXT)'}
          >
            <div
              style={{
                width: '32px',
                height: '18px',
                borderRadius: '9px',
                backgroundColor: showOnlyNotes ? '#4CAF50' : '#ccc',
                position: 'relative',
                transition: 'background-color 0.2s',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: showOnlyNotes ? '16px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              />
            </div>
            <span>{showOnlyNotes ? 'Nur Notizen' : 'Alle Dateien'}</span>
          </div>
        )}
      </div>
      
      {/* Pfad-Navigation (Ordneransicht) */}
      {sidebarViewMode === 'folders' && (
        <div style={{
          fontSize: '0.75rem',
          color: '#999',
          marginBottom: '0.5rem',
          padding: '0.25rem 0.5rem',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void loadFiles('/', type, showOnlyNotes)}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.2rem 0.45rem',
                backgroundColor: currentPath === '/' ? 'var(--accent-color)' : 'var(--bg-primary)',
                color: currentPath === '/' ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.72rem'
              }}
            >
              Start
            </button>

            {currentPath !== '/' && (
              <button
                type="button"
                onClick={() => void loadFiles(getParentPath(currentPath), type, showOnlyNotes)}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.2rem 0.45rem',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.72rem'
                }}
              >
                ↑ Zurück
              </button>
            )}

            {currentPath.split('/').filter(Boolean).map((segment, index, allSegments) => {
              const segmentPath = `/${allSegments.slice(0, index + 1).join('/')}`;
              const isActive = segmentPath === currentPath;
              return (
                <button
                  key={segmentPath}
                  type="button"
                  onClick={() => void loadFiles(segmentPath, type, showOnlyNotes)}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.2rem 0.45rem',
                    backgroundColor: isActive ? 'var(--accent-color)' : 'var(--bg-primary)',
                    color: isActive ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.72rem'
                  }}
                >
                  {segment}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          fontSize: '0.75rem',
          color: '#c33',
          marginBottom: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#fee',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {sidebarViewMode === 'recent' ? (
        <>
          {recentError && (
            <div style={{
              fontSize: '0.75rem',
              color: '#c33',
              marginBottom: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#fee',
              borderRadius: '4px'
            }}>
              {recentError}
            </div>
          )}

          {isLoadingRecent ? (
            <div style={{ fontSize: '0.875rem', color: '#999', fontStyle: 'italic' }}>
              Lädt...
            </div>
          ) : recentGroups.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: '#999', fontStyle: 'italic' }}>
              Keine zuletzt bearbeiteten {type === 'private' ? 'Notizen' : 'geteilten Notizen'} vorhanden
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentGroups.map((group) => (
                <section key={group.key}>
                  <h4 style={{
                    fontSize: '1rem',
                    marginBottom: '0.35rem',
                    color: 'var(--text-primary)'
                  }}>
                    {group.label}
                  </h4>

                  <div style={{
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)'
                  }}>
                    {group.items.map((file, index) => {
                      const isSelected = selectedType === type && selectedPath === file.path;
                      return (
                        <div
                          key={`${file.path}-${group.key}`}
                          onClick={() => handleRecentClick(file)}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            openContextMenu(file, file.path, event.clientX, event.clientY);
                          }}
                          onTouchStart={(event) => handleRecentTouchStart(event, file)}
                          onTouchEnd={clearRecentLongPress}
                          onTouchMove={clearRecentLongPress}
                          onTouchCancel={clearRecentLongPress}
                          style={{
                            padding: '0.65rem 0.8rem',
                            borderBottom: index < group.items.length - 1 ? '1px solid var(--border-color)' : 'none',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(10, 132, 255, 0.15)' : 'transparent'
                          }}
                        >
                          <div style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '0.15rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {file.name}
                          </div>
                          <div style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {formatRecentDate(file.lastModified)} · {getParentPath(file.path)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        isLoading ? (
          <div style={{ fontSize: '0.875rem', color: '#999', fontStyle: 'italic' }}>
            Lädt...
          </div>
        ) : files.length === 0 ? (
          <div style={{ fontSize: '0.875rem', color: '#999', fontStyle: 'italic' }}>
            Keine {type === 'private' ? 'Notizen' : 'geteilten Notizen'} vorhanden
          </div>
        ) : (
          <div>
            {files.map((file) => (
              <FileItem
                key={file.path}
                file={file}
                type={type}
                currentPath={currentPath}
                onFolderClick={handleFolderClick}
                onFileSelect={onFileSelect}
                onContextRequest={(payload) => openContextMenu(payload.file, payload.path, payload.x, payload.y)}
              />
            ))}
          </div>
        )
      )}

      <ContextMenu
        isOpen={contextMenu !== null}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        actions={menuActions}
        onClose={() => setContextMenu(null)}
      />

      {deleteTarget && (
        <DeleteConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
          itemName={deleteTarget.file.name}
          itemType={deleteTarget.file.type}
        />
      )}

      {moveTarget && (
        <FileActionDialog
          isOpen={true}
          mode="move"
          sourcePath={moveTarget.path}
          sourceType={type}
          sourceName={moveTarget.file.name}
          sourceItemType={moveTarget.file.type}
          onClose={() => setMoveTarget(null)}
          onSuccess={() => {
            void loadFiles(currentPath, type, showOnlyNotes);
            void refreshRecentFiles();
          }}
        />
      )}

      {copyTarget && (
        <FileActionDialog
          isOpen={true}
          mode="copy"
          sourcePath={copyTarget.path}
          sourceType={type}
          sourceName={copyTarget.file.name}
          sourceItemType={copyTarget.file.type}
          onClose={() => setCopyTarget(null)}
          onSuccess={() => {
            void loadFiles(currentPath, type, showOnlyNotes);
            void refreshRecentFiles();
          }}
        />
      )}
    </div>
  );
}

