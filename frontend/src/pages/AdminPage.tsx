/**
 * Admin Page
 * 
 * Zentrale Verwaltungsseite fuer Admin-Funktionen
 */

import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import UserManagement from '../components/Admin/UserManagement';
import SharedFoldersManagement from '../components/Admin/SharedFoldersManagement';
import HiddenFoldersManagement from '../components/Admin/HiddenFoldersManagement';

type AdminTab = 'users' | 'shared' | 'hidden';

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'users', label: 'Benutzer' },
  { id: 'shared', label: 'Shared-Ordner' },
  { id: 'hidden', label: 'Ausgeblendete Ordner' }
];

export default function AdminPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  if (!user?.is_admin) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#666'
      }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Admin-Panel</h1>
        <p>Sie haben keine Berechtigung, diese Seite zu sehen.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <h1 style={{ margin: 0 }}>Admin-Panel</h1>
        <div style={{ color: '#666' }}>
          Eingeloggt als: <strong>{user.username}</strong>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        marginBottom: '1.5rem'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: activeTab === tab.id ? '1px solid #007AFF' : '1px solid #e0e0e0',
              backgroundColor: activeTab === tab.id ? '#e9f2ff' : '#fff',
              color: activeTab === tab.id ? '#007AFF' : '#333',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 500
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'shared' && <SharedFoldersManagement />}
        {activeTab === 'hidden' && <HiddenFoldersManagement />}
      </div>
    </div>
  );
}
 