/**
 * App Layout Komponente
 * 
 * Haupt-Layout mit Header, Sidebar und Content-Bereich
 */

import { ReactNode, useState, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomToolbar from './BottomToolbar';
import OfflineIndicator from './OfflineIndicator';
import { useFileStore } from '../../store/fileStore';
import { useEditorStore } from '../../store/editorStore';

interface AppLayoutProps {
  children: ReactNode;
}

// Breakpoint für mobile Geräte
const MOBILE_BREAKPOINT = 768;
const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 620;
const SIDEBAR_DEFAULT_WIDTH = 320;
const SIDEBAR_WIDTH_STORAGE_KEY = 'notenest.sidebar.width';

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
      if (!raw) {
        return SIDEBAR_DEFAULT_WIDTH;
      }
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) {
        return SIDEBAR_DEFAULT_WIDTH;
      }
      return clampSidebarWidth(parsed);
    } catch {
      return SIDEBAR_DEFAULT_WIDTH;
    }
  });
  const { selectedFile } = useFileStore();
  const isPreviewFullscreen = useEditorStore((state) => state.isPreviewFullscreen);
  const effectiveSidebarWidth = isMobile ? Math.min(sidebarWidth, 380) : sidebarWidth;

  // Prüfe auf mobile Geräte
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
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

  useEffect(() => {
    const handleOpenSidebar = () => {
      setSidebarOpen(true);
    };

    window.addEventListener('notenest:open-sidebar', handleOpenSidebar as EventListener);
    return () => window.removeEventListener('notenest:open-sidebar', handleOpenSidebar as EventListener);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
    } catch {
      // optional
    }
  }, [sidebarWidth]);

  const handleSidebarResizeStart = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (isMobile || !sidebarOpen) {
      return;
    }
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setSidebarWidth(clampSidebarWidth(startWidth + delta));
    };

    const handleMouseUp = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isMobile, sidebarOpen, sidebarWidth]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      {/* Header */}
      {!isPreviewFullscreen && (
        <Header 
          onMenuClick={handleMenuClick}
          sidebarOpen={sidebarOpen}
        />
      )}

      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Mobile Overlay */}
        {!isPreviewFullscreen && isMobile && sidebarOpen && (
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
        {!isPreviewFullscreen && (
          <div style={{
            position: isMobile ? 'fixed' : 'relative',
            top: isMobile ? '60px' : 0, // Unterhalb des Headers
            left: 0,
            bottom: isMobile ? '60px' : 0, // Oberhalb der BottomToolbar
            zIndex: isMobile ? 100 : 'auto',
            transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 0.3s ease',
            height: isMobile ? 'auto' : '100%',
            width: isMobile
              ? `min(92vw, ${effectiveSidebarWidth}px)`
              : (sidebarOpen ? `${effectiveSidebarWidth}px` : '0px'),
            minWidth: isMobile
              ? `min(92vw, ${effectiveSidebarWidth}px)`
              : (sidebarOpen ? `${effectiveSidebarWidth}px` : '0px'),
            maxWidth: isMobile
              ? `min(92vw, ${effectiveSidebarWidth}px)`
              : (sidebarOpen ? `${effectiveSidebarWidth}px` : '0px'),
            flexShrink: 0
          }}>
            <Sidebar 
              isOpen={sidebarOpen}
              onClose={handleSidebarClose}
              width={effectiveSidebarWidth}
            />
          </div>
        )}

        {!isPreviewFullscreen && !isMobile && sidebarOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Sidebar-Breite anpassen"
            onMouseDown={handleSidebarResizeStart}
            style={{
              width: '6px',
              cursor: 'col-resize',
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = 'rgba(10, 132, 255, 0.2)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Sidebar-Breite ziehen"
          />
        )}

        {/* Content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
          padding: isPreviewFullscreen ? 0 : '1rem',
          position: 'relative',
          zIndex: 1,
          // Auf mobilen Geräten volle Breite
          width: isMobile ? '100%' : 'auto'
        }}>
          {children}
        </main>
      </div>

      {/* Bottom Toolbar */}
      {!isPreviewFullscreen && <BottomToolbar />}
      <OfflineIndicator />
    </div>
  );
}

