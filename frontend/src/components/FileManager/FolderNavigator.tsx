import { useEffect, useMemo, useState } from 'react';
import { fileAPI } from '../../services/api';
import { FileItem } from '../../types/file';

interface FolderNavigatorProps {
  storageType: 'private' | 'shared';
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  allowCreateFolder?: boolean;
}

function normalizePath(inputPath: string): string {
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

function getParentPath(folderPath: string): string {
  const normalized = normalizePath(folderPath);
  if (normalized === '/') {
    return '/';
  }
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return '/';
  }
  return `/${parts.slice(0, -1).join('/')}`;
}

export default function FolderNavigator({
  storageType,
  value,
  onChange,
  disabled = false,
  label = 'Ordner',
  helperText,
  allowCreateFolder = false
}: FolderNavigatorProps) {
  const [currentPath, setCurrentPath] = useState<string>(normalizePath(value));
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPath(normalizePath(value));
  }, [value, storageType]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    fileAPI.listFiles(currentPath, storageType)
      .then((response) => {
        if (!mounted) {
          return;
        }
        const onlyFolders = response.items.filter((item) => item.type === 'folder');
        onlyFolders.sort((a, b) => a.name.localeCompare(b.name));
        setFolders(onlyFolders);
      })
      .catch((apiError: any) => {
        if (!mounted) {
          return;
        }
        setError(apiError?.response?.data?.error || 'Ordner konnten nicht geladen werden');
        setFolders([]);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentPath, storageType]);

  const pathSegments = useMemo(
    () => currentPath.split('/').filter(Boolean),
    [currentPath]
  );

  const setPath = (nextPath: string) => {
    const normalized = normalizePath(nextPath);
    setCurrentPath(normalized);
    onChange(normalized);
  };

  const handleCreateFolder = async () => {
    if (disabled) {
      return;
    }
    const rawFolderName = window.prompt('Name des neuen Ordners');
    if (rawFolderName === null) {
      return;
    }
    const folderName = rawFolderName.trim().replace(/[\\/]/g, '');
    if (!folderName || folderName.includes('..')) {
      setError('Ungültiger Ordnername');
      return;
    }

    const folderPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    try {
      await fileAPI.createFolder({
        path: folderPath,
        type: storageType
      });
      setError(null);
      setPath(folderPath);
    } catch (apiError: any) {
      setError(apiError?.response?.data?.error || 'Ordner konnte nicht erstellt werden');
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
        {label}
      </label>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.75rem',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fafafa'
      }}>
        <div style={{
          fontSize: '0.85rem',
          color: '#666',
          wordBreak: 'break-word'
        }}>
          Aktueller Ordner: <code>{currentPath}</code>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={disabled || currentPath === '/'}
            onClick={() => setPath('/')}
            style={{
              padding: '0.4rem 0.7rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              cursor: disabled || currentPath === '/' ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Start
          </button>
          <button
            type="button"
            disabled={disabled || currentPath === '/'}
            onClick={() => setPath(getParentPath(currentPath))}
            style={{
              padding: '0.4rem 0.7rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              cursor: disabled || currentPath === '/' ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Eine Ebene hoch
          </button>
          {allowCreateFolder && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleCreateFolder()}
              style={{
                padding: '0.4rem 0.7rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem'
              }}
              title="Neuen Unterordner erstellen"
            >
              + Neuer Ordner
            </button>
          )}
        </div>

        {pathSegments.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '0.35rem',
            flexWrap: 'wrap'
          }}>
            {pathSegments.map((segment, index) => {
              const segmentPath = `/${pathSegments.slice(0, index + 1).join('/')}`;
              return (
                <button
                  key={`${segmentPath}-${segment}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPath(segmentPath)}
                  style={{
                    padding: '0.2rem 0.45rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  {segment}
                </button>
              );
            })}
          </div>
        )}

        <div>
          <label htmlFor={`folderSelect-${storageType}`} style={{ display: 'block', marginBottom: '0.3rem' }}>
            Unterordner wählen
          </label>
          <select
            id={`folderSelect-${storageType}`}
            disabled={disabled || isLoading || folders.length === 0}
            defaultValue=""
            onChange={(event) => {
              const selectedFolder = event.target.value;
              if (!selectedFolder) {
                return;
              }
              const nextPath = currentPath === '/'
                ? `/${selectedFolder}`
                : `${currentPath}/${selectedFolder}`;
              setPath(nextPath);
              event.currentTarget.value = '';
            }}
            style={{
              width: '100%',
              padding: '0.55rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: '#fff'
            }}
          >
            <option value="">
              {isLoading ? 'Lädt Unterordner...' : folders.length === 0 ? 'Keine Unterordner vorhanden' : '-- Unterordner wählen --'}
            </option>
            {folders.map((folder) => (
              <option key={folder.path} value={folder.name}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#c33' }}>
          {error}
        </div>
      )}

      {helperText && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#666' }}>
          {helperText}
        </div>
      )}
    </div>
  );
}
