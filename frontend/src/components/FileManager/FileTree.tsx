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
import CreateFileDialog from './CreateFileDialog';
import ContextMenu, { ContextMenuAction } from './ContextMenu';
import { formatRecentDate, groupFilesByRecent } from '../../utils/recentGrouping';

interface FileTreeProps {
  type: 'private' | 'shared';
  title: string;
  icon: string;
  onFileSelect?: () => void; // Callback wenn eine Datei ausgewählt wird (für mobile Sidebar-Schließen)
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
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

function buildChildPath(parentPath: string, name: string): string {
  const normalizedParent = parentPath === '/' ? '/' : parentPath.replace(/\/+$/, '');
  const cleanName = name.replace(/[\\/]/g, '').trim();
  if (!cleanName) {
    return normalizedParent;
  }
  return normalizedParent === '/' ? `/${cleanName}` : `${normalizedParent}/${cleanName}`;
}

function isNoteOrFolder(item: FileItemType): boolean {
  if (item.type === 'folder') {
    return true;
  }
  const resolvedType = (item.fileType || item.name.split('.').pop() || '').toLowerCase();
  return resolvedType === 'md' || resolvedType === 'txt';
}

export default function FileTree({
  type,
  title,
  icon,
  onFileSelect,
  isCollapsed = false,
  onToggleCollapsed
}: FileTreeProps) {
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
    selectedFile,
    selectedPath,
    selectedType
  } = useFileStore();
  
  const [showOnlyNotes, setShowOnlyNotes] = useState(true);
  const [nonEditableFilesMode, setNonEditableFilesMode] = useState<'gray' | 'hide'>('gray');
  const [sidebarViewMode, setSidebarViewMode] = useState<'recent' | 'folders'>('recent');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [recentFiles, setRecentFiles] = useState<FileItemType[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState<{ totalFiles: number; totalNotes: number } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContextState | null>(null);
  const [moveTarget, setMoveTarget] = useState<ContextState | null>(null);
  const [copyTarget, setCopyTarget] = useState<ContextState | null>(null);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [createFolderInitialPath, setCreateFolderInitialPath] = useState('/');
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [expandedRecentGroups, setExpandedRecentGroups] = useState<Set<string>>(new Set());
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
        setShowOnlyNotes(settings.show_only_notes ?? true);
        setSidebarViewMode(settings.sidebar_view_mode || 'recent');
        setNonEditableFilesMode(settings.non_editable_files_mode || 'gray');
      } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error);
        setShowOnlyNotes(true);
        setSidebarViewMode('recent');
        setNonEditableFilesMode('gray');
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const handleSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as Partial<{
        show_only_notes: boolean;
        sidebar_view_mode: 'recent' | 'folders';
        non_editable_files_mode: 'gray' | 'hide';
      }> | undefined;

      if (!detail) {
        return;
      }

      if (typeof detail.show_only_notes === 'boolean') {
        setShowOnlyNotes(detail.show_only_notes);
      }
      if (detail.sidebar_view_mode === 'recent' || detail.sidebar_view_mode === 'folders') {
        setSidebarViewMode(detail.sidebar_view_mode);
      }
      if (detail.non_editable_files_mode === 'gray' || detail.non_editable_files_mode === 'hide') {
        setNonEditableFilesMode(detail.non_editable_files_mode);
      }
    };

    window.addEventListener('notenest:settings-changed', handleSettingsChanged as EventListener);
    return () => window.removeEventListener('notenest:settings-changed', handleSettingsChanged as EventListener);
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

  const refreshFileStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const stats = await fileAPI.getFileStats(type);
      setFileStats({ totalFiles: stats.totalFiles, totalNotes: stats.totalNotes });
    } catch (statsError) {
      console.error('Fehler beim Laden der Dateistatistik:', statsError);
      setFileStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [type]);

  const files = useMemo(() => {
    let next = allFiles;
    if (showOnlyNotes) {
      next = next.filter(isNoteOrFolder);
    }
    if (nonEditableFilesMode === 'hide') {
      next = next.filter((file) => file.type === 'folder' || file.isEditable !== false);
    }
    const query = sidebarFilter.trim().toLowerCase();
    if (query) {
      next = next.filter((file) =>
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query)
      );
    }
    return next;
  }, [allFiles, nonEditableFilesMode, showOnlyNotes, sidebarFilter]);

  const filteredRecentFiles = useMemo(() => {
    let next = recentFiles;
    if (showOnlyNotes) {
      next = next.filter(isNoteOrFolder);
    }
    if (nonEditableFilesMode === 'hide') {
      next = next.filter((file) => file.type === 'folder' || file.isEditable !== false);
    }
    const query = sidebarFilter.trim().toLowerCase();
    if (query) {
      next = next.filter((file) =>
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query)
      );
    }
    return next;
  }, [nonEditableFilesMode, recentFiles, showOnlyNotes, sidebarFilter]);

  const recentGroups = useMemo(() => groupFilesByRecent(filteredRecentFiles), [filteredRecentFiles]);

  useEffect(() => {
    if (sidebarViewMode !== 'recent') {
      return;
    }

    setExpandedRecentGroups((previous) => {
      const availableKeys = new Set(recentGroups.map((group) => group.key));
      const next = new Set<string>();
      for (const key of previous) {
        if (availableKeys.has(key as any)) {
          next.add(key);
        }
      }

      if (next.size === 0 && recentGroups.length > 0) {
        next.add(recentGroups[0].key);
      }

      return next;
    });
  }, [recentGroups, sidebarViewMode]);

  useEffect(() => {
    if (isLoadingSettings) {
      return;
    }
    const state = useFileStore.getState();
    const pathToLoad = type === 'private' ? state.privatePath : state.sharedPath;
    void loadFiles(pathToLoad || '/', type, showOnlyNotes);
    void refreshFileStats();
  }, [isLoadingSettings, loadFiles, refreshFileStats, showOnlyNotes, type]);

  useEffect(() => {
    if (isLoadingSettings || sidebarViewMode !== 'recent') {
      return;
    }
    void refreshRecentFiles();
  }, [isLoadingSettings, refreshRecentFiles, sidebarViewMode]);

  useEffect(() => {
    const handleFilesChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as Partial<{
        type: 'private' | 'shared';
        path: string;
      }> | undefined;

      if (detail?.type && detail.type !== type) {
        return;
      }

      if (sidebarViewMode === 'recent') {
        void refreshRecentFiles();
      } else {
        void loadFiles(currentPath, type, showOnlyNotes);
      }
      void refreshFileStats();
    };

    const handleRevealInSidebar = (event: Event) => {
      const detail = (event as CustomEvent).detail as Partial<{
        type: 'private' | 'shared';
        path: string;
      }> | undefined;

      if (!detail || detail.type !== type || !detail.path) {
        return;
      }

      const targetFolder = getParentPath(detail.path);
      setSidebarViewMode('folders');
      void loadFiles(targetFolder, type, showOnlyNotes);
    };

    window.addEventListener('notenest:files-changed', handleFilesChanged as EventListener);
    window.addEventListener('notenest:reveal-file-in-sidebar', handleRevealInSidebar as EventListener);
    return () => {
      window.removeEventListener('notenest:files-changed', handleFilesChanged as EventListener);
      window.removeEventListener('notenest:reveal-file-in-sidebar', handleRevealInSidebar as EventListener);
    };
  }, [currentPath, loadFiles, refreshFileStats, refreshRecentFiles, showOnlyNotes, sidebarViewMode, type]);

  const handleFolderClick = (folderPath: string) => {
    void loadFiles(folderPath, type, showOnlyNotes);
  };

  const handleTitleClick = () => {
    if (onToggleCollapsed) {
      onToggleCollapsed();
      return;
    }

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
      await refreshFileStats();
      window.dispatchEvent(new CustomEvent('notenest:files-changed', {
        detail: {
          type,
          path: getParentPath(deleteTarget.path)
        }
      }));
    } catch (apiError) {
      console.error('Löschen fehlgeschlagen:', apiError);
    } finally {
      setDeleteTarget(null);
    }
  };

  const resolveCreateBasePath = useCallback(() => {
    if (selectedType === type && selectedPath) {
      if (selectedFile?.type === 'file') {
        return getParentPath(selectedPath);
      }
      return selectedPath;
    }
    return currentPath || '/';
  }, [currentPath, selectedFile?.type, selectedPath, selectedType, type]);

  const handleQuickCreateNote = async () => {
    const targetFolder = resolveCreateBasePath();
    const timestamp = new Date()
      .toISOString()
      .replace('T', ' ')
      .replace(/:/g, '-')
      .slice(0, 16);
    const suggestedName = `Neue Notiz ${timestamp}.md`;
    const targetPath = buildChildPath(targetFolder, suggestedName);

    try {
      await fileAPI.createFile({
        path: targetPath,
        content: '# ',
        type
      });

      handleCreated({
        path: targetPath,
        type,
        name: suggestedName
      });
    } catch (error) {
      console.error('Fehler beim direkten Erstellen einer Notiz:', error);
    }
  };

  const handleCreated = (created: { path: string; type: 'private' | 'shared'; name: string }) => {
    const parentPath = getParentPath(created.path);
    void loadFiles(parentPath, created.type, showOnlyNotes);
    void refreshFileStats();
    window.dispatchEvent(new CustomEvent('notenest:files-changed', {
      detail: {
        type: created.type,
        path: parentPath
      }
    }));

    if (created.type === type) {
      setSidebarViewMode('folders');
    }

    if (created.type === type && created.name.toLowerCase().endsWith('.md')) {
      openFile(
        {
          name: created.name,
          path: created.path,
          type: 'file',
          fileType: 'md',
          isEditable: true
        },
        created.path
      );
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
            title={onToggleCollapsed ? 'Bereich ein-/ausklappen' : 'Zum Hauptordner zurückkehren'}
          >
            <span>{icon}</span>
            <span>{title}</span>
            {onToggleCollapsed && (
              <span style={{ marginLeft: '0.15rem', fontSize: '0.8rem' }}>
                {isCollapsed ? '▸' : '▾'}
              </span>
            )}
          </div>

          {!isLoadingSettings && !isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => {
                  setCreateFolderInitialPath(resolveCreateBasePath());
                  setShowCreateFolderDialog(true);
                }}
                title="Neuen Ordner erstellen"
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.35rem 0.6rem',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
              >
                + Ordner
              </button>
              <button
                type="button"
                onClick={() => void handleQuickCreateNote()}
                title="Neue Notiz erstellen"
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.35rem 0.6rem',
                  backgroundColor: 'var(--accent-color)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
              >
                + Notiz
              </button>

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
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.75rem',
                  minWidth: '74px',
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
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.75rem',
                  minWidth: '74px',
                  cursor: 'pointer',
                  backgroundColor: sidebarViewMode === 'folders' ? 'var(--accent-color)' : 'transparent',
                  color: sidebarViewMode === 'folders' ? '#fff' : 'var(--text-secondary)'
                }}
                title="Ordneransicht"
              >
                Ordner
              </button>
              </div>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <>
            {!isLoadingSettings && (
              <div style={{ marginBottom: '0.35rem', position: 'relative' }}>
                <input
                  type="text"
                  value={sidebarFilter}
                  onChange={(event) => setSidebarFilter(event.target.value)}
                  placeholder="In Sidebar filtern..."
                  style={{
                    width: '100%',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.42rem 2rem 0.42rem 0.6rem',
                    fontSize: '0.76rem',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '0.55rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)'
                }}>
                  {sidebarFilter ? '⨯' : '🔍'}
                </span>
                {sidebarFilter && (
                  <button
                    type="button"
                    onClick={() => setSidebarFilter('')}
                    style={{
                      position: 'absolute',
                      right: '0.2rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      width: '1.5rem',
                      height: '1.5rem'
                    }}
                    title="Filter löschen"
                  />
                )}
              </div>
            )}

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

            {!isLoadingSettings && (
              <div style={{
                marginTop: '0.15rem',
                padding: '0 0.5rem',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)'
              }}>
                {isLoadingStats
                  ? 'Gesamt wird berechnet...'
                  : fileStats
                    ? `Gesamt: ${showOnlyNotes ? fileStats.totalNotes : fileStats.totalFiles} ${showOnlyNotes ? 'Notizen' : 'Dokumente'}`
                    : ''}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Pfad-Navigation (Ordneransicht) */}
      {!isCollapsed && sidebarViewMode === 'folders' && (
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

      {!isCollapsed && error && (
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

      {!isCollapsed && (sidebarViewMode === 'recent' ? (
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
              {sidebarFilter.trim()
                ? 'Keine Treffer für den Sidebar-Filter'
                : `Keine zuletzt bearbeiteten ${type === 'private' ? 'Notizen' : 'geteilten Notizen'} vorhanden`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentGroups.map((group) => {
                const isGroupExpanded = expandedRecentGroups.has(group.key);
                return (
                <section key={group.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedRecentGroups((previous) => {
                        const next = new Set(previous);
                        if (next.has(group.key)) {
                          next.delete(group.key);
                        } else {
                          next.add(group.key);
                        }
                        return next;
                      });
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      backgroundColor: 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      marginBottom: '0.35rem',
                      padding: '0.15rem 0.1rem',
                      color: 'var(--text-primary)'
                    }}
                    title="Gruppe auf-/zuklappen"
                  >
                    <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                      {isGroupExpanded ? '▾' : '▸'} {group.label}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '999px',
                      padding: '0.05rem 0.45rem',
                      backgroundColor: 'var(--bg-primary)'
                    }}>
                      {group.items.length}
                    </span>
                  </button>

                  {isGroupExpanded && (
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
                  )}
                </section>
              )})}
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
            {sidebarFilter.trim()
              ? 'Keine Treffer für den Sidebar-Filter'
              : `Keine ${type === 'private' ? 'Notizen' : 'geteilten Notizen'} vorhanden`}
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
      ))}

      {showCreateFolderDialog && (
        <CreateFileDialog
          isOpen={showCreateFolderDialog}
          onClose={() => setShowCreateFolderDialog(false)}
          type="folder"
          initialFolderType={type}
          initialPath={createFolderInitialPath}
          allowTargetSelection={true}
          onCreated={handleCreated}
        />
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
            void refreshFileStats();
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
            void refreshFileStats();
          }}
        />
      )}
    </div>
  );
}

