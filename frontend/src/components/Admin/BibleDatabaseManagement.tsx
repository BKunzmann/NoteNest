/**
 * Admin Bible Database Management Komponente
 *
 * Zeigt Status der Bibel-Datenbank und erlaubt einen Neuimport.
 */

import { useEffect, useState } from 'react';
import { adminAPI, AdminBibleStatusResponse } from '../../services/api';

export default function BibleDatabaseManagement() {
  const [status, setStatus] = useState<AdminBibleStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reimporting, setReimporting] = useState(false);
  const [clearCache, setClearCache] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getBibleStatus();
      setStatus(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden des Bibel-Status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleReimport = async () => {
    const confirmed = confirm(
      'Bibel-Datenbank jetzt neu importieren?\n\n' +
      'Vorhandene Verse werden dabei überschrieben/neu aufgebaut.'
    );
    if (!confirmed) {
      return;
    }

    try {
      setReimporting(true);
      setError(null);
      setSuccess(null);

      const response = await adminAPI.reimportBibleDatabase(clearCache);
      const result = response.result;

      setSuccess(
        `${response.message} Gelöscht: ${result.deletedVerses} Verse` +
        `${clearCache ? `, ${result.deletedCacheEntries} Cache-Einträge` : ''}.`
      );

      await loadStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Neuimport der Bibel-Datenbank');
    } finally {
      setReimporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Lade Bibel-Datenbank-Status...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Bibel-Datenbank</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Hier kann der Import lokaler Bibel-JSON-Dateien manuell neu angestoßen werden.
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
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>Verse gesamt</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{status?.verseCount ?? 0}</div>
        </div>
        <div style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>Cache-Einträge</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{status?.cacheCount ?? 0}</div>
        </div>
        <div style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ color: '#666', fontSize: '0.875rem' }}>JSON-Dateien</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{status?.availableJsonFiles?.length ?? 0}</div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Pfade</h2>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Konfigurierter Pfad (BIBLE_LOCAL_PATH):</strong>{' '}
          <code>{status?.configuredPath || 'nicht gesetzt'}</code>
        </div>
        <div>
          <strong>Verwendeter Pfad:</strong>{' '}
          <code>{status?.resolvedPath || 'kein gültiger Pfad gefunden'}</code>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Importierte Übersetzungen</h2>
        {status?.translations?.length ? (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {status.translations.map((item) => (
              <li key={item.translation}>
                <strong>{item.translation}</strong>: {item.count.toLocaleString('de-DE')} Verse
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: '#666' }}>Noch keine Übersetzungen importiert.</div>
        )}
      </div>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Gefundene JSON-Dateien</h2>
        {status?.availableJsonFiles?.length ? (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {status.availableJsonFiles.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        ) : (
          <div style={{ color: '#666' }}>Keine JSON-Dateien gefunden.</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={clearCache}
            onChange={(event) => setClearCache(event.target.checked)}
            disabled={reimporting}
          />
          Bible-Cache beim Neuimport leeren
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button
          onClick={() => void loadStatus()}
          disabled={loading || reimporting}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            cursor: loading || reimporting ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem'
          }}
        >
          Status neu laden
        </button>
        <button
          onClick={() => void handleReimport()}
          disabled={reimporting}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: reimporting ? '#ccc' : '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: reimporting ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}
        >
          {reimporting ? 'Import läuft...' : 'Bibel-Datenbank neu einlesen'}
        </button>
      </div>
    </div>
  );
}

