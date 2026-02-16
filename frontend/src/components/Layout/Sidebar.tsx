/**
 * Sidebar Komponente
 * 
 * Zeigt Ordnerstruktur für private und geteilte Notizen
 */

import FileTree from '../FileManager/FileTree';
import TrashDialog from '../FileManager/TrashDialog';
import { useEffect, useState } from 'react';
import { settingsAPI } from '../../services/api';
import { useFileStore } from '../../store/fileStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
}

function getParentPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/\/+/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return '/';
  }
  return `/${segments.slice(0, -1).join('/')}`;
}

export default function Sidebar({ isOpen, onClose, width }: SidebarProps) {
  const { selectedType } = useFileStore();
  const [hasSharedAccess, setHasSharedAccess] = useState(false);
  const [privateCollapsed, setPrivateCollapsed] = useState(false);
  const [sharedCollapsed, setSharedCollapsed] = useState(false);
  const [sidebarViewMode, setSidebarViewMode] = useState<'recent' | 'folders'>('recent');
  const [showTrashDialog, setShowTrashDialog] = useState(false);

  const activeActionType: 'private' | 'shared' =
    selectedType === 'shared' && hasSharedAccess ? 'shared' : 'private';

  useEffect(() => {
    let mounted = true;

    const loadSharedAccess = async () => {
      try {
        const settings = await settingsAPI.getSettings();
        if (!mounted) {
          return;
        }
        setHasSharedAccess(Boolean(settings.has_shared_access));
        setSidebarViewMode(settings.sidebar_view_mode === 'folders' ? 'folders' : 'recent');
      } catch (error) {
        if (mounted) {
          setHasSharedAccess(false);
          setSidebarViewMode('recent');
        }
      }
    };

    void loadSharedAccess();

    const handleSettingsChanged = () => {
      void loadSharedAccess();
    };
    window.addEventListener('notenest:settings-changed', handleSettingsChanged as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('notenest:settings-changed', handleSettingsChanged as EventListener);
    };
  }, []);

  const dispatchSidebarAction = (eventName: string) => {
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: {
        type: activeActionType
      }
    }));
  };

  const handleSwitchViewMode = async (nextMode: 'recent' | 'folders') => {
    if (nextMode === sidebarViewMode) {
      return;
    }

    const previousMode = sidebarViewMode;
    setSidebarViewMode(nextMode);
    try {
      await settingsAPI.updateSettings({ sidebar_view_mode: nextMode });
      window.dispatchEvent(new CustomEvent('notenest:settings-changed', {
        detail: { sidebar_view_mode: nextMode }
      }));
    } catch (error) {
      console.error('Fehler beim Speichern der Sidebar-Ansicht:', error);
      setSidebarViewMode(previousMode);
    }
  };

  return (
    <aside style={{
      width: isOpen ? `${width}px` : '0px',
      minWidth: isOpen ? `${width}px` : '0px',
      maxWidth: isOpen ? `${width}px` : '0px',
      backgroundColor: 'var(--bg-secondary, #f8f8f8)',
      borderRight: isOpen ? '1px solid var(--border-color, #e0e0e0)' : 'none',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'width 0.2s ease, min-width 0.2s ease, opacity 0.2s ease'
    }}>
      <div style={{ padding: '0.7rem 0.9rem 0.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap',
            overflowX: 'auto',
            paddingBottom: '0.2rem'
          }}
        >
          <button
            type="button"
            onClick={() => dispatchSidebarAction('notenest:sidebar-create-folder')}
            title={`Neuen Ordner erstellen (${activeActionType === 'private' ? 'Meine Notizen' : 'Geteilte Notizen'})`}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 600,
              flexShrink: 0
            }}
          >
            +Ordner
          </button>
          <button
            type="button"
            onClick={() => dispatchSidebarAction('notenest:sidebar-create-note')}
            title={`Neue Notiz erstellen (${activeActionType === 'private' ? 'Meine Notizen' : 'Geteilte Notizen'})`}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              backgroundColor: 'var(--accent-color)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 600,
              flexShrink: 0
            }}
          >
            +Notiz
          </button>
          <div
            style={{
              display: 'inline-flex',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0
            }}
            role="group"
            aria-label="Sidebar Ansicht"
          >
            <button
              type="button"
              onClick={() => void handleSwitchViewMode('recent')}
              style={{
                border: 'none',
                padding: '0.35rem 0.7rem',
                fontSize: '0.74rem',
                cursor: 'pointer',
                backgroundColor: sidebarViewMode === 'recent' ? 'var(--accent-color)' : 'transparent',
                color: sidebarViewMode === 'recent' ? '#fff' : 'var(--text-secondary)',
                minWidth: '68px'
              }}
              title="Zuletzt bearbeitet"
            >
              Zuletzt
            </button>
            <button
              type="button"
              onClick={() => void handleSwitchViewMode('folders')}
              style={{
                border: 'none',
                padding: '0.35rem 0.7rem',
                fontSize: '0.74rem',
                cursor: 'pointer',
                backgroundColor: sidebarViewMode === 'folders' ? 'var(--accent-color)' : 'transparent',
                color: sidebarViewMode === 'folders' ? '#fff' : 'var(--text-secondary)',
                minWidth: '68px'
              }}
              title="Ordneransicht"
            >
              Ordner
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowTrashDialog(true)}
            title={hasSharedAccess
              ? 'Papierkorb fuer Meine und Geteilte Notizen oeffnen'
              : `Papierkorb öffnen (${activeActionType === 'private' ? 'Meine Notizen' : 'Geteilte Notizen'})`}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 600,
              flexShrink: 0,
              marginLeft: 'auto'
            }}
          >
            🗑 Papierkorb
          </button>
        </div>
      </div>

      {/* Private Ordner */}
      <FileTree 
        type="private" 
        title="Meine Notizen" 
        icon="📁"
        onFileSelect={onClose}
        showSectionActions={false}
        isCollapsed={privateCollapsed}
        onToggleCollapsed={() => setPrivateCollapsed((previous) => !previous)}
      />

      {/* Geteilte Ordner */}
      {hasSharedAccess && (
        <div style={{ borderTop: '1px solid var(--border-color, #e0e0e0)' }}>
          <FileTree 
            type="shared" 
            title="Geteilte Notizen" 
            icon="👥"
            onFileSelect={onClose}
            showSectionActions={false}
            isCollapsed={sharedCollapsed}
            onToggleCollapsed={() => setSharedCollapsed((previous) => !previous)}
          />
        </div>
      )}

      <TrashDialog
        isOpen={showTrashDialog}
        scope={hasSharedAccess ? 'all' : 'private'}
        onClose={() => setShowTrashDialog(false)}
        onRestored={(restored) => {
          window.dispatchEvent(new CustomEvent('notenest:files-changed', {
            detail: {
              type: restored.type,
              path: getParentPath(restored.path)
            }
          }));
        }}
      />
    </aside>
  );
}

