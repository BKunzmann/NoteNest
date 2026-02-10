/**
 * Sidebar Komponente
 * 
 * Zeigt Ordnerstruktur für private und geteilte Notizen
 */

import FileTree from '../FileManager/FileTree';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside style={{
      width: isOpen ? '280px' : '0px',
      minWidth: isOpen ? '280px' : '0px',
      maxWidth: isOpen ? '280px' : '0px',
      backgroundColor: 'var(--bg-secondary, #f8f8f8)',
      borderRight: isOpen ? '1px solid var(--border-color, #e0e0e0)' : 'none',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'width 0.2s ease, min-width 0.2s ease, opacity 0.2s ease'
    }}>
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

