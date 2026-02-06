/**
 * FileTree Komponente
 * 
 * Zeigt Ordnerstruktur für private oder geteilte Notizen
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileStore } from '../../store/fileStore';
import { settingsAPI } from '../../services/api';
import FileItem from './FileItem';

interface FileTreeProps {
  type: 'private' | 'shared';
  title: string;
  icon: string;
  onFileSelect?: () => void; // Callback wenn eine Datei ausgewählt wird (für mobile Sidebar-Schließen)
}

export default function FileTree({ type, title, icon, onFileSelect }: FileTreeProps) {
  const navigate = useNavigate();
  const { 
    privateFiles, 
    privatePath, 
    sharedFiles, 
    sharedPath,
    loadFiles,
    isLoading,
    privateError,
    sharedError
  } = useFileStore();
  
  const [showOnlyNotes, setShowOnlyNotes] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  const error = type === 'private' ? privateError : sharedError;

  const allFiles = type === 'private' ? privateFiles : sharedFiles;
  const currentPath = type === 'private' ? privatePath : sharedPath;

  // Lade Einstellung beim Mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsAPI.getSettings();
        setShowOnlyNotes(settings.show_only_notes || false);
      } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error);
        setShowOnlyNotes(false);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Filtere Dateien basierend auf showOnlyNotes
  const files = showOnlyNotes
    ? allFiles.filter(file => {
        // Ordner immer anzeigen
        if (file.type === 'folder') {
          return true;
        }
        // Nur Markdown und TXT Dateien anzeigen
        return file.fileType === 'md' || file.fileType === 'txt';
      })
    : allFiles;

  useEffect(() => {
    // Lade Dateien beim Mount
    loadFiles('/', type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleFolderClick = (folderPath: string) => {
    loadFiles(folderPath, type);
  };

  const handleTitleClick = () => {
    // Navigiere zur Notes-Seite, falls nicht bereits dort
    if (window.location.pathname !== '/notes') {
      navigate('/notes');
    }
    // Zurück zum Root
    loadFiles('/', type);
  };

  const handleToggleShowOnlyNotes = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !showOnlyNotes;
    setShowOnlyNotes(newValue);
    
    try {
      await settingsAPI.updateSettings({ show_only_notes: newValue });
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellung:', error);
      // Revert bei Fehler
      setShowOnlyNotes(!newValue);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
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
      
      {/* Breadcrumb */}
      {currentPath !== '/' && (
        <div style={{
          fontSize: '0.75rem',
          color: '#999',
          marginBottom: '0.5rem',
          padding: '0.25rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <span>📂</span>
          <span>{currentPath}</span>
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

      {isLoading ? (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

