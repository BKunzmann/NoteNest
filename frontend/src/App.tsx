import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

/**
 * Root-Redirect: Weiterleitung basierend auf Auth-Status
 */
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuthStore();

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

  return <Navigate to={isAuthenticated ? '/notes' : '/login'} replace />;
}

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { loadTheme } = useThemeStore();

  useEffect(() => {
    // Prüfe Authentifizierung beim App-Start
    // Warte kurz, damit localStorage verfügbar ist
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [checkAuth]);

  useEffect(() => {
    // Lade Theme, wenn Benutzer authentifiziert ist
    if (isAuthenticated) {
      loadTheme().catch(console.error);
    } else {
      // Auch für nicht-authentifizierte Benutzer: Light Theme als Standard
      const { applyTheme } = useThemeStore.getState();
      applyTheme('light');
    }
  }, [isAuthenticated, loadTheme]);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        {/* Öffentliche Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Geschützte Routes */}
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <AppLayout>
                <NotesPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/:type/:path/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <NotesPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AdminPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Root-Route: Weiterleitung basierend auf Auth-Status */}
        <Route
          path="/"
          element={<RootRedirect />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

