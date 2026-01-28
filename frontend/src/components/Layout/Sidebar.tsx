/**
 * Sidebar Komponente
 * 
 * Zeigt Ordnerstruktur für private und geteilte Notizen
 */

import FileTree from '../FileManager/FileTree';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ isOpen, onClose, isMobile = false }: SidebarProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside style={{
      width: isMobile ? '80%' : '280px',
      maxWidth: isMobile ? '320px' : 'none',
      backgroundColor: '#f8f8f8',
      borderRight: '1px solid #e0e0e0',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      position: isMobile ? 'absolute' : 'relative',
      top: isMobile ? 0 : undefined,
      bottom: isMobile ? 0 : undefined,
      left: isMobile ? 0 : undefined,
      zIndex: isMobile ? 20 : 1,
      boxShadow: isMobile ? '2px 0 12px rgba(0, 0, 0, 0.2)' : undefined
    }}>
      {isMobile && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f8f8'
        }}>
          <div style={{ fontWeight: 600 }}>Ordner</div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#666'
            }}
            aria-label="Sidebar schließen"
          >
            ✕
          </button>
        </div>
      )}
      {/* Private Ordner */}
      <FileTree 
        type="private" 
        title="Meine Notizen" 
        icon="📁"
      />

      {/* Geteilte Ordner */}
      <div style={{ borderTop: '1px solid #e0e0e0' }}>
        <FileTree 
          type="shared" 
          title="Geteilte Notizen" 
          icon="👥"
        />
      </div>
    </aside>
  );
}

