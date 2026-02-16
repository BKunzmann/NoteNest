/**
 * WYSIWYG Editor Komponente
 * 
 * Bearbeitbare Vorschau - Benutzer sieht nur die formatierte Ansicht und kann direkt darin schreiben
 */

import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { findBibleReferences } from '../../utils/bibleReference';
import BibleReference from './BibleReference';
import { settingsAPI, bibleAPI } from '../../services/api';
import { getTranslationName, normalizeTranslation } from '../../utils/bibleTranslation';

// marked v9: marked ist eine Funktion, die direkt aufgerufen werden kann
const BIBLE_LEADING_NUMBER_PATTERN = /^(\s*)(\d+)\.\s*(Mose|Samuel|Könige|Chronik|Korinther|Kor|Thessalonicher|Thess|Timotheus|Tim|Petrus|Johannes|Joh)\b/gim;

function preserveNumberedBibleReferences(markdown: string): string {
  return markdown.replace(BIBLE_LEADING_NUMBER_PATTERN, '$1$2\\. $3');
}

const markdownToHtml = (markdown: string): string => {
  try {
    const safeMarkdown = preserveNumberedBibleReferences(markdown);
    return marked(safeMarkdown) as string;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return markdown; // Fallback: zeige rohen Text
  }
};

interface WysiwygEditorProps {
  content: string;
  onContentChange: (markdown: string) => void;
  onInsertText?: (before: string, after?: string) => void;
}

export default function WysiwygEditor({ 
  content, 
  onContentChange,
  onInsertText
}: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const turndownService = useRef<TurndownService | null>(null);
  const lastContentRef = useRef<string>('');
  const [bibleTranslation, setBibleTranslation] = useState<string>('LUT1912');
  // bibleRefsContainerRef - für zukünftige Verwendung reserviert
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredReference, setHoveredReference] = useState<{ reference: string; translation: string; text: string } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [tooltipVerse, setTooltipVerse] = useState<any>(null);
  const [isLoadingTooltip, setIsLoadingTooltip] = useState(false);
  const [tooltipError, setTooltipError] = useState<string | null>(null);
  const [popupReference, setPopupReference] = useState<{
    reference: string;
    translation: string;
    text: string;
    instanceId: number;
  } | null>(null);
  // popupContainerRef - für zukünftige Verwendung reserviert

  // Lade Bibel-Übersetzung aus Settings
  useEffect(() => {
    settingsAPI.getSettings()
      .then((settings) => {
        setBibleTranslation(normalizeTranslation(settings.default_bible_translation || 'LUT1912'));
      })
      .catch((err) => {
        console.error('Error loading settings:', err);
      });
  }, []);

  // Lade Vers für Tooltip
  useEffect(() => {
    if (hoveredReference && tooltipPosition) {
      setIsLoadingTooltip(true);
      setTooltipError(null);
      bibleAPI.getVerse(hoveredReference.reference, hoveredReference.translation)
        .then((data) => {
          setTooltipVerse(data);
          setIsLoadingTooltip(false);
          setTooltipError(null);
        })
        .catch((err) => {
          console.error('Error loading verse for tooltip:', err);
          setIsLoadingTooltip(false);
          setTooltipError(err?.response?.data?.error || 'Bibelstelle konnte nicht geladen werden');
        });
    } else {
      setTooltipVerse(null);
      setTooltipError(null);
    }
  }, [hoveredReference, tooltipPosition]);

  // Initialisiere Turndown Service und konfiguriere marked
  useEffect(() => {
    turndownService.current = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**'
    });
    
    // Konfiguriere marked (v9 API)
    if (marked && typeof marked.setOptions === 'function') {
      marked.setOptions({
        breaks: true,
        gfm: true
      });
    }
  }, []);


  // Konvertiere Markdown zu HTML und setze es in contentEditable
  useEffect(() => {
    if (!editorRef.current || isUpdating || !turndownService.current) return;
    
    // Nur aktualisieren, wenn sich der Content geändert hat
    if (content === lastContentRef.current) return;
    lastContentRef.current = content;

    // Konvertiere Markdown zu HTML
    const htmlContent = markdownToHtml(content);
    
    // Speichere Cursor-Position
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    let savedRange: { start: number; end: number } | null = null;
    
    if (range && editorRef.current.contains(range.commonAncestorContainer)) {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      savedRange = {
        start: preCaretRange.toString().length,
        end: preCaretRange.toString().length + range.toString().length
      };
    }
    
    setIsUpdating(true);
    editorRef.current.innerHTML = htmlContent;
    
    // Nach dem Rendern: Finde und ersetze Bibelstellen im DOM
    setTimeout(() => {
      if (editorRef.current) {
        processBibleReferencesInHTML(editorRef.current, bibleTranslation, onInsertText);
      }
    }, 0);
    
    // Stelle Cursor-Position wieder her
    if (savedRange && editorRef.current) {
      try {
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let currentOffset = 0;
        let startNode: Node | null = null;
        let endNode: Node | null = null;
        let startOffset = 0;
        let endOffset = 0;
        
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLength = node.textContent?.length || 0;
          
          if (!startNode && currentOffset + nodeLength >= savedRange.start) {
            startNode = node;
            startOffset = savedRange.start - currentOffset;
          }
          
          if (!endNode && currentOffset + nodeLength >= savedRange.end) {
            endNode = node;
            endOffset = savedRange.end - currentOffset;
            break;
          }
          
          currentOffset += nodeLength;
        }
        
        if (startNode && endNode) {
          const newRange = document.createRange();
          newRange.setStart(startNode, Math.min(startOffset, startNode.textContent?.length || 0));
          newRange.setEnd(endNode, Math.min(endOffset, endNode.textContent?.length || 0));
          selection?.removeAllRanges();
          selection?.addRange(newRange);
        }
      } catch (e) {
        // Cursor-Wiederherstellung fehlgeschlagen - ignoriere
      }
    }
    
    setTimeout(() => setIsUpdating(false), 0);
  }, [content, isUpdating]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const shouldAutofocus = content.trim().length === 0 || content.trim() === '#';
    if (!shouldAutofocus) {
      return;
    }
    if (document.activeElement === editorRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      editor.focus();
      const selection = window.getSelection();
      if (!selection) {
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [content]);

  // Konvertiere HTML zu Markdown
  const htmlToMarkdown = (html: string): string => {
    if (!turndownService.current) return '';
    
    try {
      return turndownService.current.turndown(html);
    } catch (error) {
      console.error('Error converting HTML to Markdown:', error);
      return '';
    }
  };

  // Behandle Änderungen im contentEditable
  const handleInput = () => {
    if (isUpdating || !editorRef.current || !turndownService.current) return;
    
    const html = editorRef.current.innerHTML;
    const markdown = htmlToMarkdown(html);
    
    // Aktualisiere nur, wenn sich der Markdown geändert hat
    if (markdown !== lastContentRef.current) {
      lastContentRef.current = markdown;
      onContentChange(markdown);
    }
  };

  // Behandle Paste-Events (konvertiere HTML zu Markdown)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
    
    if (pastedData && turndownService.current) {
      const markdown = turndownService.current.turndown(pastedData);
      document.execCommand('insertText', false, markdown);
    }
  };

  // Verarbeite Bibelstellen im HTML-DOM
  // Wrapper für insertText im WYSIWYG-Editor
  const insertTextInWysiwyg = (markdownText: string) => {
    if (!onInsertText || !editorRef.current) return;
    
    // Konvertiere Markdown zu HTML
    const htmlText = markdownToHtml(markdownText);
    
    // Hole aktuelle Selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Keine Selection: Füge am Ende ein
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      return; // Early return wenn keine Selection
    }
    
    const range = selection.getRangeAt(0);
    
    // Erstelle temporäres Element für HTML-Einfügung
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;
    
    // Füge alle Nodes ein
    const fragment = document.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    // Entferne Selection
    range.deleteContents();
    
    // Füge Fragment ein
    range.insertNode(fragment);
    
    // Setze Cursor nach dem eingefügten Inhalt
    // Nach insertNode sind die Nodes im DOM, aber das Fragment ist leer
    // Einfacher Ansatz: Setze Cursor an das Ende des Editors
    // (Dies ist nicht perfekt, aber robust und funktioniert immer)
    if (selection) {
      const newRange = document.createRange();
      newRange.selectNodeContents(editorRef.current);
      newRange.collapse(false); // Kollabiere ans Ende
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    // Trigger Input-Event, um Content zu aktualisieren
    const event = new Event('input', { bubbles: true });
    editorRef.current.dispatchEvent(event);
  };

  const processBibleReferencesInHTML = (
    element: HTMLElement,
    translation: string,
    _insertText?: (before: string, after?: string) => void
  ) => {
    // Durchlaufe alle Text-Knoten (außer denen, die bereits in .bible-reference sind)
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Überspringe Text-Knoten, die bereits in einem Bible-Reference-Element sind
          let parent = node.parentElement;
          while (parent && parent !== element) {
            if (parent.classList.contains('bible-reference')) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes: Node[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    
    // Verarbeite jeden Text-Knoten rückwärts (um Indizes nicht zu verschieben)
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const textNode = textNodes[i];
      const text = textNode.textContent || '';
      const references = findBibleReferences(text);
      
      if (references.length > 0 && textNode.parentNode) {
        // Erstelle Fragment für Ersetzung
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        references.forEach((ref) => {
          // Text vor der Bibelstelle
          if (ref.start > lastIndex) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, ref.start)));
          }
          
          // Bibelstelle als klickbares Element
          const bibleSpan = document.createElement('span');
          bibleSpan.className = 'bible-reference';
          bibleSpan.setAttribute('data-reference', ref.reference);
          bibleSpan.setAttribute('data-translation', translation);
          bibleSpan.style.cssText = 'color: var(--accent-color, #007AFF); cursor: pointer; text-decoration: underline;';
          bibleSpan.textContent = ref.text;
          
          // Event-Handler werden über Event-Delegation im useEffect behandelt
          
          fragment.appendChild(bibleSpan);
          lastIndex = ref.end;
        });
        
        // Restlicher Text nach der letzten Bibelstelle
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        
        // Ersetze Text-Knoten durch Fragment
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    }
  };

  // Behandle Tastatur-Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+B für Fett
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
      handleInput();
    }
    // Ctrl+I für Kursiv
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      document.execCommand('italic', false);
      handleInput();
    }

    if (e.key === ' ' && editorRef.current) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) {
        return;
      }

      const textNode = range.startContainer as Text;
      const beforeCaret = textNode.data.slice(0, range.startOffset);
      const trimmed = beforeCaret.trim();

      if (trimmed === '-' || trimmed === '*') {
        e.preventDefault();
        const markerIndex = beforeCaret.lastIndexOf(trimmed);
        if (markerIndex >= 0) {
          textNode.deleteData(markerIndex, trimmed.length);
          const nextRange = document.createRange();
          nextRange.setStart(textNode, markerIndex);
          nextRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(nextRange);
        }
        document.execCommand('insertUnorderedList', false);
        handleInput();
      } else if (trimmed === '1.') {
        e.preventDefault();
        const markerIndex = beforeCaret.lastIndexOf(trimmed);
        if (markerIndex >= 0) {
          textNode.deleteData(markerIndex, trimmed.length);
          const nextRange = document.createRange();
          nextRange.setStart(textNode, markerIndex);
          nextRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(nextRange);
        }
        document.execCommand('insertOrderedList', false);
        handleInput();
      }
    }
  };

  // Event-Delegation für Bibelstellen (funktioniert auch nach Neurendern)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('bible-reference')) {
        // Verhindere Wackeln: Aktualisiere Position nur wenn sich das Element geändert hat
        const reference = target.getAttribute('data-reference') || '';
        if (hoveredReference?.reference !== reference) {
          const rect = target.getBoundingClientRect();
          const translation = target.getAttribute('data-translation') || bibleTranslation;
          
          setTooltipPosition({
            top: rect.top,
            left: rect.left + rect.width / 2
          });
          setHoveredReference({
            reference,
            translation,
            text: target.textContent || ''
          });
        }
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('bible-reference')) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredReference(null);
          setTooltipPosition(null);
        }, 100);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('bible-reference')) {
        e.preventDefault();
        e.stopPropagation();
        
        const reference = target.getAttribute('data-reference') || '';
        const translation = target.getAttribute('data-translation') || bibleTranslation;
        
        // Öffne Popup direkt
        setPopupReference({
          reference,
          translation,
          text: target.textContent || '',
          instanceId: Date.now()
        });
      }
    };

    editor.addEventListener('mouseenter', handleMouseEnter, true);
    editor.addEventListener('mouseleave', handleMouseLeave, true);
    editor.addEventListener('click', handleClick, true);

    return () => {
      editor.removeEventListener('mouseenter', handleMouseEnter, true);
      editor.removeEventListener('mouseleave', handleMouseLeave, true);
      editor.removeEventListener('click', handleClick, true);
    };
  }, [bibleTranslation, onInsertText]);

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          padding: '1rem',
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          outline: 'none',
          minHeight: '100%',
          lineHeight: '1.6',
          fontSize: '1rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}
        className="wysiwyg-editor"
      />
      
      {/* Hover-Tooltip für Bibelstellen */}
      {hoveredReference && tooltipPosition && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)',
            marginBottom: '0.5rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            fontSize: '0.875rem',
            maxWidth: '300px',
            zIndex: 1000,
            border: '1px solid var(--border-color)',
            pointerEvents: 'none',
            whiteSpace: 'normal'
          }}
        >
          {isLoadingTooltip && <div>Lädt...</div>}
          {tooltipError && !isLoadingTooltip && (
            <div style={{ color: 'var(--error-text, #c33)' }}>{tooltipError}</div>
          )}
          {tooltipVerse && !isLoadingTooltip && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {tooltipVerse.reference}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)', 
                marginBottom: '0.5rem',
                fontStyle: 'italic'
              }}>
                {getTranslationName(tooltipVerse.translation)}
              </div>
              <div style={{ lineHeight: '1.5' }}>
                {tooltipVerse.text.length > 150 
                  ? `${tooltipVerse.text.substring(0, 150)}...` 
                  : tooltipVerse.text}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Popup für Bibelstellen - BibleReference rendert das Popup selbst */}
      {popupReference && (
        <div style={{ display: 'none' }}>
            <BibleReference
              key={`${popupReference.reference}-${popupReference.translation}-${popupReference.instanceId}`}
              reference={popupReference.reference}
              translation={popupReference.translation}
              onInsertText={onInsertText ? (before: string) => insertTextInWysiwyg(before) : undefined}
              initialShowPopup={true}
            >
              {popupReference.text}
            </BibleReference>
        </div>
      )}
    </>
  );
}

