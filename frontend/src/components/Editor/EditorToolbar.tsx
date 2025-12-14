/**
 * Editor Toolbar Komponente
 * 
 * Toolbar mit Formatierungs-Buttons und View-Mode-Switches
 */

interface EditorToolbarProps {
  viewMode: 'edit' | 'preview' | 'split' | 'wysiwyg';
  onViewModeChange: (mode: 'edit' | 'preview' | 'split' | 'wysiwyg') => void;
  onSave: () => void;
  isDirty: boolean;
  isSaving: boolean;
  onInsertText: (before: string, after?: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function EditorToolbar({
  viewMode,
  onViewModeChange,
  onSave,
  isDirty,
  isSaving,
  onInsertText,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: EditorToolbarProps) {
  const buttonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginRight: '0.5rem'
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--accent-color)',
    color: 'white',
    border: '1px solid var(--accent-color)'
  };

  return (
    <div style={{
      padding: '0.75rem 1rem',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap'
    }}>
      {/* View Mode Buttons */}
      <div style={{ display: 'flex', gap: '0.25rem', marginRight: '1rem' }}>
        <button
          onClick={() => onViewModeChange('edit')}
          style={viewMode === 'edit' ? activeButtonStyle : buttonStyle}
          title="Nur Editor"
        >
          ✏️ Editor
        </button>
        <button
          onClick={() => onViewModeChange('split')}
          style={viewMode === 'split' ? activeButtonStyle : buttonStyle}
          title="Editor + Vorschau"
        >
          ⚡ Split
        </button>
        <button
          onClick={() => onViewModeChange('preview')}
          style={viewMode === 'preview' ? activeButtonStyle : buttonStyle}
          title="Nur Vorschau"
        >
          👁️ Vorschau
        </button>
        <button
          onClick={() => onViewModeChange('wysiwyg')}
          style={viewMode === 'wysiwyg' ? activeButtonStyle : buttonStyle}
          title="Bearbeitbare Vorschau (WYSIWYG)"
        >
          ✍️ WYSIWYG
        </button>
      </div>

      {/* Undo/Redo Buttons */}
      <div style={{ display: 'flex', gap: '0.25rem', marginRight: '1rem' }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            padding: '0.375rem 0.5rem',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            backgroundColor: canUndo ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
            color: canUndo ? 'var(--text-primary)' : 'var(--text-tertiary)',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '32px',
            height: '32px',
            opacity: canUndo ? 1 : 0.5,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (canUndo) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (canUndo) {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }
          }}
          title="Rückgängig (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            padding: '0.375rem 0.5rem',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            backgroundColor: canRedo ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
            color: canRedo ? 'var(--text-primary)' : 'var(--text-tertiary)',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '32px',
            height: '32px',
            opacity: canRedo ? 1 : 0.5,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (canRedo) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (canRedo) {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }
          }}
          title="Wiederholen (Ctrl+Y)"
        >
          ↷
        </button>
      </div>

      {/* Format Buttons */}
      <div style={{ display: 'flex', gap: '0.25rem', marginRight: '1rem' }}>
        {viewMode === 'wysiwyg' ? (
          <>
            <button
              onClick={() => {
                const editor = document.querySelector('.wysiwyg-editor') as HTMLElement;
                if (editor) {
                  editor.focus();
                  document.execCommand('formatBlock', false, 'h1');
                  editor.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              style={buttonStyle}
              title="Überschrift H1"
            >
              H1
            </button>
            <button
              onClick={() => {
                const editor = document.querySelector('.wysiwyg-editor') as HTMLElement;
                if (editor) {
                  editor.focus();
                  document.execCommand('bold', false);
                  editor.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              style={buttonStyle}
              title="Fett (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => {
                const editor = document.querySelector('.wysiwyg-editor') as HTMLElement;
                if (editor) {
                  editor.focus();
                  document.execCommand('italic', false);
                  editor.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              style={buttonStyle}
              title="Kursiv (Ctrl+I)"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => {
                const editor = document.querySelector('.wysiwyg-editor') as HTMLElement;
                if (editor) {
                  editor.focus();
                  document.execCommand('formatBlock', false, 'pre');
                  editor.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              style={buttonStyle}
              title="Code"
            >
              {'</>'}
            </button>
            <button
              onClick={() => {
                const editor = document.querySelector('.wysiwyg-editor') as HTMLElement;
                if (editor) {
                  editor.focus();
                  document.execCommand('insertUnorderedList', false);
                  editor.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              style={buttonStyle}
              title="Liste"
            >
              •
            </button>
            <button
              onClick={() => {
                const editor = document.querySelector('.wysiwyg-editor') as HTMLElement;
                if (editor) {
                  editor.focus();
                  document.execCommand('formatBlock', false, 'blockquote');
                  editor.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              style={buttonStyle}
              title="Zitat"
            >
              "
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onInsertText('# ', '')}
              style={buttonStyle}
              title="Überschrift"
            >
              H1
            </button>
            <button
              onClick={() => onInsertText('**', '**')}
              style={buttonStyle}
              title="Fett"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => onInsertText('*', '*')}
              style={buttonStyle}
              title="Kursiv"
            >
              <em>I</em>
            </button>
            <button
              onClick={() => onInsertText('`', '`')}
              style={buttonStyle}
              title="Code"
            >
              {'</>'}
            </button>
            <button
              onClick={() => onInsertText('- ', '')}
              style={buttonStyle}
              title="Liste"
            >
              •
            </button>
            <button
              onClick={() => onInsertText('> ', '')}
              style={buttonStyle}
              title="Zitat"
            >
              "
            </button>
          </>
        )}
      </div>

      {/* Save Button */}
      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          style={{
            ...buttonStyle,
            backgroundColor: isDirty ? 'var(--accent-color)' : 'var(--bg-tertiary)',
            color: isDirty ? 'white' : 'var(--text-tertiary)',
            cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed',
            opacity: isDirty && !isSaving ? 1 : 0.6
          }}
          title={isDirty ? 'Speichern (Ctrl+S)' : 'Keine Änderungen'}
        >
          {isDirty ? '💾 Speichern' : '✓ Gespeichert'}
        </button>
      </div>
    </div>
  );
}

