/**
 * Hidden Folders Management
 * 
 * Verwaltung der ausgeblendeten Ordner
 */

import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

export default function HiddenFoldersManagement() {
  const [folders, setFolders] = useState<string[]>([]);
  const [newFolder, setNewFolder] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminAPI.getHiddenFolders();
      setFolders(data.folders);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der ausgeblendeten Ordner');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    const trimmed = newFolder.trim();
    if (trimmed && !folders.includes(trimmed)) {
      setFolders([...folders, trimmed]);
      setNewFolder('');
      setError(null);
      setSuccess(null);
    } else if (folders.includes(trimmed)) {
      setError('Dieser Ordner ist bereits in der Liste');
    }
  };

  const handleRemove = (index: number) => {
    setFolders(folders.filter((_, i) => i !== index));
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      await adminAPI.updateHiddenFolders(folders);
      setSuccess('Ausgeblendete Ordner erfolgreich aktualisiert');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern der ausgeblendeten Ordner');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Lade...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Ausgeblendete Ordner verwalten</h2>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.95rem' }}>
        Diese Ordner werden in der Dateiansicht ausgeblendet. Nützlich für Systemordner wie ._DAV, @eaDir, #recycle, etc.
      </p>

      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fee',
          color: '#c00',
          marginBottom: '1rem',
          borderRadius: '4px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#efe',
          color: '#0a0',
          marginBottom: '1rem',
          borderRadius: '4px',
          border: '1px solid #cfc'
        }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Ordnername (z.B. ._DAV)"
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          Hinzufügen
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        {folders.length === 0 ? (
          <p style={{ color: '#999', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
            Keine ausgeblendeten Ordner konfiguriert
          </p>
        ) : (
          folders.map((folder, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                marginBottom: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #e0e0e0'
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{folder}</span>
              <button
                onClick={() => handleRemove(index)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Entfernen
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: isSaving ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: '500'
        }}
      >
        {isSaving ? 'Speichere...' : 'Speichern'}
      </button>
    </div>
  );
}

