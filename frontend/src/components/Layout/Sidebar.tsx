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
  if (!isOpen) {
    return null;
  }

  return (
    <aside style={{
      width: '280px',
      minWidth: '280px',
      maxWidth: '280px',
      backgroundColor: 'var(--bg-secondary, #f8f8f8)',
      borderRight: '1px solid var(--border-color, #e0e0e0)',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
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

