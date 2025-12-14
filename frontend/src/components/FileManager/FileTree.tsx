/**
 * FileTree Komponente
 * 
 * Zeigt Ordnerstruktur für private oder geteilte Notizen
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFileStore } from '../../store/fileStore';
import FileItem from './FileItem';

interface FileTreeProps {
  type: 'private' | 'shared';
  title: string;
  icon: string;
}

export default function FileTree({ type, title, icon }: FileTreeProps) {
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
  
  const error = type === 'private' ? privateError : sharedError;

  const files = type === 'private' ? privateFiles : sharedFiles;
  const currentPath = type === 'private' ? privatePath : sharedPath;

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

  return (
    <div style={{ padding: '1rem' }}>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

