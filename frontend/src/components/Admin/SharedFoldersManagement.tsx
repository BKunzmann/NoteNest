/**
 * Admin Shared Folders Management Komponente
 * 
 * Verwaltet Shared-Ordner-Zugriffe für Benutzer
 */

import { useState, useEffect } from 'react';
import {
  adminAPI,
  AdminUser,
  SharedFolder,
  UserSharedFolder
} from '../../services/api';

export default function SharedFoldersManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [availableFolders, setAvailableFolders] = useState<SharedFolder[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userFolders, setUserFolders] = useState<UserSharedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedFolderToAdd, setSelectedFolderToAdd] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserFolders(selectedUser.id);
    }
  }, [selectedUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersResponse, foldersResponse] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getSharedFolders()
      ]);
      setUsers(usersResponse.users);
      setAvailableFolders(foldersResponse.folders);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const loadUserFolders = async (userId: number) => {
    try {
      setError(null);
      const response = await adminAPI.getUserSharedFolders(userId);
      setUserFolders(response.folders);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden der Benutzer-Ordner');
    }
  };

  const handleAddFolder = async () => {
    if (!selectedUser || !selectedFolderToAdd) return;

    try {
      setError(null);
      setSuccess(null);
      await adminAPI.addUserSharedFolder(selectedUser.id, selectedFolderToAdd);
      setSuccess(`Ordner "${selectedFolderToAdd}" erfolgreich für ${selectedUser.username} freigegeben`);
      setShowAddDialog(false);
      setSelectedFolderToAdd('');
      await loadUserFolders(selectedUser.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Hinzufügen des Ordners');
    }
  };

  const handleRemoveFolder = async (folderId: number, folderPath: string) => {
    if (!selectedUser) return;

    if (!confirm(`Möchten Sie wirklich den Zugriff auf "${folderPath}" für ${selectedUser.username} entfernen?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await adminAPI.removeUserSharedFolder(selectedUser.id, folderId);
      setSuccess(`Zugriff auf "${folderPath}" erfolgreich entfernt`);
      await loadUserFolders(selectedUser.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Entfernen des Ordners');
    }
  };

  // Verfügbare Ordner zum Hinzufügen (noch nicht zugewiesen)
  const getAvailableFoldersToAdd = (): SharedFolder[] => {
    if (!availableFolders) return [];
    const userFolderPaths = userFolders.map(uf => uf.folder_path);
    return availableFolders.filter(folder => 
      folder.exists && !userFolderPaths.includes(folder.name)
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        Lädt Shared-Ordner...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Shared-Ordner Verwaltung</h1>

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

      {availableFolders.length === 0 ? (
        <div style={{
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#666' }}>
            Keine Shared-Ordner verfügbar. Bitte konfigurieren Sie Shared-Ordner in der docker-compose.yml.
          </p>
          <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: '#999' }}>
            Siehe: docs/NAS_SETUP_GUIDE.md
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Benutzer-Liste */}
          <div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Benutzer</h2>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid #e0e0e0',
                    cursor: 'pointer',
                    backgroundColor: selectedUser?.id === user.id ? '#e3f2fd' : 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedUser?.id !== user.id) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUser?.id !== user.id) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{user.username}</div>
                  {user.is_admin && (
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.125rem 0.5rem',
                      backgroundColor: '#ffd700',
                      borderRadius: '4px',
                      marginTop: '0.25rem',
                      display: 'inline-block'
                    }}>
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Shared-Ordner des ausgewählten Users */}
          <div>
            {selectedUser ? (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                    Shared-Ordner für {selectedUser.username}
                  </h2>
                  <button
                    onClick={() => setShowAddDialog(true)}
                    disabled={getAvailableFoldersToAdd().length === 0}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: getAvailableFoldersToAdd().length === 0 ? '#ccc' : '#007AFF',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: getAvailableFoldersToAdd().length === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                  >
                    + Ordner hinzufügen
                  </button>
                </div>

                {userFolders.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: 0, color: '#666' }}>
                      Noch keine Shared-Ordner zugewiesen
                    </p>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {userFolders.map((folder) => (
                      <div
                        key={folder.id}
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #e0e0e0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '500' }}>📁 {folder.folder_path}</div>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                            Zugewiesen: {new Date(folder.created_at).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFolder(folder.id, folder.folder_path)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          Entfernen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                padding: '2rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, color: '#666' }}>
                  Wählen Sie einen Benutzer aus, um dessen Shared-Ordner zu verwalten
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog: Ordner hinzufügen */}
      {showAddDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Shared-Ordner hinzufügen</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Wählen Sie einen Ordner aus, den {selectedUser?.username} sehen soll
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="folderSelect"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}
              >
                Ordner auswählen
              </label>
              <select
                id="folderSelect"
                value={selectedFolderToAdd}
                onChange={(e) => setSelectedFolderToAdd(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="">-- Ordner wählen --</option>
                {getAvailableFoldersToAdd().map((folder) => (
                  <option key={folder.name} value={folder.name}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setSelectedFolderToAdd('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddFolder}
                disabled={!selectedFolderToAdd}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: selectedFolderToAdd ? '#007AFF' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedFolderToAdd ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

