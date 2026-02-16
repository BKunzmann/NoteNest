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
import { exportAPI, fileAPI, settingsAPI } from '../services/api';

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

function getParentFolderPath(filePath: string): string {
  const normalized = normalizeFolderPath(filePath);
  if (normalized === '/') {
    return '/';
  }
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return '/';
  }
  return `/${parts.slice(0, -1).join('/')}`;
}

function buildFilePath(folderPath: string, name: string): string {
  const normalizedFolder = normalizeFolderPath(folderPath);
  const cleanName = name.replace(/[\\/]/g, '').trim();
  if (!cleanName) {
    return normalizedFolder;
  }
  return normalizedFolder === '/'
    ? `/${cleanName}`
    : `${normalizedFolder}/${cleanName}`;
}

function sanitizeFilenameForWindows(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .trim();
}

function deriveTitleFromFirstLine(content: string): string | null {
  const firstMeaningfulLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstMeaningfulLine) {
    return null;
  }

  const stripped = firstMeaningfulLine.replace(/^#{1,6}\s*/, '').trim();
  if (!stripped) {
    return null;
  }

  const sanitized = sanitizeFilenameForWindows(stripped);
  return sanitized ? sanitized.slice(0, 80) : null;
}

export default function NotesPage() {
  const params = useParams<{ type?: 'private' | 'shared'; path?: string }>();
  const navigate = useNavigate();
  const { 
    selectedFile, 
    selectedPath, 
    selectedType,
    fileContent, 
    fileLastModified,
    fileCreatedAt,
    isLoadingContent,
    loadFileContent,
    selectFile,
    clearSelection,
    deleteItem
  } = useFileStore();
  const { content: editorContent, reset: resetEditor } = useEditorStore();
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const autoRenameTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (autoRenameTimerRef.current !== null) {
        window.clearTimeout(autoRenameTimerRef.current);
        autoRenameTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      !selectedFile ||
      selectedFile.type !== 'file' ||
      !selectedFile.isAutoNaming ||
      !selectedPath ||
      !selectedType
    ) {
      return;
    }

    // Dateiname wird erst synchronisiert, wenn die erste Zeile abgeschlossen wurde.
    if (!editorContent.includes('\n')) {
      return;
    }

    const derivedTitle = deriveTitleFromFirstLine(editorContent);
    if (!derivedTitle) {
      return;
    }

    const extension = selectedFile.name.includes('.')
      ? selectedFile.name.slice(selectedFile.name.lastIndexOf('.'))
      : '.md';
    const nextName = `${derivedTitle}${extension}`;
    if (nextName === selectedFile.name) {
      return;
    }

    if (autoRenameTimerRef.current !== null) {
      window.clearTimeout(autoRenameTimerRef.current);
    }

    const pathAtScheduleTime = selectedPath;
    const typeAtScheduleTime = selectedType;
    const fileSnapshot = selectedFile;
    autoRenameTimerRef.current = window.setTimeout(() => {
      fileAPI.renameFile({
        path: pathAtScheduleTime,
        newName: nextName,
        type: typeAtScheduleTime
      }).then((response) => {
        const activeSelection = useFileStore.getState().selectedPath;
        if (activeSelection !== pathAtScheduleTime) {
          return;
        }

        const fallbackPath = buildFilePath(getParentFolderPath(pathAtScheduleTime), nextName);
        const normalizedNewPath = normalizeFolderPath(response.newPath || fallbackPath);
        selectFile(
          {
            ...fileSnapshot,
            name: nextName,
            path: normalizedNewPath,
            isAutoNaming: true
          },
          normalizedNewPath,
          typeAtScheduleTime
        );

        window.dispatchEvent(new CustomEvent('notenest:files-changed', {
          detail: {
            type: typeAtScheduleTime,
            path: getParentFolderPath(normalizedNewPath)
          }
        }));
      }).catch((error) => {
        console.error('Automatisches Umbenennen fehlgeschlagen:', error);
      });
    }, 1500);

    return () => {
      if (autoRenameTimerRef.current !== null) {
        window.clearTimeout(autoRenameTimerRef.current);
        autoRenameTimerRef.current = null;
      }
    };
  }, [editorContent, selectFile, selectedFile, selectedPath, selectedType]);

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
            canWrite: true,
            isAutoNaming: false
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
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace('T', ' ')
      .replace(/:/g, '-')
      .slice(0, 16);
    const suggestedBaseName = sanitizeFilenameForWindows(`Neue Notiz ${timestamp}`) || `Notiz-${Date.now()}`;

    try {
      const settings = await settingsAPI.getSettings();
      const targetType = (settings.default_note_type === 'shared' && !settings.has_shared_access)
        ? 'private'
        : (settings.default_note_type || 'private');
      const targetFolder = normalizeFolderPath(settings.default_note_folder_path || '/');
      const filePath = buildFilePath(targetFolder, `${suggestedBaseName}.md`);

      await fileAPI.createFile({
        path: filePath,
        content: '# ',
        type: targetType
      });

      selectFile(
        {
          name: `${suggestedBaseName}.md`,
          path: filePath,
          type: 'file',
          fileType: 'md',
          isEditable: true,
          canRead: true,
          canWrite: true,
          isAutoNaming: true
        },
        filePath,
        targetType
      );
      window.dispatchEvent(new CustomEvent('notenest:files-changed', {
        detail: {
          type: targetType,
          path: targetFolder
        }
      }));
      navigate('/notes');
    } catch (error) {
      console.error('Fehler beim Erstellen der Notiz im Standardordner:', error);
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
  const handleCloseNote = async () => {
    const cleanedEditorContent = (editorContent || '')
      .replace(/^#\s*$/gm, '')
      .trim();
    const shouldDeleteEmptyNote = Boolean(
      selectedFile &&
      selectedFile.type === 'file' &&
      selectedPath &&
      selectedType &&
      cleanedEditorContent.length === 0
    );

    if (shouldDeleteEmptyNote && selectedPath && selectedType) {
      try {
        await deleteItem(selectedPath, selectedType);
        window.dispatchEvent(new CustomEvent('notenest:files-changed', {
          detail: {
            type: selectedType,
            path: getParentFolderPath(selectedPath)
          }
        }));
      } catch (error) {
        console.error('Leere Notiz konnte beim Schließen nicht gelöscht werden:', error);
      }
    }

    clearSelection();
    resetEditor();
    // Navigiere zur Basis-Notes-Seite (ohne Parameter)
    navigate('/notes');
    window.dispatchEvent(new CustomEvent('notenest:open-sidebar'));
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

  const toggleContextMenu = (x: number, y: number) => {
    if (contextPosition) {
      setContextPosition(null);
      return;
    }
    openContextMenu(x, y);
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
      window.dispatchEvent(new CustomEvent('notenest:files-changed', {
        detail: {
          type: selectedType,
          path: getParentFolderPath(selectedPath)
        }
      }));
      clearSelection();
      resetEditor();
      navigate('/notes');
      window.dispatchEvent(new CustomEvent('notenest:open-sidebar'));
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleRevealInSidebar = () => {
    if (!selectedPath || !selectedType) {
      return;
    }
    window.dispatchEvent(new CustomEvent('notenest:open-sidebar'));
    window.dispatchEvent(new CustomEvent('notenest:reveal-file-in-sidebar', {
      detail: {
        type: selectedType,
        path: selectedPath
      }
    }));
  };

  const handleRenameSelected = async () => {
    if (!selectedPath || !selectedType || !selectedFile) {
      return;
    }

    const currentName = selectedFile.name;
    const rawName = window.prompt('Neuer Dateiname', currentName);
    if (rawName === null) {
      return;
    }

    const sanitizedInput = sanitizeFilenameForWindows(rawName);
    if (!sanitizedInput) {
      return;
    }

    const currentExt = currentName.includes('.') ? currentName.slice(currentName.lastIndexOf('.')) : '';
    const nextName = currentExt && !sanitizedInput.includes('.')
      ? `${sanitizedInput}${currentExt}`
      : sanitizedInput;

    if (nextName === currentName) {
      return;
    }

    try {
      const response = await fileAPI.renameFile({
        path: selectedPath,
        newName: nextName,
        type: selectedType
      });
      const fallbackNewPath = buildFilePath(getParentFolderPath(selectedPath), nextName);
      const normalizedNewPath = normalizeFolderPath(response.newPath || fallbackNewPath);

      selectFile(
        {
          ...selectedFile,
          name: nextName,
          path: normalizedNewPath,
          isAutoNaming: false
        },
        normalizedNewPath,
        selectedType
      );

      window.dispatchEvent(new CustomEvent('notenest:files-changed', {
        detail: {
          type: selectedType,
          path: getParentFolderPath(normalizedNewPath)
        }
      }));
    } catch (error) {
      console.error('Fehler beim Umbenennen der Datei:', error);
    }
  };

  const formatMetaTimestamp = (iso?: string | null): string | null => {
    if (!iso) {
      return null;
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleString('de-DE');
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!selectedFile || !selectedPath || !selectedType) {
      return;
    }
    try {
      let exportSize: 'A4' | 'A5' = 'A4';
      try {
        const settings = await settingsAPI.getSettings();
        if (settings.default_export_size === 'A5') {
          exportSize = 'A5';
        }
      } catch {
        // Optional: Fallback bleibt A4
      }

      const blob = await exportAPI.exportPDF(selectedPath, selectedType, exportSize);
      downloadBlob(blob, selectedFile.name.replace(/\.(md|txt)$/i, '.pdf'));
    } catch (error) {
      console.error('PDF-Export fehlgeschlagen:', error);
    }
  };

  const handleExportWord = async () => {
    if (!selectedFile || !selectedPath || !selectedType) {
      return;
    }
    try {
      const blob = await exportAPI.exportWord(selectedPath, selectedType);
      downloadBlob(blob, selectedFile.name.replace(/\.(md|txt)$/i, '.docx'));
    } catch (error) {
      console.error('Word-Export fehlgeschlagen:', error);
    }
  };

  const handleExportMarkdown = async () => {
    if (!selectedFile || !selectedPath || !selectedType) {
      return;
    }
    try {
      const response = await fileAPI.getFileContent(selectedPath, selectedType);
      const blob = new Blob([response.content], { type: 'text/markdown;charset=utf-8' });
      downloadBlob(blob, selectedFile.name.replace(/\.(txt)$/i, '.md'));
    } catch (error) {
      console.error('Markdown-Export fehlgeschlagen:', error);
    }
  };

  const createdMetaLabel = `Erstellt am: ${formatMetaTimestamp(fileCreatedAt) || '—'} · von: —`;
  const modifiedMetaLabel = `Zuletzt geändert: ${formatMetaTimestamp(fileLastModified) || '—'} · von: —`;

  const noteMenuActions: ContextMenuAction[] = (!selectedFile || !selectedPath || !selectedType)
    ? []
    : [
      {
        id: 'reveal-note-folder',
        label: 'Ordner in Sidebar öffnen',
        icon: '📂',
        onClick: handleRevealInSidebar
      },
      {
        id: 'rename-note',
        label: 'Umbenennen...',
        icon: '✏️',
        onClick: () => void handleRenameSelected()
      },
      {
        id: 'copy-note',
        label: 'Kopieren...',
        icon: '📄',
        onClick: () => setShowCopyDialog(true)
      },
      {
        id: 'move-note',
        label: 'Verschieben...',
        icon: '↔️',
        onClick: () => setShowMoveDialog(true)
      },
      {
        id: 'separator-export',
        label: '',
        kind: 'separator'
      },
      {
        id: 'export-pdf',
        label: 'Als PDF exportieren',
        icon: '📕',
        onClick: () => void handleExportPDF()
      },
      {
        id: 'export-word',
        label: 'Als Word exportieren',
        icon: '📝',
        onClick: () => void handleExportWord()
      },
      {
        id: 'export-markdown',
        label: 'Als Markdown exportieren',
        icon: '📄',
        onClick: () => void handleExportMarkdown()
      },
      {
        id: 'separator-meta',
        label: '',
        kind: 'separator'
      },
      {
        id: 'created-meta',
        label: createdMetaLabel,
        icon: '🕓',
        kind: 'label'
      },
      {
        id: 'modified-meta',
        label: modifiedMetaLabel,
        icon: '🛠️',
        kind: 'label'
      },
      {
        id: 'separator-delete',
        label: '',
        kind: 'separator'
      },
      {
        id: 'delete-note',
        label: 'Löschen',
        icon: '🗑️',
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
              toggleContextMenu(rect.left, rect.bottom + 6);
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
            onClick={() => void handleCloseNote()}
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
          onSuccess={(result) => {
            window.dispatchEvent(new CustomEvent('notenest:files-changed', {
              detail: {
                type: selectedType,
                path: getParentFolderPath(selectedPath)
              }
            }));

            window.dispatchEvent(new CustomEvent('notenest:files-changed', {
              detail: {
                type: result.destinationType,
                path: getParentFolderPath(result.destinationPath)
              }
            }));

            if (result.itemType === 'file') {
              const nextName = result.destinationPath.split('/').filter(Boolean).pop() || selectedFile.name;
              selectFile(
                {
                  ...selectedFile,
                  name: nextName,
                  path: result.destinationPath,
                  isAutoNaming: false
                },
                result.destinationPath,
                result.destinationType
              );
            }
          }}
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
          onSuccess={(result) => {
            window.dispatchEvent(new CustomEvent('notenest:files-changed', {
              detail: {
                type: selectedType,
                path: getParentFolderPath(selectedPath)
              }
            }));

            window.dispatchEvent(new CustomEvent('notenest:files-changed', {
              detail: {
                type: result.destinationType,
                path: getParentFolderPath(result.destinationPath)
              }
            }));

            if (result.itemType === 'file') {
              const nextName = result.destinationPath.split('/').filter(Boolean).pop() || selectedFile.name;
              selectFile(
                {
                  ...selectedFile,
                  name: nextName,
                  path: result.destinationPath,
                  isAutoNaming: false
                },
                result.destinationPath,
                result.destinationType
              );
            }
          }}
        />
      )}
    </div>
  );
}

