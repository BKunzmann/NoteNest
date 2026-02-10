/**
 * FileItem Komponente
 * 
 * Zeigt eine einzelne Datei oder einen Ordner
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileItem as FileItemType } from '../../types/file';
import { useFileStore } from '../../store/fileStore';

interface ContextRequestPayload {
  file: FileItemType;
  type: 'private' | 'shared';
  path: string;
  x: number;
  y: number;
}

interface FileItemProps {
  file: FileItemType;
  type: 'private' | 'shared';
  currentPath: string;
  onFolderClick: (path: string) => void;
  onFileSelect?: () => void; // Callback wenn Datei ausgewählt wird (für mobile Sidebar)
  onContextRequest?: (payload: ContextRequestPayload) => void;
}

function normalizePath(inputPath: string): string {
  let normalized = inputPath.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  return normalized.replace(/\/+/g, '/');
}

export default function FileItem({
  file,
  type,
  currentPath,
  onFolderClick,
  onFileSelect,
  onContextRequest
}: FileItemProps) {
  const { selectFile, selectedPath, selectedType } = useFileStore();
  const navigate = useNavigate();
  const longPressTimerRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);

  const getItemPath = (): string => {
    if (file.path) {
      return normalizePath(file.path);
    }
    return currentPath === '/' ? normalizePath(file.name) : normalizePath(`${currentPath}/${file.name}`);
  };

  const triggerContextMenu = (x: number, y: number) => {
    if (!onContextRequest) {
      return;
    }
    onContextRequest({
      file,
      type,
      path: getItemPath(),
      x,
      y
    });
    suppressNextClickRef.current = true;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    if (file.type === 'folder') {
      // Ordner: Navigiere in Ordner
      const newPath = getItemPath();
      onFolderClick(newPath);
    } else {
      // Datei: Wähle Datei aus
      const filePath = getItemPath();

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
      
      // Callback für mobile Sidebar (schließen nach Auswahl)
      if (onFileSelect) {
        // Kurze Verzögerung, damit die Datei-Auswahl abgeschlossen ist
        setTimeout(() => {
          onFileSelect();
        }, 100);
      }
    }
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (!onContextRequest) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    triggerContextMenu(event.clientX, event.clientY);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!onContextRequest || event.touches.length === 0) {
      return;
    }

    clearLongPress();
    const touch = event.touches[0];
    longPressTimerRef.current = window.setTimeout(() => {
      triggerContextMenu(touch.clientX, touch.clientY);
      clearLongPress();
    }, 500);
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
    const itemPath = getItemPath();
    const isSelected = selectedType === type && selectedPath === itemPath;
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem',
      cursor: file.type === 'folder' || file.isEditable ? 'pointer' : 'default',
      borderRadius: '4px',
      fontSize: '0.875rem',
      marginBottom: '0.25rem',
      backgroundColor: isSelected ? 'rgba(10, 132, 255, 0.15)' : 'transparent',
      border: isSelected ? '1px solid rgba(10, 132, 255, 0.35)' : '1px solid transparent'
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
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onTouchCancel={clearLongPress}
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

