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

export default function Sidebar({ isOpen }: SidebarProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#f8f8f8',
      borderRight: '1px solid #e0e0e0',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
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

