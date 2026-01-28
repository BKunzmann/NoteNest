/**
 * Admin User Management Komponente
 * 
 * Verwaltet Benutzer: Anzeigen, Erstellen, Löschen, Passwort zurücksetzen
 */

import { useState, useEffect } from 'react';
import { adminAPI, AdminUser, CreateUserRequest } from '../../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    username: '',
    password: '',
    email: '',
    isAdmin: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getUsers();
      setUsers(response.users);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await adminAPI.createUser(createForm);
      setShowCreateDialog(false);
      setCreateForm({ username: '', password: '', email: '', isAdmin: false });
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Benutzers');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }
    try {
      setError(null);
      await adminAPI.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Löschen des Benutzers');
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!resetPassword || resetPassword.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    try {
      setError(null);
      await adminAPI.resetPassword(userId, resetPassword);
      setShowResetPasswordDialog(null);
      setResetPassword('');
      alert('Passwort wurde erfolgreich zurückgesetzt');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Zurücksetzen des Passworts');
    }
  };

  const handleToggleAdmin = async (userId: number, currentStatus: boolean) => {
    try {
      setError(null);
      await adminAPI.updateUserRole(userId, !currentStatus);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Aktualisieren der Admin-Rechte');
    }
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    try {
      setError(null);
      await adminAPI.updateUserStatus(userId, !currentStatus);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Aktualisieren des Status');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Lädt Benutzer...
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="admin-header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>Benutzerverwaltung</h1>
        <button
          onClick={() => setShowCreateDialog(true)}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          + Neuer Benutzer
        </button>
      </div>

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

      {/* Scrollbarer Tabellen-Container */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px'
      }}>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Benutzername</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>E-Mail</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Auth-Typ</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Admin</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Erstellt</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '1rem' }}>{user.username}</td>
                  <td style={{ padding: '1rem' }}>{user.email || '-'}</td>
                  <td style={{ padding: '1rem' }}>{user.auth_type}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      backgroundColor: user.is_active ? '#d4edda' : '#f8d7da',
                      color: user.is_active ? '#155724' : '#721c24'
                    }}>
                      {user.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      backgroundColor: user.is_admin ? '#cfe2ff' : '#e9ecef',
                      color: user.is_admin ? '#084298' : '#495057'
                    }}>
                      {user.is_admin ? 'Admin' : 'Benutzer'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666' }}>
                    {new Date(user.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {user.auth_type === 'local' && (
                        <button
                          onClick={() => setShowResetPasswordDialog(user.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          Passwort
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: user.is_admin ? '#dc3545' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {user.is_admin ? 'Admin entfernen' : 'Admin setzen'}
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: user.is_active ? '#dc3545' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {user.is_active ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Dialog */}
      {showCreateDialog && (
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
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0 }}>Neuen Benutzer erstellen</h2>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Benutzername *
                </label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                  minLength={3}
                  maxLength={50}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Passwort *
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  E-Mail
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={createForm.isAdmin}
                    onChange={(e) => setCreateForm({ ...createForm, isAdmin: e.target.checked })}
                  />
                  <span>Als Administrator erstellen</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setCreateForm({ username: '', password: '', email: '', isAdmin: false });
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#007AFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      {showResetPasswordDialog && (
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
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0 }}>Passwort zurücksetzen</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Neues Passwort *
              </label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowResetPasswordDialog(null);
                  setResetPassword('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => handleResetPassword(showResetPasswordDialog)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

