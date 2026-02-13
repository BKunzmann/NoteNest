import { useEffect, useState, type CSSProperties } from 'react';

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
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const runWysiwygCommand = (command: string, value?: string) => {
    const editor = document.querySelector('.wysiwyg-editor') as HTMLElement | null;
    if (!editor) {
      return;
    }
    editor.focus();
    document.execCommand(command, false, value);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const handleFormatChange = (value: string) => {
    if (!value) {
      return;
    }

    if (viewMode === 'wysiwyg') {
      switch (value) {
        case 'h1':
          runWysiwygCommand('formatBlock', 'h1');
          return;
        case 'h2':
          runWysiwygCommand('formatBlock', 'h2');
          return;
        case 'h3':
          runWysiwygCommand('formatBlock', 'h3');
          return;
        case 'p':
          runWysiwygCommand('formatBlock', 'p');
          return;
        case 'code':
          runWysiwygCommand('formatBlock', 'pre');
          return;
        default:
          return;
      }
    }

    switch (value) {
      case 'h1':
        onInsertText('# ', '');
        return;
      case 'h2':
        onInsertText('## ', '');
        return;
      case 'h3':
        onInsertText('### ', '');
        return;
      case 'p':
        onInsertText('', '');
        return;
      case 'code':
        onInsertText('`', '`');
        return;
      default:
        return;
    }
  };

  const handleListChange = (value: string) => {
    if (!value) {
      return;
    }

    if (viewMode === 'wysiwyg') {
      if (value === 'ordered') {
        runWysiwygCommand('insertOrderedList');
        return;
      }
      runWysiwygCommand('insertUnorderedList');
      return;
    }

    switch (value) {
      case 'bullet':
        onInsertText('- ', '');
        return;
      case 'bullet-indented':
        onInsertText('  - ', '');
        return;
      case 'hyphen':
        onInsertText('- ', '');
        return;
      case 'hyphen-indented':
        onInsertText('  - ', '');
        return;
      case 'ordered':
        onInsertText('1. ', '');
        return;
      case 'ordered-indented':
        onInsertText('   a. ', '');
        return;
      default:
        return;
    }
  };

  const handleInsertLink = () => {
    const url = window.prompt('URL eingeben (https://...)');
    if (!url) {
      return;
    }
    const label = window.prompt('Link-Text (optional)');

    if (viewMode === 'wysiwyg') {
      runWysiwygCommand('createLink', url);
      return;
    }

    const safeLabel = label && label.trim().length > 0 ? label.trim() : url.trim();
    onInsertText(`[${safeLabel}](`, `${url.trim()})`);
  };

  const buttonStyle: CSSProperties = {
    padding: isMobile ? '0.4rem 0.5rem' : '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: isMobile ? '0.78rem' : '0.875rem',
    marginRight: isMobile ? '0.25rem' : '0.5rem',
    minHeight: '44px',
    minWidth: isMobile ? '40px' : '44px',
    flexShrink: 0
  };

  const activeButtonStyle: CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--accent-color)',
    color: 'white',
    border: '1px solid var(--accent-color)'
  };

  return (
    <div style={{
      padding: isMobile ? '0.45rem 0.55rem' : '0.75rem 1rem',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      flexWrap: isMobile ? 'nowrap' : 'wrap',
      overflowX: isMobile ? 'auto' : 'visible'
    }}>
      {/* View-Mode Auswahlfeld */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: isMobile ? '0.2rem' : '0.8rem', flexShrink: 0 }}>
        <select
          value={viewMode}
          onChange={(event) => onViewModeChange(event.target.value as 'edit' | 'preview' | 'split' | 'wysiwyg')}
          style={{
            ...buttonStyle,
            marginRight: 0,
            minWidth: isMobile ? '120px' : '170px'
          }}
          title="Editor-Modus auswählen"
        >
          <option value="wysiwyg">WYSIWYG</option>
          <option value="edit">Markdown</option>
          <option value="split">Split</option>
          <option value="preview">Vorschau</option>
        </select>
      </div>

      {/* Undo/Redo Buttons */}
      <div style={{ display: 'flex', gap: '0.25rem', marginRight: isMobile ? '0.25rem' : '1rem', flexShrink: 0 }}>
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
            minWidth: '44px',
            height: '44px',
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
            minWidth: '44px',
            height: '44px',
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
      <div style={{ display: 'flex', gap: '0.25rem', marginRight: isMobile ? '0.25rem' : '1rem', flexShrink: 0, alignItems: 'center' }}>
        <select
          value=""
          onChange={(event) => {
            handleFormatChange(event.target.value);
            event.target.value = '';
          }}
          style={{
            ...buttonStyle,
            marginRight: 0,
            minWidth: isMobile ? '86px' : '120px'
          }}
          title="Textformat (Aa)"
        >
          <option value="">Aa</option>
          <option value="h1">Titel (H1)</option>
          <option value="h2">Überschrift (H2)</option>
          <option value="h3">Unterüberschrift (H3)</option>
          <option value="p">Normalschrift</option>
          <option value="code">Inline-Code</option>
        </select>

        <select
          value=""
          onChange={(event) => {
            handleListChange(event.target.value);
            event.target.value = '';
          }}
          style={{
            ...buttonStyle,
            marginRight: 0,
            minWidth: isMobile ? '90px' : '135px'
          }}
          title="Listen-Auswahl"
        >
          <option value="">Listen</option>
          <option value="bullet">• Punkte</option>
          <option value="bullet-indented">◦ Punkte (2. Ebene)</option>
          <option value="hyphen">- Bindestrich</option>
          <option value="hyphen-indented">- Bindestrich (2. Ebene)</option>
          <option value="ordered">1. Nummeriert</option>
          <option value="ordered-indented">a. Nummeriert (2. Ebene)</option>
        </select>

        <button
          onClick={() => (viewMode === 'wysiwyg' ? runWysiwygCommand('bold') : onInsertText('**', '**'))}
          style={viewMode === 'wysiwyg' ? (document.queryCommandState('bold') ? activeButtonStyle : buttonStyle) : buttonStyle}
          title="Fett"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => (viewMode === 'wysiwyg' ? runWysiwygCommand('italic') : onInsertText('*', '*'))}
          style={buttonStyle}
          title="Kursiv"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => (viewMode === 'wysiwyg' ? runWysiwygCommand('underline') : onInsertText('<u>', '</u>'))}
          style={buttonStyle}
          title="Unterstreichen"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <button
          onClick={() => (viewMode === 'wysiwyg' ? runWysiwygCommand('strikeThrough') : onInsertText('~~', '~~'))}
          style={buttonStyle}
          title="Durchstreichen"
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </button>
        <button
          onClick={handleInsertLink}
          style={buttonStyle}
          title="Link einfügen"
        >
          🔗
        </button>
        <button
          onClick={() => (viewMode === 'wysiwyg' ? runWysiwygCommand('insertUnorderedList') : onInsertText('- [ ] ', ''))}
          style={buttonStyle}
          title="Aufgabenliste"
        >
          ☑
        </button>
        <button
          onClick={() => onInsertText('\n| Spalte 1 | Spalte 2 |\n| --- | --- |\n| Wert 1 | Wert 2 |\n', '')}
          style={buttonStyle}
          title="Tabelle einfügen"
        >
          ▦
        </button>
        <button
          onClick={() => onInsertText('\n[Anhang: ]', '')}
          style={buttonStyle}
          title="Anhang einfügen"
        >
          [ ]
        </button>
        <button
          onClick={() => (viewMode === 'wysiwyg' ? runWysiwygCommand('indent') : onInsertText('  ', ''))}
          style={buttonStyle}
          title="Einzug nach rechts"
        >
          ⇥
        </button>
        <button
          onClick={() => (viewMode === 'wysiwyg' ? runWysiwygCommand('outdent') : onInsertText('', ''))}
          style={buttonStyle}
          title="Einzug nach links"
        >
          ⇤
        </button>
        <button
          onClick={() => (viewMode === 'wysiwyg' ? runWysiwygCommand('formatBlock', 'blockquote') : onInsertText('> ', ''))}
          style={buttonStyle}
          title="Zitat einfügen"
        >
          ❝
        </button>
      </div>

      {/* Save Button */}
      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
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
          {isMobile
            ? (isDirty ? '💾' : '✓')
            : (isDirty ? '💾 Speichern' : '✓ Gespeichert')}
        </button>
      </div>
    </div>
  );
}

