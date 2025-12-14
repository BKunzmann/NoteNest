/**
 * Create File Dialog Komponente
 * 
 * Dialog zum Erstellen einer neuen Datei oder eines Ordners
 */

import { useState, FormEvent } from 'react';
import { fileAPI } from '../../services/api';
import { useFileStore } from '../../store/fileStore';

interface CreateFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'file' | 'folder';
  folderType: 'private' | 'shared';
  currentPath: string;
}

export default function CreateFileDialog({
  isOpen,
  onClose,
  type,
  folderType,
  currentPath
}: CreateFileDialogProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadFiles } = useFileStore();

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

    setIsCreating(true);

    try {
      const filePath = currentPath === '/' 
        ? `/${name}${type === 'file' ? '.md' : ''}`
        : `${currentPath}/${name}${type === 'file' ? '.md' : ''}`;

      if (type === 'file') {
        await fileAPI.createFile({
          path: filePath,
          content: content,
          type: folderType
        });
      } else {
        await fileAPI.createFolder({
          path: filePath,
          type: folderType
        });
      }

      // Lade Dateien neu
      await loadFiles(currentPath, folderType);
      
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

