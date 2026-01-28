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
      minWidth: isMobile ? '0' : '280px',
      maxWidth: isMobile ? '320px' : '280px',
      backgroundColor: 'var(--bg-secondary, #f8f8f8)',
      borderRight: '1px solid var(--border-color, #e0e0e0)',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
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
        onFileSelect={onClose}
      />

      {/* Geteilte Ordner */}
      <div style={{ borderTop: '1px solid var(--border-color, #e0e0e0)' }}>
        <FileTree 
          type="shared" 
          title="Geteilte Notizen" 
          icon="👥"
          onFileSelect={onClose}
        />
      </div>
    </aside>
  );
}

