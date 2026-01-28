/**
 * App Layout Komponente
 * 
 * Haupt-Layout mit Header, Sidebar und Content-Bereich
 */

import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomToolbar from './BottomToolbar';
import OfflineIndicator from './OfflineIndicator';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  // Initial Sidebar-Status basierend auf Bildschirmbreite
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const location = useLocation();

  // Schließe Sidebar automatisch auf Mobilgeräten bei Navigation
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location]);


  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      {/* Header */}
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
          padding: '1rem',
          position: 'relative',
          zIndex: 1
        }}>
          {children}
        </main>
      </div>

      {/* Bottom Toolbar */}
      <BottomToolbar />
      <OfflineIndicator />
    </div>
  );
}

