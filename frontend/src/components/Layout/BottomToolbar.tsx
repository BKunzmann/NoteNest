/**
 * Bottom Toolbar Komponente
 * 
 * iPhone-ähnliche Toolbar am unteren Rand
 */

import { useState, useEffect, useRef } from 'react';
import { useFileStore } from '../../store/fileStore';
import { useEditorStore } from '../../store/editorStore';
import CreateFileDialog from '../FileManager/CreateFileDialog';
import DeleteConfirmDialog from '../FileManager/DeleteConfirmDialog';
import { exportAPI, settingsAPI, fileAPI } from '../../services/api';

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

function getParentPath(filePath: string): string {
  const normalized = normalizeFolderPath(filePath);
  if (normalized === '/') {
    return '/';
  }
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return '/';
  }
  return `/${segments.slice(0, -1).join('/')}`;
}

export default function BottomToolbar() {
  const { 
    privatePath, 
    sharedPath,
    selectedType, 
    selectedFile, 
    selectedPath,
    deleteItem,
    loadFiles
  } = useFileStore();
  const { viewMode, setViewMode } = useEditorStore();
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [createType, setCreateType] = useState<'private' | 'shared'>('private');
  const [createPath, setCreatePath] = useState<string>('/');
  const [defaultNoteType, setDefaultNoteType] = useState<'private' | 'shared'>('private');
  const [defaultNotePath, setDefaultNotePath] = useState<string>('/');
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    settingsAPI.getSettings()
      .then((settings) => {
        if (!isMounted) {
          return;
        }
        setDefaultNoteType(settings.default_note_type || 'private');
        setDefaultNotePath(normalizeFolderPath(settings.default_note_folder_path || '/'));
      })
      .catch((error) => {
        console.error('Fehler beim Laden der Standardablage:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const determineContext = (): { type: 'private' | 'shared'; path: string } => {
    if (selectedType && selectedPath) {
      if (selectedFile?.type === 'folder') {
        return { type: selectedType, path: normalizeFolderPath(selectedPath) };
      }
      return { type: selectedType, path: getParentPath(selectedPath) };
    }

    if (selectedType === 'private') {
      return { type: 'private', path: normalizeFolderPath(privatePath) };
    }

    if (selectedType === 'shared') {
      return { type: 'shared', path: normalizeFolderPath(sharedPath) };
    }

    return { type: defaultNoteType, path: defaultNotePath };
  };

  const handleCreateFile = () => {
    const context = determineContext();
    setCreateType(context.type);
    setCreatePath(context.path);
    setShowCreateFile(true);
  };

  const handleCreateFolder = () => {
    const context = determineContext();
    setCreateType(context.type);
    setCreatePath(context.path);
    setShowCreateFolder(true);
  };

  const handleDelete = async () => {
    if (!selectedFile || !selectedPath || !selectedType) {
      // Falls keine Datei ausgewählt ist, aber wir im aktuellen Verzeichnis sind,
      // können wir das aktuelle Verzeichnis nicht löschen (das wäre der Root)
      return;
    }

    try {
      await deleteItem(selectedPath, selectedType);
      // Lade Dateiliste neu
      const pathToReload = selectedType === 'private' ? privatePath : sharedPath;
      await loadFiles(pathToReload, selectedType);
    } catch (error) {
      console.error('Failed to delete item:', error);
      // Fehler wird im Store gespeichert und kann dort angezeigt werden
    }
  };

  const handleDeleteClick = () => {
    if (!selectedFile || !selectedPath || !selectedType) {
      // Keine Datei ausgewählt
      return;
    }
    setShowDeleteConfirm(true);
  };

  // Schließe Export-Menü beim Klick außerhalb
  useEffect(() => {
    if (showExportMenu) {
      const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
          setShowExportMenu(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  const handleExportClick = () => {
    if (!selectedFile || !selectedPath) {
      return;
    }
    setShowExportMenu(!showExportMenu);
  };

  const handlePreviewToggle = () => {
    setViewMode(viewMode === 'preview' ? 'wysiwyg' : 'preview');
  };

  const isPreviewActive = viewMode === 'preview';

  const handleExportPDF = async () => {
    if (!selectedFile || !selectedPath || !selectedType) {
      return;
    }
    
    setShowExportMenu(false);
    
    // Prüfe, ob es eine Markdown- oder Text-Datei ist
    const isMarkdown = selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.txt');
    if (!isMarkdown) {
      alert('Nur Markdown- und Text-Dateien können exportiert werden.');
      return;
    }
    
    try {
      // Hole Standard-Export-Größe aus Settings
      let exportSize: 'A4' | 'A5' = 'A4';
      try {
        const settings = await settingsAPI.getSettings();
        if (settings.default_export_size) {
          exportSize = settings.default_export_size as 'A4' | 'A5';
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
      
      // Exportiere als PDF
      const blob = await exportAPI.exportPDF(selectedPath, selectedType, exportSize);
      
      // Erstelle Download-Link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace(/\.(md|txt)$/i, '.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Fehler beim PDF-Export: ${error.response?.data?.error || error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleExportWord = async () => {
    if (!selectedFile || !selectedPath || !selectedType) {
      return;
    }
    
    setShowExportMenu(false);
    
    // Prüfe, ob es eine Markdown- oder Text-Datei ist
    const isMarkdown = selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.txt');
    if (!isMarkdown) {
      alert('Nur Markdown- und Text-Dateien können exportiert werden.');
      return;
    }
    
    try {
      // Exportiere als Word
      const blob = await exportAPI.exportWord(selectedPath, selectedType);
      
      // Erstelle Download-Link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace(/\.(md|txt)$/i, '.docx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Fehler beim Word-Export: ${error.response?.data?.error || error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleExportMarkdown = async () => {
    if (!selectedFile || !selectedPath || !selectedType) {
      return;
    }
    
    setShowExportMenu(false);
    
    // Prüfe, ob es eine Markdown- oder Text-Datei ist
    const isMarkdown = selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.txt');
    if (!isMarkdown) {
      alert('Nur Markdown- und Text-Dateien können exportiert werden.');
      return;
    }
    
    try {
      // Lade Datei-Inhalt
      const response = await fileAPI.getFileContent(selectedPath, selectedType);
      let content = response.content;
      
      // Integriere Bibelstellen-Links in Markdown
      // Finde Bibelstellen und konvertiere sie zu Markdown-Links
      const bibleRefPatterns = [
        /(?:Psalm|Ps|Psalmen)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
        /\d+\.?\s*Mose\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
        /(?:Matthäus|Mt|Markus|Mk|Lukas|Lk|Johannes|Joh|Apostelgeschichte|Apg|Römer|Röm|Galater|Gal|Epheser|Eph|Philipper|Phil|Kolosser|Kol|Jakobus|Jak|Hebräer|Hebr|Offenbarung|Offb|Apokalypse)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
        /\d+\.?\s*(?:Samuel|Könige|Chronik|Korinther|Kor|Thessalonicher|Thess|Timotheus|Tim|Petrus|Petr|Johannes|Joh)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
        /(?:Psalm|Ps|Psalmen)\s+\d+(?![,:\s])/gi,
        /\d+\.?\s*Mose\s+\d+(?![,:\s])/gi,
        /(?:Matthäus|Mt|Markus|Mk|Lukas|Lk|Johannes|Joh|Apostelgeschichte|Apg|Römer|Röm|Galater|Gal|Epheser|Eph|Philipper|Phil|Kolosser|Kol|Jakobus|Jak|Hebräer|Hebr|Offenbarung|Offb|Apokalypse)\s+\d+(?![,:\s])/gi,
        /\d+\.?\s*(?:Samuel|Könige|Chronik|Korinther|Kor|Thessalonicher|Thess|Timotheus|Tim|Petrus|Petr|Johannes|Joh)\s+\d+(?![,:\s])/gi
      ];
      
      const matches: Array<{ text: string; start: number; end: number }> = [];
      for (const pattern of bibleRefPatterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(content)) !== null) {
          // Prüfe, ob bereits in einem Link
          const beforeText = content.substring(0, match.index);
          if (!beforeText.match(/\[[^\]]*$/)) {
            matches.push({
              text: match[0],
              start: match.index!,
              end: match.index! + match[0].length
            });
          }
        }
      }
      
      // Sortiere rückwärts, um Indizes nicht zu verschieben
      matches.sort((a, b) => b.start - a.start);
      
      // Ersetze Bibelstellen durch Markdown-Links
      for (const match of matches) {
        const linkText = `[${match.text}](bible://${encodeURIComponent(match.text.trim())})`;
        content = content.substring(0, match.start) + linkText + content.substring(match.end);
      }
      
      // Erstelle Blob und Download-Link
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Fehler beim Markdown-Export: ${error.response?.data?.error || error.message || 'Unbekannter Fehler'}`);
    }
  };

  return (
    <>
      <div style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e0e0e0',
        padding: '0.5rem',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '56px',
        boxShadow: '0 -1px 3px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={handleCreateFolder}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#007AFF',
            minWidth: '60px',
            minHeight: '44px'
          }}
          aria-label="Ordner erstellen"
          title="Neuen Ordner erstellen"
        >
          <span>📁</span>
          <span style={{ fontSize: '0.625rem' }}>Ordner</span>
        </button>

        <button
          onClick={handleCreateFile}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#007AFF',
            minWidth: '60px',
            minHeight: '44px'
          }}
          aria-label="Datei erstellen"
          title="Neue Datei erstellen"
        >
          <span>✏️</span>
          <span style={{ fontSize: '0.625rem' }}>Neu</span>
        </button>

        <button
          onClick={handlePreviewToggle}
          aria-pressed={isPreviewActive}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#007AFF',
            backgroundColor: isPreviewActive ? 'var(--bg-tertiary)' : 'transparent',
            borderRadius: '8px',
            minWidth: '60px',
            minHeight: '44px'
          }}
          aria-label="Vorschau"
          title={isPreviewActive ? 'Vorschau schließen' : 'Vorschau'}
        >
          <span>👁️</span>
          <span style={{ fontSize: '0.625rem' }}>Vorschau</span>
        </button>

        <div style={{ position: 'relative' }} ref={exportMenuRef}>
          <button
            onClick={handleExportClick}
            disabled={!selectedFile || !selectedPath}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: (!selectedFile || !selectedPath) ? 'not-allowed' : 'pointer',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              color: (!selectedFile || !selectedPath) ? '#999' : '#007AFF',
              opacity: (!selectedFile || !selectedPath) ? 0.5 : 1,
              minWidth: '60px',
              minHeight: '44px'
            }}
            aria-label="Export"
            title={(!selectedFile || !selectedPath) ? 'Keine Datei ausgewählt' : 'Exportieren'}
          >
            <span>📤</span>
            <span style={{ fontSize: '0.625rem' }}>Export</span>
          </button>
          
          {/* Export-Menü */}
          {showExportMenu && selectedFile && selectedPath && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                minWidth: '150px',
                zIndex: 1000,
                padding: '0.5rem 0'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleExportPDF}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>📄</span>
                <span>Als PDF exportieren</span>
              </button>
              <button
                onClick={handleExportWord}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>📝</span>
                <span>Als Word exportieren</span>
              </button>
              <button
                onClick={handleExportMarkdown}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>📄</span>
                <span>Als Markdown exportieren</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleDeleteClick}
          disabled={!selectedFile || !selectedPath}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: (!selectedFile || !selectedPath) ? 'not-allowed' : 'pointer',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: (!selectedFile || !selectedPath) ? '#999' : '#c33',
            opacity: (!selectedFile || !selectedPath) ? 0.5 : 1,
            minWidth: '60px',
            minHeight: '44px'
          }}
          aria-label="Löschen"
          title={(!selectedFile || !selectedPath) ? 'Keine Datei ausgewählt' : 'Löschen'}
        >
          <span>🗑️</span>
          <span style={{ fontSize: '0.625rem' }}>Löschen</span>
        </button>
      </div>

      {showCreateFile && (
        <CreateFileDialog
          isOpen={showCreateFile}
          onClose={() => setShowCreateFile(false)}
          type="file"
          initialFolderType={createType}
          initialPath={createPath}
          allowTargetSelection={true}
        />
      )}

      {showCreateFolder && (
        <CreateFileDialog
          isOpen={showCreateFolder}
          onClose={() => setShowCreateFolder(false)}
          type="folder"
          initialFolderType={createType}
          initialPath={createPath}
          allowTargetSelection={true}
        />
      )}

      {showDeleteConfirm && selectedFile && selectedPath && selectedType && (
        <DeleteConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          itemName={selectedFile.name}
          itemType={selectedFile.type}
        />
      )}
    </>
  );
}


