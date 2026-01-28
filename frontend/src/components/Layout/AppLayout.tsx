/**
 * App Layout Komponente
 * 
 * Haupt-Layout mit Header, Sidebar und Content-Bereich
 */

import { ReactNode, useEffect, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomToolbar from './BottomToolbar';
import OfflineIndicator from './OfflineIndicator';
import { useFileStore } from '../../store/fileStore';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const getIsMobile = () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [isMobile, setIsMobile] = useState(getIsMobile());
  const [sidebarOpen, setSidebarOpen] = useState(!getIsMobile());
  const selectedFile = useFileStore((state) => state.selectedFile);

  useEffect(() => {
    const handleResize = () => setIsMobile(getIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Sidebar */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
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
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />

        {/* Content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
          padding: isMobile ? '0.75rem' : '1rem',
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

