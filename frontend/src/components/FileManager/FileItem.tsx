/**
 * FileItem Komponente
 * 
 * Zeigt eine einzelne Datei oder einen Ordner
 */

import { useNavigate } from 'react-router-dom';
import { FileItem as FileItemType } from '../../types/file';
import { useFileStore } from '../../store/fileStore';

interface FileItemProps {
  file: FileItemType;
  type: 'private' | 'shared';
  currentPath: string;
  onFolderClick: (path: string) => void;
}

export default function FileItem({ file, type, currentPath, onFolderClick }: FileItemProps) {
  const { selectFile } = useFileStore();
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (file.type === 'folder') {
      // Ordner: Navigiere in Ordner
      const newPath = currentPath === '/' 
        ? `/${file.name}` 
        : `${currentPath}/${file.name}`;
      onFolderClick(newPath);
    } else {
      // Datei: Wähle Datei aus
      // Verwende file.path direkt, da es bereits den vollständigen relativen Pfad enthält
      // Normalisiere den Pfad: Entferne doppelte Slashes und stelle sicher, dass er mit / beginnt
      let filePath = file.path || (currentPath === '/' 
        ? `/${file.name}` 
        : `${currentPath}/${file.name}`);
      
      // Normalisiere: Stelle sicher, dass Pfad mit / beginnt und keine doppelten Slashes hat
      if (!filePath.startsWith('/')) {
        filePath = '/' + filePath;
      }
      filePath = filePath.replace(/\/+/g, '/'); // Entferne doppelte Slashes
      
      console.log('FileItem: Selecting file', { 
        fileName: file.name, 
        filePath: file.path, 
        currentPath, 
        normalizedPath: filePath,
        type 
      });
      
      // Navigiere zur Notes-Seite, falls nicht bereits dort
      if (window.location.pathname !== '/notes') {
        navigate('/notes');
      }
      
      selectFile(file, filePath, type);
    }
  };

  const getIcon = () => {
    if (file.type === 'folder') {
      return '📁';
    }
    
    if (!file.isEditable) {
      return '📄'; // Nicht bearbeitbare Datei
    }
    
    // Bearbeitbare Dateien
    if (file.fileType === 'md') {
      return '📝';
    }
    if (file.fileType === 'txt') {
      return '📄';
    }
    
    return '📄';
  };

  const getStyle = () => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem',
      cursor: file.type === 'folder' || file.isEditable ? 'pointer' : 'default',
      borderRadius: '4px',
      fontSize: '0.875rem',
      marginBottom: '0.25rem'
    };

    if (!file.isEditable && file.type === 'file') {
      // Nicht bearbeitbare Dateien: ausgegraut
      return {
        ...baseStyle,
        color: '#999',
        opacity: 0.6,
        cursor: 'not-allowed'
      };
    }

    return {
      ...baseStyle,
      color: '#333'
    };
  };

  return (
    <div
      style={getStyle()}
      onClick={handleClick}
      title={file.type === 'file' && !file.isEditable ? 'Nicht bearbeitbar' : undefined}
    >
      <span>{getIcon()}</span>
      <span style={{ flex: 1 }}>{file.name}</span>
      {file.type === 'file' && file.size && (
        <span style={{ fontSize: '0.75rem', color: '#999' }}>
          {(file.size / 1024).toFixed(1)} KB
        </span>
      )}
    </div>
  );
}

