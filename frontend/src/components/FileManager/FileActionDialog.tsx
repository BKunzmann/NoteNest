import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useFileStore } from '../../store/fileStore';
import { fileAPI } from '../../services/api';
import FolderNavigator from './FolderNavigator';

type FileStorageType = 'private' | 'shared';

interface FileActionDialogProps {
  isOpen: boolean;
  mode: 'move' | 'copy';
  sourcePath: string;
  sourceType: FileStorageType;
  sourceName: string;
  sourceItemType?: 'file' | 'folder';
  onClose: () => void;
  onSuccess?: (result: {
    mode: 'move' | 'copy';
    sourcePath: string;
    sourceType: FileStorageType;
    destinationPath: string;
    destinationType: FileStorageType;
    itemType: 'file' | 'folder';
  }) => void;
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

function withConflictSuffix(fileName: string, attempt: number, itemType: 'file' | 'folder'): string {
  if (itemType === 'folder') {
    return `${fileName} (${attempt})`;
  }

  const extensionIndex = fileName.lastIndexOf('.');
  if (extensionIndex > 0) {
    const base = fileName.slice(0, extensionIndex);
    const extension = fileName.slice(extensionIndex);
    return `${base} (${attempt})${extension}`;
  }
  return `${fileName} (${attempt})`;
}

export default function FileActionDialog({
  isOpen,
  mode,
  sourcePath,
  sourceType,
  sourceName,
  sourceItemType = 'file',
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

    const normalizedFolder = normalizeFolderPath(targetFolder);
    const preliminaryPath = buildTargetPath(normalizedFolder, cleanTargetName);
    if (mode === 'move' && sourceType === targetType && sourcePath === preliminaryPath) {
      setError('Quelle und Ziel sind identisch');
      return;
    }

    setIsSubmitting(true);
    try {
      const listing = await fileAPI.listFiles(normalizedFolder, targetType);
      const existingNames = new Set(
        listing.items
          .filter((item) => item.type === sourceItemType)
          .map((item) => item.name.toLowerCase())
      );

      let resolvedName = cleanTargetName;
      let attempt = 1;
      while (existingNames.has(resolvedName.toLowerCase())) {
        resolvedName = withConflictSuffix(cleanTargetName, attempt, sourceItemType);
        attempt += 1;
      }

      if (resolvedName !== cleanTargetName) {
        setTargetName(resolvedName);
      }

      const destinationPath = buildTargetPath(normalizedFolder, resolvedName);

      if (mode === 'move') {
        await moveItem(sourcePath, sourceType, destinationPath, targetType);
      } else {
        await copyItem(sourcePath, sourceType, destinationPath, targetType);
      }
      onSuccess?.({
        mode,
        sourcePath,
        sourceType,
        destinationPath,
        destinationType: targetType,
        itemType: sourceItemType
      });
      onClose();
    } catch (apiError: unknown) {
      let errorMessage = 'Aktion fehlgeschlagen';
      if (apiError instanceof Error) {
        errorMessage = apiError.message;
      } else if (typeof apiError === 'object' && apiError !== null && 'response' in apiError) {
        const maybeResponse = (apiError as { response?: { data?: { error?: string } } }).response;
        if (maybeResponse?.data?.error) {
          errorMessage = maybeResponse.data.error;
        }
      }
      setError(errorMessage);
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
              onChange={(event) => {
                const nextType = event.target.value as FileStorageType;
                setTargetType(nextType);
                setTargetFolder('/');
              }}
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

          <FolderNavigator
            storageType={targetType}
            value={targetFolder}
            onChange={setTargetFolder}
            disabled={isSubmitting}
            label="Zielordner"
            helperText="Ordnerauswahl erfolgt per Navigator statt Freitext."
            allowCreateFolder={true}
          />

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
