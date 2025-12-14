/**
 * Delete Confirm Dialog
 * 
 * Bestätigungs-Dialog zum Löschen von Dateien/Ordnern
 */

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'file' | 'folder';
}

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '450px',
          width: '90%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(204, 51, 51, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem'
          }}>
            ⚠️
          </div>
        </div>

        <h2 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.5rem',
          color: 'var(--text-primary)',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          {itemType === 'file' ? 'Datei löschen?' : 'Ordner löschen?'}
        </h2>
        
        <p style={{
          margin: '0 0 1.5rem 0',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          textAlign: 'center',
          fontSize: '1rem'
        }}>
          Möchten Sie <strong style={{ color: 'var(--text-primary)' }}>{itemName}</strong> wirklich löschen?
          {itemType === 'folder' && (
            <span style={{ display: 'block', marginTop: '0.5rem', color: 'var(--error-text)', fontSize: '0.9rem' }}>
              ⚠️ Alle Dateien im Ordner werden ebenfalls gelöscht.
            </span>
          )}
        </p>

        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
          marginTop: '1.5rem'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--button-bg-secondary)',
              color: 'var(--button-text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '500',
              minWidth: '120px',
              transition: 'background-color 0.2s, transform 0.1s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--button-bg-secondary)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#c33',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: '600',
              minWidth: '120px',
              boxShadow: '0 2px 8px rgba(204, 51, 51, 0.3)',
              transition: 'background-color 0.2s, transform 0.1s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b22';
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(204, 51, 51, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#c33';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(204, 51, 51, 0.3)';
            }}
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

