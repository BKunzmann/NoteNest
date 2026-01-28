/**
 * App Layout Komponente
 * 
 * Haupt-Layout mit Header, Sidebar und Content-Bereich
 */

import { ReactNode, useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomToolbar from './BottomToolbar';
import OfflineIndicator from './OfflineIndicator';
import { useFileStore } from '../../store/fileStore';

interface AppLayoutProps {
  children: ReactNode;
}

// Breakpoint für mobile Geräte
const MOBILE_BREAKPOINT = 768;

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { selectedFile } = useFileStore();

  // Prüfe auf mobile Geräte
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      // Sidebar standardmäßig geschlossen auf mobile
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Schließe Sidebar automatisch auf mobile, wenn eine Notiz geöffnet wird
  useEffect(() => {
    if (isMobile && selectedFile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [selectedFile, isMobile]);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      {/* Header */}
      <Header 
        onMenuClick={handleMenuClick}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            onClick={handleSidebarClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 99,
              transition: 'opacity 0.3s ease'
            }}
          />
        )}

        {/* Sidebar */}
        <div style={{
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? '60px' : 0, // Unterhalb des Headers
          left: 0,
          bottom: isMobile ? '60px' : 0, // Oberhalb der BottomToolbar
          zIndex: isMobile ? 100 : 'auto',
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease',
          height: isMobile ? 'auto' : '100%'
        }}>
          <Sidebar 
            isOpen={sidebarOpen}
            onClose={handleSidebarClose}
          />
        </div>

        {/* Content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
          padding: '1rem',
          position: 'relative',
          zIndex: 1,
          // Auf mobilen Geräten volle Breite
          width: isMobile ? '100%' : 'auto'
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

