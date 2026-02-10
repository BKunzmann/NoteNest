/**
 * Create File Dialog Komponente
 * 
 * Dialog zum Erstellen einer neuen Datei oder eines Ordners
 */

import { useEffect, useState, FormEvent } from 'react';
import { fileAPI } from '../../services/api';
import { useFileStore } from '../../store/fileStore';
import FolderNavigator from './FolderNavigator';

interface CreateFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'file' | 'folder';
  initialFolderType: 'private' | 'shared';
  initialPath: string;
  allowTargetSelection?: boolean;
  onCreated?: (created: { path: string; type: 'private' | 'shared'; name: string }) => void;
}

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

function buildTargetPath(folderPath: string, name: string): string {
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  const cleanedName = name.trim().replace(/[\\/]/g, '');
  if (!cleanedName) {
    return normalizedFolderPath;
  }

  return normalizedFolderPath === '/'
    ? `/${cleanedName}`
    : `${normalizedFolderPath}/${cleanedName}`;
}

function getSuggestedName(kind: 'file' | 'folder'): string {
  const today = new Date().toISOString().slice(0, 10);
  return kind === 'file' ? `${today} Neu` : `${today} Neuer Ordner`;
}

export default function CreateFileDialog({
  isOpen,
  onClose,
  type,
  initialFolderType,
  initialPath,
  allowTargetSelection = true,
  onCreated
}: CreateFileDialogProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [folderType, setFolderType] = useState<'private' | 'shared'>(initialFolderType);
  const [targetPath, setTargetPath] = useState<string>(normalizeFolderPath(initialPath));
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadFiles } = useFileStore();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName('');
    setContent('');
    setError(null);
    setFolderType(initialFolderType);
    setTargetPath(normalizeFolderPath(initialPath));
    setName(getSuggestedName(type));
  }, [initialFolderType, initialPath, isOpen, type]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    if (name.includes('..')) {
      setError('Ungültiger Name');
      return;
    }

    setIsCreating(true);

    try {
      const normalizedTargetPath = normalizeFolderPath(targetPath);
      const baseName = name.trim();
      const finalName = type === 'file' && !baseName.toLowerCase().endsWith('.md')
        ? `${baseName}.md`
        : baseName;
      const filePath = buildTargetPath(normalizedTargetPath, finalName);

      if (type === 'file') {
        await fileAPI.createFile({
          path: filePath,
          content: content,
          type: folderType,
        });
      } else {
        await fileAPI.createFolder({
          path: filePath,
          type: folderType,
        });
      }

      // Lade Dateien neu
      await loadFiles(normalizedTargetPath, folderType);
      onCreated?.({ path: filePath, type: folderType, name: finalName });
      
      // Schließe Dialog
      setName('');
      setContent('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginBottom: '1.5rem' }}>
          {type === 'file' ? 'Neue Datei erstellen' : 'Neuen Ordner erstellen'}
        </h2>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {allowTargetSelection && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="storageType" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Ablagebereich
                </label>
                <select
                  id="storageType"
                  value={folderType}
                  onChange={(e) => {
                    const nextType = e.target.value as 'private' | 'shared';
                    setFolderType(nextType);
                    // Beim Wechsel des Ablagebereichs immer auf den Bereichs-Start springen
                    setTargetPath('/');
                  }}
                  disabled={isCreating}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="private">Privat</option>
                  <option value="shared">Geteilt</option>
                </select>
              </div>

              <FolderNavigator
                storageType={folderType}
                value={targetPath}
                onChange={setTargetPath}
                disabled={isCreating}
                label="Zielordner"
                helperText="Navigation ausschließlich über Ordnerauswahl, damit neue Dateien immer in gültigen Verzeichnissen landen."
              />
            </>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Name {type === 'file' && '(ohne .md)'}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              required
              autoFocus
            />
          </div>

          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f7f7f7',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#555'
          }}>
            <strong>Zielspeicherort:</strong>{' '}
            <code>
              {buildTargetPath(
                targetPath,
                type === 'file'
                  ? (
                    name.trim().toLowerCase().endsWith('.md')
                      ? (name.trim() || 'name.md')
                      : `${name.trim() || 'name'}.md`
                  )
                  : (name.trim() || 'name')
              )}
            </code>{' '}
            ({folderType === 'private' ? 'Privat' : 'Geteilt'})
          </div>

          {type === 'file' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="content" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Inhalt (optional)
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isCreating}
                rows={10}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: isCreating ? 'not-allowed' : 'pointer'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isCreating}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                opacity: isCreating ? 0.6 : 1
              }}
            >
              {isCreating ? 'Wird erstellt...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

