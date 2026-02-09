import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useFileStore } from '../../store/fileStore';

type FileStorageType = 'private' | 'shared';

interface FileActionDialogProps {
  isOpen: boolean;
  mode: 'move' | 'copy';
  sourcePath: string;
  sourceType: FileStorageType;
  sourceName: string;
  onClose: () => void;
  onSuccess?: () => void;
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

function getParentPath(filePath: string): string {
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

function buildTargetPath(folderPath: string, fileName: string): string {
  const cleanName = fileName.trim().replace(/[\\/]/g, '');
  const normalizedFolderPath = normalizeFolderPath(folderPath);
  return normalizedFolderPath === '/'
    ? `/${cleanName}`
    : `${normalizedFolderPath}/${cleanName}`;
}

function makeCopyName(originalName: string): string {
  const extensionIndex = originalName.lastIndexOf('.');
  if (extensionIndex > 0) {
    const base = originalName.slice(0, extensionIndex);
    const extension = originalName.slice(extensionIndex);
    return `${base} - Kopie${extension}`;
  }
  return `${originalName} - Kopie`;
}

export default function FileActionDialog({
  isOpen,
  mode,
  sourcePath,
  sourceType,
  sourceName,
  onClose,
  onSuccess
}: FileActionDialogProps) {
  const { moveItem, copyItem } = useFileStore();
  const [targetType, setTargetType] = useState<FileStorageType>(sourceType);
  const [targetFolder, setTargetFolder] = useState<string>(getParentPath(sourcePath));
  const [targetName, setTargetName] = useState<string>(sourceName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setError(null);
    setTargetType(sourceType);
    setTargetFolder(getParentPath(sourcePath));
    setTargetName(mode === 'copy' ? makeCopyName(sourceName) : sourceName);
  }, [isOpen, mode, sourceName, sourcePath, sourceType]);

  const finalPathPreview = useMemo(() => {
    if (!targetName.trim()) {
      return normalizeFolderPath(targetFolder);
    }
    return buildTargetPath(targetFolder, targetName);
  }, [targetFolder, targetName]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const cleanTargetName = targetName.trim();
    if (!cleanTargetName) {
      setError('Name ist erforderlich');
      return;
    }
    if (cleanTargetName.includes('..')) {
      setError('Ungültiger Name');
      return;
    }

    const destinationPath = buildTargetPath(targetFolder, cleanTargetName);
    if (mode === 'move' && sourceType === targetType && sourcePath === destinationPath) {
      setError('Quelle und Ziel sind identisch');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'move') {
        await moveItem(sourcePath, sourceType, destinationPath, targetType);
      } else {
        await copyItem(sourcePath, sourceType, destinationPath, targetType);
      }
      onSuccess?.();
      onClose();
    } catch (apiError: any) {
      setError(apiError?.response?.data?.error || apiError?.message || 'Aktion fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2100
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '520px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          padding: '1.25rem'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 style={{ marginBottom: '1rem' }}>
          {mode === 'move' ? 'Datei/Ordner verschieben' : 'Datei/Ordner kopieren'}
        </h3>

        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Quelle: <code>{sourcePath}</code> ({sourceType === 'private' ? 'Privat' : 'Geteilt'})
        </div>

        {error && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.65rem',
            borderRadius: '6px',
            backgroundColor: '#fee',
            color: '#c33',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.85rem' }}>
            <label htmlFor="targetType" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Zielbereich
            </label>
            <select
              id="targetType"
              value={targetType}
              onChange={(event) => setTargetType(event.target.value as FileStorageType)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
            >
              <option value="private">Privat</option>
              <option value="shared">Geteilt</option>
            </select>
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label htmlFor="targetFolder" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Zielordner
            </label>
            <input
              id="targetFolder"
              type="text"
              value={targetFolder}
              onChange={(event) => setTargetFolder(event.target.value)}
              disabled={isSubmitting}
              placeholder="/"
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
            />
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label htmlFor="targetName" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Neuer Name
            </label>
            <input
              id="targetName"
              type="text"
              value={targetName}
              onChange={(event) => setTargetName(event.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
            />
          </div>

          <div style={{
            marginBottom: '1rem',
            padding: '0.65rem',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-tertiary)',
            fontSize: '0.85rem'
          }}>
            Zielpfad: <code>{finalPathPreview}</code>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                padding: '0.55rem 0.95rem',
                cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                border: 'none',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
                borderRadius: '6px',
                padding: '0.55rem 0.95rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting
                ? (mode === 'move' ? 'Verschiebe...' : 'Kopiere...')
                : (mode === 'move' ? 'Verschieben' : 'Kopieren')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
