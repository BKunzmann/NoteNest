/**
 * Header Komponente
 * 
 * Obere Navigationsleiste mit Logo, Menü-Button, Einstellungen und Profil
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import SearchBar from '../Search/SearchBar';
import { getVersionString } from '../../config/version';
import { searchAPI, systemAPI, type HealthResponse, type SearchIndexStatusResponse } from '../../services/api';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export default function Header({ onMenuClick, sidebarOpen }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = Boolean(user?.is_admin);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCompact, setIsCompact] = useState<boolean>(() => window.innerWidth < 700);
  const [indexStatus, setIndexStatus] = useState<SearchIndexStatusResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [isTriggeringReindex, setIsTriggeringReindex] = useState(false);
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

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 700);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    setDiagnosticsError(null);
    try {
      const [indexInfo, healthInfo] = await Promise.all([
        searchAPI.getIndexStatus(),
        systemAPI.getHealth()
      ]);
      setIndexStatus(indexInfo);
      setHealthStatus(healthInfo);
    } catch (error) {
      setDiagnosticsError('Statusdaten konnten nicht geladen werden');
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    if (!showUserMenu) {
      return;
    }
    void loadDiagnostics();
  }, [showUserMenu]);

  useEffect(() => {
    if (!showUserMenu || !indexStatus?.reindex?.isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadDiagnostics();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [indexStatus?.reindex?.isRunning, showUserMenu]);

  const formatIsoToLocal = (value?: string | null): string => {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString('de-DE');
  };

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
            borderRadius: '4px',
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
            fontSize: isCompact ? '1rem' : '1.25rem',
            fontWeight: 'bold'
          }}
        >
          {isCompact ? 'NN' : 'NoteNest'}
        </Link>
      </div>

      {/* Center: Search Bar */}
      <div style={{ flex: 1, maxWidth: isCompact ? '100%' : '600px', margin: isCompact ? '0 0.4rem' : '0 1rem' }}>
        <SearchBar />
      </div>

      {/* Right: Settings + User Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isAdmin && (
          <button
            onClick={() => {
              if (location.pathname === '/admin') {
                navigate('/notes');
              } else {
                navigate('/admin');
              }
            }}
            style={{
              padding: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#007AFF',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            aria-label="Adminpanel"
            title={location.pathname === '/admin' ? 'Zurück zu Notizen' : 'Adminpanel'}
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
            borderRadius: '4px',
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
              borderRadius: '4px',
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
              <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #e0e0e0', fontSize: '0.78rem', color: '#555' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Indexstatus</div>
                {isLoadingDiagnostics ? (
                  <div>Lädt…</div>
                ) : diagnosticsError ? (
                  <div style={{ color: '#c33' }}>{diagnosticsError}</div>
                ) : (
                  <>
                    <div>Dateien: {indexStatus?.indexedFiles ?? 0} · Tokens: {indexStatus?.tokenCount ?? 0}</div>
                    <div>Metadaten: {indexStatus?.metadataFiles ?? 0}</div>
                    <div>Zuletzt indexiert: {formatIsoToLocal(indexStatus?.latestIndexedAt)}</div>
                    <div style={{ marginTop: '0.2rem' }}>
                      {indexStatus?.reindex?.isRunning
                        ? `Reindex läuft: ${indexStatus.reindex.current}/${indexStatus.reindex.total || '?'}`
                        : `Letzter Reindex: ${formatIsoToLocal(indexStatus?.reindex?.finishedAt || indexStatus?.reindex?.startedAt)}`}
                    </div>
                  </>
                )}
                <button
                  type="button"
                  disabled={isTriggeringReindex || indexStatus?.reindex?.isRunning}
                  onClick={async () => {
                    setIsTriggeringReindex(true);
                    setDiagnosticsError(null);
                    try {
                      await searchAPI.triggerReindex();
                      await loadDiagnostics();
                    } catch {
                      setDiagnosticsError('Reindex konnte nicht gestartet werden');
                    } finally {
                      setIsTriggeringReindex(false);
                    }
                  }}
                  style={{
                    marginTop: '0.45rem',
                    width: '100%',
                    border: '1px solid #d0d0d0',
                    borderRadius: '6px',
                    backgroundColor: '#f5f5f5',
                    cursor: isTriggeringReindex || indexStatus?.reindex?.isRunning ? 'not-allowed' : 'pointer',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.76rem',
                    color: '#333',
                    opacity: isTriggeringReindex || indexStatus?.reindex?.isRunning ? 0.7 : 1
                  }}
                >
                  {isTriggeringReindex
                    ? 'Startet…'
                    : indexStatus?.reindex?.isRunning
                      ? 'Reindex läuft'
                      : 'Index aktualisieren'}
                </button>
              </div>
              <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #e0e0e0', fontSize: '0.78rem', color: '#555' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Serverstatus</div>
                {healthStatus ? (
                  <>
                    <div>RAM (RSS): {healthStatus.memory.rss}</div>
                    <div>Heap: {healthStatus.memory.heapUsed} / {healthStatus.memory.heapTotal}</div>
                    <div>
                      CPU: {healthStatus.cpu?.cores ?? '—'} Kerne · Load 1m: {healthStatus.cpu?.load1m ?? '—'}
                    </div>
                  </>
                ) : (
                  <div>Keine Daten</div>
                )}
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
              <div style={{
                padding: '0.55rem 1rem',
                borderTop: '1px solid #e0e0e0',
                fontSize: '0.72rem',
                color: '#777'
              }}>
                {getVersionString()} · © Benjamin Kunzmann
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
