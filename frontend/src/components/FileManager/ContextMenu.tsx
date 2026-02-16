import { useEffect, useRef } from 'react';

export interface ContextMenuAction {
  id: string;
  label: string;
  onClick?: () => void;
  icon?: string;
  kind?: 'action' | 'label' | 'separator';
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export default function ContextMenu({
  isOpen,
  x,
  y,
  actions,
  onClose
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || actions.length === 0) {
    return null;
  }

  const menuWidth = 220;
  const menuHeight = actions.length * 44 + 16;
  const left = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8));

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        left,
        top,
        minWidth: `${menuWidth}px`,
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
        zIndex: 2000,
        padding: '0.35rem 0'
      }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {actions.map((action) => {
        if (action.kind === 'separator') {
          return (
            <div
              key={action.id}
              style={{
                height: '1px',
                backgroundColor: 'var(--border-color)',
                margin: '0.3rem 0.5rem'
              }}
            />
          );
        }

        if (action.kind === 'label') {
          return (
            <div
              key={action.id}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem 0.9rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.45rem',
                lineHeight: 1.35,
                wordBreak: 'break-word'
              }}
            >
              {action.icon ? <span>{action.icon}</span> : null}
              <span>{action.label}</span>
            </div>
          );
        }

        return (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            onClick={() => {
              if (!action.disabled) {
                action.onClick?.();
                onClose();
              }
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              backgroundColor: 'transparent',
              padding: '0.6rem 0.9rem',
              fontSize: '0.9rem',
              color: action.disabled
                ? 'var(--text-tertiary)'
                : action.destructive
                  ? 'var(--error-color)'
                  : 'var(--text-primary)',
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem'
            }}
          >
            {action.icon ? <span>{action.icon}</span> : null}
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
