/**
 * Admin Hidden Folders Management Komponente
 * 
 * Verwaltet die Liste der ausgeblendeten Ordner
 */

import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';

export default function HiddenFoldersManagement() {
  const [folders, setFolders] = useState<string[]>([]);
  const [initialFolders, setInitialFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState('');

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const response = await adminAPI.getHiddenFolders();
      setFolders(response.folders || []);
      setInitialFolders(response.folders || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden der Ordnerliste');
    } finally {
      setLoading(false);
    }
  };

  const normalizeFolderName = (value: string): string => value.trim();

  const handleAddFolder = () => {
    const trimmed = normalizeFolderName(newFolder);
    if (!trimmed) {
      setError('Bitte einen Ordnernamen eingeben');
      return;
    }
    if (trimmed.includes('/')) {
      setError('Ordnername darf keinen Slash enthalten');
      return;
    }
    const exists = folders.some(folder => folder.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setError('Ordner ist bereits in der Liste');
      return;
    }

    setFolders([...folders, trimmed]);
    setNewFolder('');
    setError(null);
    setSuccess(null);
  };

  const handleRemoveFolder = (folder: string) => {
    if (!confirm(`Ordner "${folder}" wirklich entfernen?`)) {
      return;
    }
    setFolders(folders.filter(item => item !== folder));
    setSuccess(null);
    setError(null);
  };

  const hasChanges = (): boolean => {
    if (folders.length !== initialFolders.length) return true;
    const sortedCurrent = [...folders].sort();
    const sortedInitial = [...initialFolders].sort();
    return sortedCurrent.some((value, index) => value !== sortedInitial[index]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const cleaned = folders.map(normalizeFolderName).filter(Boolean);
      const response = await adminAPI.updateHiddenFolders(cleaned);
      setFolders(response.folders || cleaned);
      setInitialFolders(response.folders || cleaned);
      setSuccess('Liste wurde gespeichert');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern der Ordnerliste');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Lade ausgeblendete Ordner...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Ausgeblendete Ordner</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Ordner in dieser Liste werden im Dateibaum nicht angezeigt. Die Werte gelten fuer alle Benutzer.
      </p>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          marginBottom: '1rem',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          borderRadius: '8px',
          marginBottom: '1rem',
          color: '#393'
        }}>
          {success}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          value={newFolder}
          placeholder="Ordnername (z.B. .git)"
          onChange={(e) => setNewFolder(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddFolder();
            }
          }}
          style={{
            flex: '1 1 320px',
            padding: '0.75rem',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '1rem'
          }}
        />
        <button
          onClick={handleAddFolder}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}
        >
          Hinzufuegen
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '1.5rem'
      }}>
        {folders.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#777'
          }}>
            Keine Ordner konfiguriert
          </div>
        ) : (
          folders.map((folder) => (
            <div
              key={folder}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #e0e0e0'
              }}
            >
              <div style={{ fontWeight: 500 }}>{folder}</div>
              <button
                onClick={() => handleRemoveFolder(folder)}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Entfernen
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          onClick={loadFolders}
          disabled={saving}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem'
          }}
        >
          Neu laden
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges() || saving}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: !hasChanges() || saving ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: !hasChanges() || saving ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
 