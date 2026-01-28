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
  const selectedFile = useFileStore((state) => state.selectedFile);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && selectedFile) {
      setSidebarOpen(false);
    }
  }, [isMobile, selectedFile]);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

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
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 10
            }}
          />
        )}

        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          isMobile={isMobile}
        />

        {/* Content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
          padding: isMobile ? '0.75rem' : '1rem',
          position: 'relative',
          zIndex: 1,
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

