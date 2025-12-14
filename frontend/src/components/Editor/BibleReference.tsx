/**
 * Bible Reference Component
 * 
 * Zeigt eine Bibelstelle mit Hover-Tooltip und Popup an
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bibleAPI, BibleVerseResponse, BibleChapterResponse, BibleFavorite, settingsAPI } from '../../services/api';
import { getTranslationName, getAvailableTranslations, translationsMatch, normalizeTranslation } from '../../utils/bibleTranslation';
import { formatBibleReference } from '../../utils/bibleFormatting';
import { useAuthStore } from '../../store/authStore';

interface BibleReferenceProps {
  reference: string;
  translation?: string;
  children: React.ReactNode;
  onInsertText?: (before: string, after?: string) => void; // Callback zum Einfügen von Text in den Editor
  initialShowPopup?: boolean; // Öffne Popup direkt beim Mount
}

/**
 * Prüft, ob eine Referenz nur ein Kapitel ist (ohne Vers)
 */
function isChapterOnly(reference: string): boolean {
  // Prüfe, ob die Referenz nur Buch + Kapitel enthält (kein Vers)
  // Pattern: "Buch Kapitel" ohne ",", ":" oder "-" nach der Kapitelnummer
  const chapterOnlyPattern = /^(.+?)\s+(\d+)$/i;
  const match = reference.trim().match(chapterOnlyPattern);
  return match !== null;
}

/**
 * Extrahiert Buch und Kapitel aus einer Referenz
 */
function parseBookAndChapter(reference: string): { book: string; chapter: number } | null {
  const chapterOnlyPattern = /^(.+?)\s+(\d+)$/i;
  const match = reference.trim().match(chapterOnlyPattern);
  if (match) {
    return {
      book: match[1].trim(),
      chapter: parseInt(match[2], 10)
    };
  }
  return null;
}

export default function BibleReference({ reference, translation, children, onInsertText, initialShowPopup = false }: BibleReferenceProps) {
  const { user } = useAuthStore();
  const [verse, setVerse] = useState<BibleVerseResponse | null>(null);
  const [chapter, setChapter] = useState<BibleChapterResponse | null>(null);
  const [defaultTranslation, setDefaultTranslation] = useState<string>('LUT1912');
  const [currentTranslation, setCurrentTranslation] = useState<string>(translation || 'LUT1912');
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPopup, setShowPopup] = useState(initialShowPopup);
  const [showAllTranslationsModal, setShowAllTranslationsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [favorites, setFavorites] = useState<BibleFavorite[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const loadingRef = useRef<boolean>(false); // Verhindert doppelte Requests
  const isChapter = isChapterOnly(reference);
  
  // Verfügbare Übersetzungen
  const availableTranslations = getAvailableTranslations();

  // Lade Standard-Übersetzung aus Settings beim Mount
  useEffect(() => {
    if (user) {
      settingsAPI.getSettings()
        .then((settings) => {
          const defaultTrans = settings.default_bible_translation || 'LUT1912';
          const normalized = normalizeTranslation(defaultTrans);
          setDefaultTranslation(normalized);
          // Setze currentTranslation auf Standard, wenn noch nicht gesetzt
          if (!translation) {
            setCurrentTranslation(normalized);
          }
        })
        .catch((err) => {
          console.error('Error loading settings:', err);
        });
    }
  }, [user, translation]);

  // Lade Favoriten beim Öffnen des Popups (wenn eingeloggt)
  useEffect(() => {
    if (showPopup && user && !isLoadingFavorites && favorites.length === 0) {
      setIsLoadingFavorites(true);
      bibleAPI.getFavorites()
        .then((data) => {
          setFavorites(data.favorites);
          setIsLoadingFavorites(false);
        })
        .catch((err) => {
          console.error('Error loading favorites:', err);
          setIsLoadingFavorites(false);
          // Fehler ignorieren, Favoriten sind optional
        });
    }
  }, [showPopup, user]);

  // Setze currentTranslation auf Standard-Übersetzung beim Öffnen des Popups
  useEffect(() => {
    if (showPopup && defaultTranslation && !translation) {
      setCurrentTranslation(defaultTranslation);
    }
  }, [showPopup, defaultTranslation, translation]);

  // Erstelle Liste mit Favoriten (für Switch-Auswahl)
  // Standard-Übersetzung kommt immer zuerst
  const getFavoriteTranslations = (): string[] => {
    const sorted = favorites
      .sort((a, b) => {
        // Standard-Übersetzung immer zuerst
        if (a.translation === defaultTranslation) return -1;
        if (b.translation === defaultTranslation) return 1;
        // Dann nach display_order
        return a.display_order - b.display_order;
      })
      .map(f => f.translation);
    
    // Stelle sicher, dass Standard-Übersetzung ganz oben ist
    if (defaultTranslation && sorted.includes(defaultTranslation)) {
      return [defaultTranslation, ...sorted.filter(t => t !== defaultTranslation)];
    }
    return sorted;
  };

  // Erstelle Liste mit allen Übersetzungen außerhalb der Favoriten (für "Mehr..." Modal)
  const getNonFavoriteTranslations = (): string[] => {
    try {
      if (!availableTranslations || availableTranslations.length === 0) {
        return [];
      }
      const favoriteCodes = (favorites || []).map(f => f.translation);
      return availableTranslations.filter(t => t && !favoriteCodes.includes(t));
    } catch (err) {
      console.error('Error in getNonFavoriteTranslations:', err);
      return [];
    }
  };

  // Lade Vers oder Kapitel beim Hover
  useEffect(() => {
    if (showTooltip && !verse && !chapter && !loadingRef.current && !error) {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      // Verwende Standard-Übersetzung beim Hover, wenn noch keine Übersetzung explizit gesetzt wurde
      const translationToUse = currentTranslation || defaultTranslation || 'LUT1912';
      
      if (isChapter) {
        // Lade ganzes Kapitel
        const parsed = parseBookAndChapter(reference);
        if (parsed) {
          console.log('Loading bible chapter:', { book: parsed.book, chapter: parsed.chapter, translation: translationToUse });
          bibleAPI.getChapter(parsed.book, parsed.chapter, translationToUse)
            .then((data) => {
              console.log('Bible chapter loaded:', data);
              setChapter(data);
              setIsLoading(false);
              loadingRef.current = false;
            })
            .catch((err) => {
              console.error('Error loading bible chapter:', err);
              console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
              });
              let errorMessage = err.response?.data?.error || err.message || 'Kapitel konnte nicht geladen werden';
              
              if (err.response?.status === 404) {
                errorMessage = 'Kapitel nicht gefunden. Möglicherweise ist die Bibel-Datenbank noch nicht importiert.';
              }
              
              setError(errorMessage);
              setIsLoading(false);
              loadingRef.current = false;
            });
        } else {
          setError('Ungültige Bibelstellen-Referenz');
          setIsLoading(false);
        }
      } else {
        // Lade einzelnen Vers oder Versbereich
        const translationToUse = currentTranslation || defaultTranslation || 'LUT1912';
        console.log('Loading bible verse:', { reference, translation: translationToUse });
        bibleAPI.getVerse(reference, translationToUse)
          .then((data) => {
            console.log('Bible verse loaded:', data);
            setVerse(data);
            setIsLoading(false);
            loadingRef.current = false;
          })
          .catch((err) => {
            console.error('Error loading bible verse:', err);
            console.error('Error details:', {
              message: err.message,
              response: err.response?.data,
              status: err.response?.status
            });
            let errorMessage = err.response?.data?.error || err.message || 'Vers konnte nicht geladen werden';
            
            // Spezielle Meldung, wenn die Datenbank leer ist
            if (err.response?.status === 404) {
              errorMessage = 'Vers nicht gefunden. Möglicherweise ist die Bibel-Datenbank noch nicht importiert.';
            }
            
            setError(errorMessage);
            setIsLoading(false);
            loadingRef.current = false;
          });
      }
    }
  }, [showTooltip, reference, currentTranslation, verse, chapter, isLoading, error, isChapter]);
  
  // Lade Vers oder Kapitel im Popup (oder wenn Übersetzung geändert wurde)
  useEffect(() => {
    if (!showPopup) return;
    
    // Wenn bereits ein Request läuft, nichts tun (verhindert doppelte Requests)
    if (loadingRef.current) {
      return;
    }
    
    // Prüfe, ob bereits geladen ist und die Übersetzung stimmt (berücksichtigt Normalisierung)
    // Wichtig: Nur prüfen, wenn verse/chapter auch wirklich existieren
    const isAlreadyLoaded = 
      (verse && verse.translation && translationsMatch(verse.translation, currentTranslation)) || 
      (chapter && chapter.translation && translationsMatch(chapter.translation, currentTranslation));
    
    // Wenn bereits geladen, nichts tun
    if (isAlreadyLoaded) {
      return;
    }
    
    // Lade Vers/Kapitel
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    if (isChapter) {
      // Lade ganzes Kapitel
      const parsed = parseBookAndChapter(reference);
      if (parsed) {
        bibleAPI.getChapter(parsed.book, parsed.chapter, currentTranslation)
          .then((data) => {
            setChapter(data);
            setVerse(null); // Stelle sicher, dass verse null ist, wenn chapter geladen wird
            setIsLoading(false);
            loadingRef.current = false;
          })
          .catch((err) => {
            let errorMessage = err.response?.data?.error || err.message || 'Kapitel konnte nicht geladen werden';
            if (err.response?.status === 404) {
              errorMessage = 'Kapitel nicht gefunden. Möglicherweise ist die Bibel-Datenbank noch nicht importiert.';
            }
            setError(errorMessage);
            setIsLoading(false);
            loadingRef.current = false;
          });
      } else {
        setError('Ungültige Bibelstellen-Referenz');
        setIsLoading(false);
        loadingRef.current = false;
      }
    } else {
      // Lade einzelnen Vers oder Versbereich
      bibleAPI.getVerse(reference, currentTranslation)
        .then((data) => {
          setVerse(data);
          setChapter(null); // Stelle sicher, dass chapter null ist, wenn verse geladen wird
          setIsLoading(false);
          loadingRef.current = false;
        })
        .catch((err) => {
          let errorMessage = err.response?.data?.error || err.message || 'Vers konnte nicht geladen werden';
          if (err.response?.status === 404) {
            errorMessage = 'Vers nicht gefunden. Möglicherweise ist die Bibel-Datenbank noch nicht importiert.';
          }
          setError(errorMessage);
          setIsLoading(false);
          loadingRef.current = false;
        });
    }
  }, [showPopup, reference, currentTranslation, verse, chapter, isChapter]);
  
  // Handler für Übersetzungswechsel
  const handleTranslationChange = (newTranslation: string) => {
    if (!newTranslation) {
      console.error('handleTranslationChange called with empty translation');
      return;
    }
    
    try {
      // Setze loadingRef zurück, damit der useEffect den neuen Vers/Kapitel laden kann
      loadingRef.current = false;
      
      // Setze verse und chapter auf null und ändere die Übersetzung
      // Der useEffect wird durch die Änderung von currentTranslation ausgelöst
      setVerse(null);
      setChapter(null);
      setError(null);
      setCurrentTranslation(newTranslation);
    } catch (err) {
      console.error('Error in handleTranslationChange:', err);
      setError('Fehler beim Wechseln der Übersetzung');
    }
  };
  
  // Handler für "In Notiz übernehmen"
  const handleInsertToNote = (format: 'quote' | 'text' | 'markdown') => {
    if (!onInsertText) return;
    
    let text = '';
    const refText = verse?.reference || (chapter ? `${chapter.book} ${chapter.chapter}` : reference);
    const translationName = getTranslationName(currentTranslation);
    
    if (verse) {
      if (format === 'quote') {
        text = `> ${verse.text}\n> — ${refText} (${translationName})`;
      } else if (format === 'markdown') {
        text = `**${refText}** (${translationName})\n\n${verse.text}`;
      } else {
        text = verse.text;
      }
    } else if (chapter) {
      const versesText = chapter.verses.map(v => `${v.verse} ${v.text}`).join('\n\n');
      if (format === 'quote') {
        text = `> ${versesText}\n> — ${refText} (${translationName})`;
      } else if (format === 'markdown') {
        text = `**${refText}** (${translationName})\n\n${versesText}`;
      } else {
        text = versesText;
      }
    }
    
    if (text) {
      // insertText erwartet (before, after), also übergeben wir den Text als 'before'
      onInsertText(text, '');
      setShowPopup(false);
    }
  };

  // Schließe Popup beim Klick außerhalb
  useEffect(() => {
    if (showPopup) {
      const handleClickOutside = (event: MouseEvent) => {
        if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
          setShowPopup(false);
        }
      };
      
      // Warte kurz, damit der Click-Event, der das Popup öffnet, nicht sofort schließt
      const timeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPopup]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Berechne Position des Tooltips
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      });
    }
    
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
      setTooltipPosition(null);
    }, 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Stelle sicher, dass beim Öffnen des Popups geladen wird
    // Setze isLoading auf true, damit der useEffect ausgelöst wird
    if (!verse && !chapter) {
      setIsLoading(true);
    }
    setShowPopup(true);
  };

  return (
    <>
      <span
        ref={spanRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          color: 'var(--accent-color)',
          textDecoration: 'underline',
          cursor: 'pointer',
          display: 'inline'
        }}
      >
        {children}
      </span>
      
      {/* Hover-Tooltip - gerendert als Portal außerhalb des <p> Tags */}
      {showTooltip && tooltipPosition && createPortal(
        <div
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
            maxWidth: isChapter ? '400px' : '300px',
            maxHeight: isChapter ? '400px' : 'none',
            zIndex: 1000,
            border: '1px solid var(--border-color)',
            pointerEvents: 'none',
            whiteSpace: 'normal',
            overflow: isChapter ? 'auto' : 'visible'
          }}
        >
          {isLoading && <div>Lädt...</div>}
          {error && <div style={{ color: 'var(--error-text)' }}>{error}</div>}
          {verse && !isLoading && !error && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {formatBibleReference(verse.reference)}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)', 
                marginBottom: '0.5rem',
                fontStyle: 'italic'
              }}>
                {getTranslationName(verse.translation)}
              </div>
              <div style={{ lineHeight: '1.5' }}>
                {/* Prüfe, ob es ein Versbereich ist (enthält Zeilenumbrüche oder Versnummern am Anfang) */}
                {verse.text.includes('\n\n') || verse.text.match(/^\d+\s/) ? (
                  // Versbereich: Formatiere mit Zeilenumbrüchen
                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {verse.text.split(/\n\n/).filter(Boolean).map((part, index) => {
                      const verseMatch = part.match(/^(\d+)\s(.+)$/);
                      if (verseMatch) {
                        return (
                          <div key={index} style={{ marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>
                              {verseMatch[1]}
                            </span>
                            {' '}
                            <span>{verseMatch[2]}</span>
                          </div>
                        );
                      }
                      // Fallback: Versuche Pattern ohne Zeilenumbrüche
                      const verseMatch2 = part.match(/^(\d+)\s(.+)$/);
                      if (verseMatch2) {
                        return (
                          <div key={index} style={{ marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>
                              {verseMatch2[1]}
                            </span>
                            {' '}
                            <span>{verseMatch2[2]}</span>
                          </div>
                        );
                      }
                      return <div key={index}>{part}</div>;
                    })}
                  </div>
                ) : (
                  // Einzelner Vers - entferne Paragraph-Zeichen
                  (() => {
                    const text = verse.text.replace(/¶/g, '').trim();
                    return text.length > 150 ? `${text.substring(0, 150)}...` : text;
                  })()
                )}
              </div>
            </div>
          )}
          {chapter && !isLoading && !error && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {formatBibleReference(`${chapter.book} ${chapter.chapter}`)}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)', 
                marginBottom: '0.5rem',
                fontStyle: 'italic'
              }}>
                {getTranslationName(chapter.translation)}
              </div>
              <div style={{ 
                lineHeight: '1.6',
                maxHeight: '350px',
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }}>
                {chapter.verses.map((v, index) => (
                  <div key={index} style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>
                      {v.verse}
                    </span>
                    {' '}
                    <span>{v.text.replace(/¶/g, '').trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Popup-Modal - gerendert als Portal außerhalb des <p> Tags */}
      {showPopup && createPortal(
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
            zIndex: 2000
          }}
          onClick={() => setShowPopup(false)}
        >
          <div
            ref={popupRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                  {formatBibleReference(reference)}
                </h3>
                {(verse || chapter) && (
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)', 
                    marginTop: '0.25rem',
                    fontStyle: 'italic'
                  }}>
                    {getTranslationName(verse?.translation || chapter?.translation || currentTranslation)}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.25rem 0.5rem'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Übersetzungs-Auswahl - Switch zwischen Favoriten */}
            {(verse || chapter) && (
              <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Übersetzung:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={currentTranslation}
                    onChange={(e) => handleTranslationChange(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    {/* Zeige nur Favoriten in der Switch-Auswahl */}
                    {getFavoriteTranslations().length > 0 ? (
                      getFavoriteTranslations().map(t => (
                        <option key={t} value={t}>
                          {t === defaultTranslation ? '⭐ ' : ''}{getTranslationName(t)}
                        </option>
                      ))
                    ) : (
                      // Fallback: Wenn keine Favoriten, zeige Standard-Übersetzung
                      <option value={defaultTranslation}>
                        {getTranslationName(defaultTranslation)}
                      </option>
                    )}
                  </select>
                  {getNonFavoriteTranslations().length > 0 && (
                    <button
                      onClick={() => setShowAllTranslationsModal(true)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Mehr...
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {isLoading && <div>Lädt...</div>}
            {error && <div style={{ color: 'var(--error-text)' }}>{error}</div>}
            {verse && !isLoading && !error && (
              <div style={{ lineHeight: '1.8', color: 'var(--text-primary)' }}>
                {/* Prüfe, ob es ein Versbereich ist (enthält Versnummern am Anfang oder Zeilenumbrüche) */}
                {verse.text.includes('\n\n') || verse.text.match(/^\d+\s/) ? (
                  // Versbereich: Formatiere mit Zeilenumbrüchen
                  verse.text.split(/\n\n/).filter(Boolean).map((part, index) => {
                    const verseMatch = part.match(/^(\d+)\s(.+)$/);
                    if (verseMatch) {
                      return (
                        <div key={index} style={{ marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '1.1em' }}>
                            {verseMatch[1]}
                          </span>
                          {' '}
                          <span>{verseMatch[2]}</span>
                        </div>
                      );
                    }
                    // Fallback: Versuche Pattern ohne Zeilenumbrüche
                    const verseMatch2 = part.match(/^(\d+)\s(.+)$/);
                    if (verseMatch2) {
                      return (
                        <div key={index} style={{ marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '1.1em' }}>
                            {verseMatch2[1]}
                          </span>
                          {' '}
                          <span>{verseMatch2[2]}</span>
                        </div>
                      );
                    }
                    return <div key={index}>{part}</div>;
                  })
                ) : (
                  // Einzelner Vers - entferne Paragraph-Zeichen
                  verse.text.replace(/¶/g, '').trim()
                )}
              </div>
            )}
            {chapter && !isLoading && !error && (
              <div style={{ lineHeight: '1.8', color: 'var(--text-primary)' }}>
                {chapter.verses.map((v, index) => (
                  <div key={index} style={{ marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '1.1em' }}>
                      {v.verse}
                    </span>
                    {' '}
                    <span>{v.text}</span>
                  </div>
                ))}
              </div>
            )}
            
            {!verse && !chapter && !isLoading && !error && (
              <div style={{ color: 'var(--text-secondary)' }}>
                Klicke, um {isChapter ? 'das Kapitel' : 'den Vers'} zu laden...
              </div>
            )}
            
            {/* In Notiz übernehmen - Buttons - nur anzeigen, wenn onInsertText verfügbar ist (nicht im reinen Vorschaumodus) */}
            {(verse || chapter) && onInsertText && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                  In Notiz übernehmen:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleInsertToNote('text')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                  >
                    📝 Nur Text
                  </button>
                  <button
                    onClick={() => handleInsertToNote('quote')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                  >
                    💬 Als Zitat (mit Referenz)
                  </button>
                  <button
                    onClick={() => handleInsertToNote('markdown')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                  >
                    📄 Mit Markdown-Formatierung
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      
      {/* Modal für alle Übersetzungen */}
      {showAllTranslationsModal && createPortal(
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
            zIndex: 3000
          }}
          onClick={(e) => {
            // Nur schließen, wenn direkt auf den Hintergrund geklickt wurde
            if (e.target === e.currentTarget) {
              setShowAllTranslationsModal(false);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                Verfügbare Übersetzungen
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTranslationsModal(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.25rem 0.5rem'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Zeige nur Übersetzungen, die NICHT in Favoriten sind */}
              {(() => {
                try {
                  const nonFavorites = getNonFavoriteTranslations();
                  if (nonFavorites.length > 0) {
                    return nonFavorites.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          try {
                            // Ändere Übersetzung zuerst
                            handleTranslationChange(t);
                            // Schließe Modal danach
                            setShowAllTranslationsModal(false);
                          } catch (err) {
                            console.error('Error selecting translation:', err);
                            setError('Fehler beim Auswählen der Übersetzung');
                            setShowAllTranslationsModal(false);
                          }
                        }}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: currentTranslation === t ? 'var(--accent-color)' : 'var(--bg-secondary)',
                          color: currentTranslation === t ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          textAlign: 'left',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (currentTranslation !== t) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentTranslation !== t) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          }
                        }}
                      >
                        {getTranslationName(t)}
                      </button>
                    ));
                  } else {
                    return (
                      <div style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem'
                      }}>
                        Alle verfügbaren Übersetzungen sind bereits in deinen Favoriten
                      </div>
                    );
                  }
                } catch (err) {
                  console.error('Error rendering translations:', err);
                  return (
                    <div style={{ 
                      padding: '1rem', 
                      textAlign: 'center', 
                      color: 'var(--error-text, #c33)',
                      fontSize: '0.875rem'
                    }}>
                      Fehler beim Laden der Übersetzungen
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

