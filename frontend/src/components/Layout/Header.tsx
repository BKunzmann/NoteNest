/**
 * Header Komponente
 * 
 * Obere Navigationsleiste mit Logo, Menü-Button, Einstellungen und Profil
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import SearchBar from '../Search/SearchBar';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export default function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/settings') {
      navigate('/notes');
    } else {
      navigate('/settings');
    }
  };

  // Schließe Profilpopup bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <header style={{
      backgroundColor: 'var(--bg-primary, #fff)',
      borderBottom: '1px solid var(--border-color, #e0e0e0)',
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '56px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Left: Menu Button + Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onMenuClick}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            minWidth: '44px',
            minHeight: '44px',
            color: '#007AFF'
          }}
          aria-label="Menü"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        
        <Link 
          to="/notes" 
          style={{ 
            textDecoration: 'none', 
            color: '#007AFF',
            fontSize: '1.25rem',
            fontWeight: 'bold'
          }}
        >
          NoteNest
        </Link>
      </div>

      {/* Center: Search Bar */}
      <div style={{ flex: 1, maxWidth: '600px', margin: '0 1rem' }}>
        <SearchBar />
      </div>

      {/* Right: Settings + User Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin')}
            style={{
              padding: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#007AFF',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              minWidth: '44px',
              minHeight: '44px',
              cursor: 'pointer'
            }}
            aria-label="Admin"
            title="Benutzerverwaltung"
          >
            👑
          </button>
        )}
        <button
          onClick={handleSettingsClick}
          style={{
            padding: '0.5rem',
            background: 'none',
            border: 'none',
            color: '#007AFF',
            fontSize: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
              borderRadius: '8px',
              minWidth: '44px',
              minHeight: '44px',
            cursor: 'pointer'
          }}
          aria-label="Einstellungen"
        >
          ⚙️
        </button>

        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              minWidth: '44px',
              minHeight: '44px',
              color: '#007AFF'
            }}
            aria-label="Benutzer-Menü"
          >
            👤
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.5rem',
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '200px',
              zIndex: 1000
            }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  {user?.username}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  {user?.email || 'Keine E-Mail'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#c33'
                }}
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

