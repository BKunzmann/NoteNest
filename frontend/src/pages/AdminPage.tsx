/**
 * Admin Page
 * 
 * Hauptseite für Admin-Funktionen
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import UserManagement from '../components/Admin/UserManagement';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();

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

  return <UserManagement />;
}

