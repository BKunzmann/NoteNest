/**
 * Markdown Editor Komponente
 * 
 * Editor mit Live-Vorschau und Toolbar
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEditorStore } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import EditorToolbar from './EditorToolbar';
import WysiwygEditor from './WysiwygEditor';
import { findBibleReferences } from '../../utils/bibleReference';
import BibleReference from './BibleReference';
import { settingsAPI } from '../../services/api';

interface MarkdownEditorProps {
  filePath: string;
  fileType: 'private' | 'shared';
}

export default function MarkdownEditor({ filePath, fileType }: MarkdownEditorProps) {
  const { 
    content, 
    setContent, 
    viewMode, 
    setViewMode,
    isPreviewFullscreen,
    setPreviewFullscreen,
    isDirty,
    isSaving,
    saveFile,
    autoSaveFile,
    error,
    undo,
    redo,
    canUndo,
    canRedo
  } = useEditorStore();
  
  const { loadFileContent } = useFileStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [bibleTranslation, setBibleTranslation] = useState<string>('LUT');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset Editor beim Wechsel der Datei
  useEffect(() => {
    useEditorStore.getState().reset();
    // NICHT hier laden - selectFile lädt bereits den Content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, fileType]);

  // Synchronisiere fileStore content mit editorStore
  const { fileContent } = useFileStore();
  useEffect(() => {
    if (fileContent !== null && fileContent !== undefined) {
      const editorStore = useEditorStore.getState();
      // Nur setzen, wenn sich der Content geändert hat
      if (editorStore.originalContent !== fileContent) {
        editorStore.setOriginalContent(fileContent);
      }
    }
  }, [fileContent]);

  // Lade Bibel-Übersetzung aus Settings
  useEffect(() => {
    settingsAPI.getSettings()
      .then((settings) => {
        setBibleTranslation(settings.default_bible_translation || 'LUT');
      })
      .catch((err) => {
        console.error('Error loading settings:', err);
      });
  }, []);

  useEffect(() => {
    if (viewMode !== 'preview' && isPreviewFullscreen) {
      setPreviewFullscreen(false);
    }
  }, [isPreviewFullscreen, setPreviewFullscreen, viewMode]);

  const scheduleAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      const currentState = useEditorStore.getState();
      if (currentState.isDirty) {
        autoSaveFile(filePath, fileType).catch((err) => {
          console.warn('Auto-save failed:', err);
        });
      }
    }, 1500);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S oder Cmd+S zum Speichern
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) {
          handleSave();
        }
      }
      // Ctrl+Z oder Cmd+Z zum Rückgängig
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Nur wenn Textarea fokussiert ist
        if (textareaRef.current === document.activeElement) {
          e.preventDefault();
          if (canUndo) {
            undo();
          }
        }
      }
      // Ctrl+Y oder Cmd+Shift+Z zum Wiederholen
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        // Nur wenn Textarea fokussiert ist
        if (textareaRef.current === document.activeElement) {
          e.preventDefault();
          if (canRedo) {
            redo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isSaving, canUndo, canRedo, undo, redo]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    setContent(newContent);
    scheduleAutoSave();
  };
  
  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }

      // Flush beim Verlassen, damit letzte Änderungen nicht verloren gehen
      const currentState = useEditorStore.getState();
      if (currentState.isDirty) {
        autoSaveFile(filePath, fileType).catch((err) => {
          console.warn('Auto-save flush failed:', err);
        });
      }
    };
  }, [autoSaveFile, filePath, fileType]);

  const handleSave = async () => {
    try {
      await saveFile(filePath, fileType);
      // Nach erfolgreichem Speichern: Lade Datei neu, um sicherzustellen, dass alles synchron ist
      await loadFileContent(filePath, fileType);
    } catch (err) {
      // Fehler wird im Store gespeichert und angezeigt
      console.error('Save failed:', err);
    }
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    // Setze Cursor-Position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  /**
   * Verarbeitet Text und erkennt Bibelstellen
   * Behält Zeilenumbrüche bei und trennt mehrere Bibelstellen in separate Zeilen
   */
  const processTextWithBibleReferences = (text: string, translation?: string): React.ReactNode[] => {
    // Teile Text in Zeilen auf, um Zeilenumbrüche zu erhalten
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    
    lines.forEach((line, lineIndex) => {
      if (line.trim() === '') {
        // Leere Zeile: Füge Zeilenumbruch hinzu
        if (lineIndex > 0) {
          result.push(<br key={`br-${lineIndex}`} />);
        }
        return;
      }
      
      // Verarbeite jede Zeile einzeln
      const references = findBibleReferences(line);
      
      if (references.length === 0) {
        // Keine Bibelstellen: Füge Text hinzu
        if (lineIndex > 0) {
          result.push(<br key={`br-before-${lineIndex}`} />);
        }
        result.push(line);
      } else {
        // Bibelstellen gefunden: Verarbeite sie
        if (lineIndex > 0) {
          result.push(<br key={`br-before-${lineIndex}`} />);
        }
        
        // Wenn mehrere Bibelstellen in einer Zeile sind, trenne sie mit Zeilenumbrüchen
        // Prüfe, ob der Text hauptsächlich aus Bibelstellen besteht (wenig Text dazwischen)
        const isOnlyBibleReferences = references.every((ref, idx) => {
          const beforeText = idx === 0 ? line.substring(0, ref.start) : line.substring(references[idx - 1].end, ref.start);
          return beforeText.trim().length <= 2; // Maximal 2 Zeichen zwischen Bibelstellen (z.B. Leerzeichen)
        });
        
        references.forEach((ref, refIndex) => {
          // Text vor der Bibelstelle
          const beforeText = refIndex === 0 
            ? line.substring(0, ref.start) 
            : line.substring(references[refIndex - 1].end, ref.start);
          
          // Wenn mehrere Bibelstellen und wenig Text dazwischen: Zeilenumbruch vor jeder Bibelstelle (außer der ersten)
          if (isOnlyBibleReferences && refIndex > 0 && beforeText.trim().length <= 2) {
            result.push(<br key={`br-ref-${lineIndex}-${refIndex}`} />);
          } else if (beforeText.trim().length > 0) {
            result.push(beforeText);
          }
          
          // Bibelstelle - nur onInsertText übergeben, wenn nicht im reinen Vorschaumodus
          result.push(
            <BibleReference 
              key={`bible-ref-${lineIndex}-${refIndex}`} 
              reference={ref.reference} 
              translation={translation}
              onInsertText={viewMode === 'preview' ? undefined : insertText}
            >
              {ref.text}
            </BibleReference>
          );
        });
        
        // Restlicher Text nach der letzten Bibelstelle
        const lastRef = references[references.length - 1];
        if (lastRef.end < line.length) {
          result.push(line.substring(lastRef.end));
        }
      }
    });
    
    return result;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Toolbar */}
      <EditorToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSave={handleSave}
        isDirty={isDirty}
        isSaving={isSaving}
        onInsertText={insertText}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--error-color)',
          color: 'white',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Editor & Preview */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* WYSIWYG Editor */}
        {viewMode === 'wysiwyg' && (
          <WysiwygEditor
            content={content}
            onContentChange={(newContent) => {
              setContent(newContent);
              scheduleAutoSave();
            }}
            onInsertText={insertText}
          />
        )}

        {/* Editor */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div style={{
            flex: viewMode === 'split' ? 1 : 'none',
            width: viewMode === 'split' ? '50%' : '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: viewMode === 'split' ? '1px solid var(--border-color)' : 'none'
          }}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="Beginne mit dem Schreiben..."
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                tabSize: 2
              }}
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div style={{
            flex: viewMode === 'split' ? 1 : 'none',
            width: viewMode === 'split' ? '50%' : '100%',
            overflow: 'auto',
            padding: '1rem',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            position: 'relative'
          }}>
            {viewMode === 'preview' && isPreviewFullscreen && (
              <button
                type="button"
                onClick={() => {
                  setPreviewFullscreen(false);
                  setViewMode('wysiwyg');
                }}
                style={{
                  position: 'sticky',
                  top: 0,
                  marginLeft: 'auto',
                  display: 'block',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.65rem',
                  cursor: 'pointer',
                  zIndex: 5
                }}
              >
                Vollbild verlassen
              </button>
            )}
            <div style={{
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom Styling für Markdown-Elemente
                  h1: ({ node, ...props }) => <h1 style={{ fontSize: '2rem', marginTop: '1.5rem', marginBottom: '1rem' }} {...props} />,
                  h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.5rem', marginTop: '1.25rem', marginBottom: '0.75rem' }} {...props} />,
                  h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.25rem', marginTop: '1rem', marginBottom: '0.5rem' }} {...props} />,
                  p: ({ node, children, ...props }: any) => {
                    // Verarbeite Text-Knoten, um Bibelstellen zu erkennen
                    const processChildren = (children: any): React.ReactNode => {
                      if (typeof children === 'string') {
                        return processTextWithBibleReferences(children, bibleTranslation);
                      }
                      if (Array.isArray(children)) {
                        // Kombiniere alle String-Kinder zu einem Text, um Bibelstellen zu erkennen
                        const textParts: string[] = [];
                        const nonTextElements: React.ReactNode[] = [];
                        let textIndex = 0;
                        
                        children.forEach((child, index) => {
                          if (typeof child === 'string') {
                            textParts.push(child);
                          } else {
                            // Wenn wir Text gesammelt haben, verarbeite ihn
                            if (textParts.length > 0) {
                              const combinedText = textParts.join('');
                              const processed = processTextWithBibleReferences(combinedText, bibleTranslation);
                              processed.forEach((part, partIndex) => {
                                nonTextElements.push(
                                  <React.Fragment key={`text-${textIndex}-${partIndex}`}>{part}</React.Fragment>
                                );
                              });
                              textParts.length = 0;
                              textIndex++;
                            }
                            // Füge non-text Element hinzu
                            nonTextElements.push(
                              <React.Fragment key={`nontext-${index}`}>{child}</React.Fragment>
                            );
                          }
                        });
                        
                        // Verarbeite verbleibenden Text
                        if (textParts.length > 0) {
                          const combinedText = textParts.join('');
                          const processed = processTextWithBibleReferences(combinedText, bibleTranslation);
                          processed.forEach((part, partIndex) => {
                            nonTextElements.push(
                              <React.Fragment key={`text-final-${partIndex}`}>{part}</React.Fragment>
                            );
                          });
                        }
                        
                        return nonTextElements.length > 0 ? nonTextElements : children;
                      }
                      return children;
                    };
                    
                    return (
                      <p 
                        style={{ 
                          marginBottom: '1rem', 
                          lineHeight: '1.6'
                        }} 
                        {...props}
                      >
                        {processChildren(children)}
                      </p>
                    );
                  },
                  code: ({ node, inline, ...props }: any) => 
                    inline ? (
                      <code style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '0.125rem 0.25rem',
                        borderRadius: '3px',
                        fontSize: '0.875em',
                        fontFamily: 'monospace'
                      }} {...props} />
                    ) : (
                      <code style={{
                        display: 'block',
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '1rem',
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '0.875em',
                        fontFamily: 'monospace',
                        marginBottom: '1rem'
                      }} {...props} />
                    ),
                  blockquote: ({ node, children, ...props }: any) => {
                    const processChildren = (children: any): React.ReactNode => {
                      if (typeof children === 'string') {
                        return processTextWithBibleReferences(children, bibleTranslation);
                      }
                      if (Array.isArray(children)) {
                        // Kombiniere alle String-Kinder zu einem Text, um Bibelstellen zu erkennen
                        const textParts: string[] = [];
                        const nonTextElements: React.ReactNode[] = [];
                        let textIndex = 0;
                        
                        children.forEach((child, index) => {
                          if (typeof child === 'string') {
                            textParts.push(child);
                          } else {
                            // Wenn wir Text gesammelt haben, verarbeite ihn
                            if (textParts.length > 0) {
                              const combinedText = textParts.join('');
                              const processed = processTextWithBibleReferences(combinedText, bibleTranslation);
                              processed.forEach((part, partIndex) => {
                                nonTextElements.push(
                                  <React.Fragment key={`text-${textIndex}-${partIndex}`}>{part}</React.Fragment>
                                );
                              });
                              textParts.length = 0;
                              textIndex++;
                            }
                            // Füge non-text Element hinzu
                            nonTextElements.push(
                              <React.Fragment key={`nontext-${index}`}>{child}</React.Fragment>
                            );
                          }
                        });
                        
                        // Verarbeite verbleibenden Text
                        if (textParts.length > 0) {
                          const combinedText = textParts.join('');
                          const processed = processTextWithBibleReferences(combinedText, bibleTranslation);
                          processed.forEach((part, partIndex) => {
                            nonTextElements.push(
                              <React.Fragment key={`text-final-${partIndex}`}>{part}</React.Fragment>
                            );
                          });
                        }
                        
                        return nonTextElements.length > 0 ? nonTextElements : children;
                      }
                      return children;
                    };
                    
                    return (
                      <blockquote style={{
                        borderLeft: '4px solid var(--accent-color)',
                        paddingLeft: '1rem',
                        marginLeft: 0,
                        marginBottom: '1rem',
                        fontStyle: 'italic',
                        color: 'var(--text-secondary)'
                      }} {...props}>
                        {processChildren(children)}
                      </blockquote>
                    );
                  },
                  li: ({ node, children, ...props }: any) => {
                    const processChildren = (children: any): React.ReactNode => {
                      if (typeof children === 'string') {
                        return processTextWithBibleReferences(children, bibleTranslation);
                      }
                      if (Array.isArray(children)) {
                        // Kombiniere alle String-Kinder zu einem Text, um Bibelstellen zu erkennen
                        const textParts: string[] = [];
                        const nonTextElements: React.ReactNode[] = [];
                        let textIndex = 0;
                        
                        children.forEach((child, index) => {
                          if (typeof child === 'string') {
                            textParts.push(child);
                          } else {
                            // Wenn wir Text gesammelt haben, verarbeite ihn
                            if (textParts.length > 0) {
                              const combinedText = textParts.join('');
                              const processed = processTextWithBibleReferences(combinedText, bibleTranslation);
                              processed.forEach((part, partIndex) => {
                                nonTextElements.push(
                                  <React.Fragment key={`text-${textIndex}-${partIndex}`}>{part}</React.Fragment>
                                );
                              });
                              textParts.length = 0;
                              textIndex++;
                            }
                            // Füge non-text Element hinzu
                            nonTextElements.push(
                              <React.Fragment key={`nontext-${index}`}>{child}</React.Fragment>
                            );
                          }
                        });
                        
                        // Verarbeite verbleibenden Text
                        if (textParts.length > 0) {
                          const combinedText = textParts.join('');
                          const processed = processTextWithBibleReferences(combinedText, bibleTranslation);
                          processed.forEach((part, partIndex) => {
                            nonTextElements.push(
                              <React.Fragment key={`text-final-${partIndex}`}>{part}</React.Fragment>
                            );
                          });
                        }
                        
                        return nonTextElements.length > 0 ? nonTextElements : children;
                      }
                      return children;
                    };
                    
                    return <li {...props}>{processChildren(children)}</li>;
                  }
                }}
              >
                {content || '*Kein Inhalt*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

