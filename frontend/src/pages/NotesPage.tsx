/**
 * Notes Page
 * 
 * Hauptseite für Notizen-Verwaltung
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFileStore } from '../store/fileStore';
import { useEditorStore } from '../store/editorStore';
import MarkdownEditor from '../components/Editor/MarkdownEditor';
import DeleteConfirmDialog from '../components/FileManager/DeleteConfirmDialog';
import FileActionDialog from '../components/FileManager/FileActionDialog';
import ContextMenu, { ContextMenuAction } from '../components/FileManager/ContextMenu';
import CreateFileDialog from '../components/FileManager/CreateFileDialog';
import { settingsAPI } from '../services/api';

function normalizeFolderPath(inputPath: string): string {
  let normalized = inputPath.trim() || '/';
  normalized = normalized.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized || '/';
}

export default function NotesPage() {
  const params = useParams<{ type?: 'private' | 'shared'; path?: string }>();
  const navigate = useNavigate();
  const { 
    selectedFile, 
    selectedPath, 
    selectedType,
    fileContent, 
    isLoadingContent,
    loadFileContent,
    selectFile,
    clearSelection,
    deleteItem
  } = useFileStore();
  const { reset: resetEditor } = useEditorStore();
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showQuickCreateDialog, setShowQuickCreateDialog] = useState(false);
  const [quickCreateTarget, setQuickCreateTarget] = useState<{ type: 'private' | 'shared'; path: string }>({
    type: 'private',
    path: '/'
  });
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);

  // Lade Datei aus URL-Parametern, wenn vorhanden
  useEffect(() => {
    if (params.type && params.path) {
      try {
        // Decodiere den Pfad aus der URL
        // params.path ist bereits decodiert von React Router, aber wir müssen sicherstellen, dass es mit / beginnt
        let decodedPath = params.path;
        
        // Stelle sicher, dass der Pfad mit / beginnt
        if (!decodedPath.startsWith('/')) {
          decodedPath = '/' + decodedPath;
        }
        
        // Normalisiere den Pfad (entferne doppelte Slashes)
        decodedPath = decodedPath.replace(/\/+/g, '/');
        
        console.log('Loading file from URL:', { 
          urlPath: params.path, 
          decodedPath, 
          type: params.type,
          currentSelectedPath: selectedPath,
          currentSelectedType: selectedType
        });
        
        // Prüfe, ob die Datei bereits geladen ist
        if (selectedPath !== decodedPath || selectedType !== params.type) {
          // Lade Datei-Inhalt
          loadFileContent(decodedPath, params.type);
          
          // Erstelle FileItem-Objekt für selectFile
          const fileName = decodedPath.split('/').pop() || decodedPath;
          const fileItem = {
            name: fileName,
            path: decodedPath,
            type: 'file' as const,
            isEditable: true,
            canRead: true,
            canWrite: true
          };
          
          selectFile(fileItem, decodedPath, params.type);
        }
      } catch (error) {
        console.error('Error loading file from URL:', error);
      }
    }
  }, [params.type, params.path, selectedPath, selectedType, loadFileContent, selectFile]);

  // Beim Mount: Lösche Auswahl NICHT automatisch
  // useEffect(() => {
  //   clearSelection();
  //   resetEditor();
  // }, [clearSelection, resetEditor]);

  const handleStartNewNote = async () => {
    try {
      const settings = await settingsAPI.getSettings();
      setQuickCreateTarget({
        type: settings.default_note_type || 'private',
        path: normalizeFolderPath(settings.default_note_folder_path || '/')
      });
    } catch (error) {
      console.error('Fehler beim Laden der Standardablage:', error);
      setQuickCreateTarget({ type: 'private', path: '/' });
    } finally {
      setShowQuickCreateDialog(true);
    }
  };

  if (!selectedFile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#999'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
        <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          Wähle eine Notiz aus
        </div>
        <div style={{ fontSize: '0.875rem' }}>
          Klicke auf eine Datei in der Sidebar, um sie zu öffnen
        </div>

        <button
          type="button"
          onClick={() => void handleStartNewNote()}
          style={{
            marginTop: '1.5rem',
            border: 'none',
            backgroundColor: 'var(--accent-color)',
            color: '#fff',
            borderRadius: '8px',
            padding: '0.7rem 1rem',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Neue Notiz im Standardordner
        </button>

        {showQuickCreateDialog && (
          <CreateFileDialog
            isOpen={showQuickCreateDialog}
            onClose={() => setShowQuickCreateDialog(false)}
            type="file"
            initialFolderType={quickCreateTarget.type}
            initialPath={quickCreateTarget.path}
            allowTargetSelection={true}
            onCreated={(created) => {
              selectFile(
                {
                  name: created.name,
                  path: created.path,
                  type: 'file',
                  fileType: 'md',
                  isEditable: true,
                  canRead: true,
                  canWrite: true
                },
                created.path,
                created.type
              );
              navigate('/notes');
            }}
          />
        )}
      </div>
    );
  }

  if (isLoadingContent) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#999'
      }}>
        <div>Lädt Datei...</div>
      </div>
    );
  }

  if ((fileContent === null || fileContent === undefined) && selectedFile.type === 'file') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#999'
      }}>
        <div>Datei konnte nicht geladen werden</div>
      </div>
    );
  }

  // Funktion zum Schließen der Notiz
  const handleCloseNote = () => {
    clearSelection();
    resetEditor();
    // Navigiere zur Basis-Notes-Seite (ohne Parameter)
    navigate('/notes');
  };

  const closeContextMenu = () => {
    setContextPosition(null);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openContextMenu = (x: number, y: number) => {
    if (!selectedFile || !selectedPath || !selectedType) {
      return;
    }
    setContextPosition({ x, y });
  };

  const handleHeaderContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    openContextMenu(event.clientX, event.clientY);
  };

  const handleHeaderTouchStart = (event: React.TouchEvent) => {
    if (!selectedFile || !selectedPath || !selectedType || event.touches.length === 0) {
      return;
    }
    clearLongPress();
    const touch = event.touches[0];
    longPressTimerRef.current = window.setTimeout(() => {
      openContextMenu(touch.clientX, touch.clientY);
      clearLongPress();
    }, 500);
  };

  const handleDeleteSelected = async () => {
    if (!selectedPath || !selectedType || !selectedFile) {
      return;
    }
    try {
      await deleteItem(selectedPath, selectedType);
      clearSelection();
      resetEditor();
      navigate('/notes');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const noteMenuActions: ContextMenuAction[] = (!selectedFile || !selectedPath || !selectedType)
    ? []
    : [
      {
        id: 'copy-note',
        label: 'Kopieren...',
        onClick: () => setShowCopyDialog(true)
      },
      {
        id: 'move-note',
        label: 'Verschieben...',
        onClick: () => setShowMoveDialog(true)
      },
      {
        id: 'delete-note',
        label: 'Löschen',
        onClick: () => setShowDeleteDialog(true),
        destructive: true
      }
    ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}
      onContextMenu={handleHeaderContextMenu}
      onTouchStart={handleHeaderTouchStart}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onTouchCancel={clearLongPress}
      >
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            {selectedFile.name}
          </h2>
          {selectedPath && (
            <div style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)', 
              marginTop: '0.25rem' 
            }}>
              {selectedPath}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              openContextMenu(rect.left, rect.bottom + 6);
            }}
            title="Dateiaktionen"
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '36px',
              minHeight: '36px',
              transition: 'all 0.2s ease'
            }}
          >
            ⋯
          </button>

          {/* Schließen-Button */}
          <button
            onClick={handleCloseNote}
            title="Notiz schließen"
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '36px',
              minHeight: '36px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f0f0f0)';
              e.currentTarget.style.borderColor = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {selectedFile.type === 'file' && selectedPath && selectedType && 
         (selectedFile.isEditable === true || (selectedFile.fileType === 'md' || selectedFile.fileType === 'txt')) ? (
          isLoadingContent ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)'
            }}>
              Lädt Datei...
            </div>
          ) : fileContent !== null && fileContent !== undefined ? (
            <MarkdownEditor 
              filePath={selectedPath} 
              fileType={selectedType}
            />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)'
            }}>
              Datei konnte nicht geladen werden
            </div>
          )
        ) : selectedFile.type === 'file' && fileContent ? (
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '1rem'
          }}>
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              margin: 0
            }}>
              {fileContent}
            </pre>
          </div>
        ) : (
          <div style={{ 
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)'
          }}>
            {selectedFile.type === 'file' && !selectedFile.isEditable 
              ? 'Diese Datei kann nicht bearbeitet werden'
              : 'Ordner-Inhalt wird hier angezeigt'}
          </div>
        )}
      </div>

      <ContextMenu
        isOpen={contextPosition !== null}
        x={contextPosition?.x || 0}
        y={contextPosition?.y || 0}
        actions={noteMenuActions}
        onClose={closeContextMenu}
      />

      {showDeleteDialog && selectedFile && (
        <DeleteConfirmDialog
          isOpen={true}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => void handleDeleteSelected()}
          itemName={selectedFile.name}
          itemType={selectedFile.type}
        />
      )}

      {showMoveDialog && selectedPath && selectedType && selectedFile && (
        <FileActionDialog
          isOpen={true}
          mode="move"
          sourcePath={selectedPath}
          sourceType={selectedType}
          sourceName={selectedFile.name}
          sourceItemType={selectedFile.type}
          onClose={() => setShowMoveDialog(false)}
        />
      )}

      {showCopyDialog && selectedPath && selectedType && selectedFile && (
        <FileActionDialog
          isOpen={true}
          mode="copy"
          sourcePath={selectedPath}
          sourceType={selectedType}
          sourceName={selectedFile.name}
          sourceItemType={selectedFile.type}
          onClose={() => setShowCopyDialog(false)}
        />
      )}
    </div>
  );
}

