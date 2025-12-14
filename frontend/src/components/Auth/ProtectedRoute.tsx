/**
 * Protected Route Komponente
 * 
 * Schützt Routen vor unauthentifiziertem Zugriff
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Prüfe Authentifizierung beim Mount
    if (!isAuthenticated && !isLoading) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Lädt...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Speichere aktuelle Location für Redirect nach Login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

