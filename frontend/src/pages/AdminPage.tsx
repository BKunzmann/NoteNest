/**
 * Admin Page
 * 
 * Hauptseite für Admin-Funktionen mit Tabs
 */

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import UserManagement from '../components/Admin/UserManagement';
import SharedFoldersManagement from '../components/Admin/SharedFoldersManagement';

type AdminTab = 'users' | 'shared-folders';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_admin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Zugriff verweigert</h1>
        <p>Sie haben keine Berechtigung, auf diese Seite zuzugreifen.</p>
      </div>
    );
  }

  const tabStyle = (tab: AdminTab) => ({
    padding: '1rem 2rem',
    backgroundColor: activeTab === tab ? '#007AFF' : 'transparent',
    color: activeTab === tab ? 'white' : '#007AFF',
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid #007AFF' : '3px solid transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    outline: 'none'
  });

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          gap: '0',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <button
            onClick={() => setActiveTab('users')}
            style={tabStyle('users')}
          >
            👥 Benutzerverwaltung
          </button>
          <button
            onClick={() => setActiveTab('shared-folders')}
            style={tabStyle('shared-folders')}
          >
            📁 Shared-Ordner
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'shared-folders' && <SharedFoldersManagement />}
      </div>
    </div>
  );
}

