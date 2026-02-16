/**
 * Search Bar Component
 *
 * Suchleiste mit Verlauf, Ergebnisliste und Mobile-Optimierung.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI, SearchResult } from '../../services/api';

interface SearchBarProps {
  onClose?: () => void;
}

const SEARCH_HISTORY_KEY = 'notenest.search-history';
const MAX_SEARCH_HISTORY_ITEMS = 8;
const MOBILE_BREAKPOINT = 700;

export default function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < MOBILE_BREAKPOINT);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = 'search-results-list';

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    try {
      const rawHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!rawHistory) {
        setSearchHistory([]);
        return;
      }

      const parsedHistory = JSON.parse(rawHistory);
      if (!Array.isArray(parsedHistory)) {
        setSearchHistory([]);
        return;
      }

      const cleanedHistory = parsedHistory
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length >= 2)
        .slice(0, MAX_SEARCH_HISTORY_ITEMS);
      setSearchHistory(cleanedHistory);
    } catch {
      setSearchHistory([]);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      setSelectedIndex(-1);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchAPI.search(query.trim());
        setResults(response.results);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const persistSearchHistory = (nextHistory: string[]) => {
    setSearchHistory(nextHistory);
    try {
      if (nextHistory.length === 0) {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        return;
      }
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
    } catch {
      // optional
    }
  };

  const addQueryToHistory = (value: string) => {
    const normalized = value.trim();
    if (normalized.length < 2) {
      return;
    }
    const deduplicated = searchHistory.filter(
      (historyEntry) => historyEntry.toLowerCase() !== normalized.toLowerCase()
    );
    persistSearchHistory([normalized, ...deduplicated].slice(0, MAX_SEARCH_HISTORY_ITEMS));
  };

  const handleSelectResult = (result: SearchResult) => {
    addQueryToHistory(query);

    let pathForUrl = result.path;
    if (pathForUrl.startsWith('/')) {
      pathForUrl = pathForUrl.substring(1);
    }

    const encodedPath = encodeURIComponent(pathForUrl);
    navigate(`/notes/${result.type}/${encodedPath}`);
    setQuery('');
    setShowResults(false);
    if (onClose) {
      onClose();
    }
  };

  const handleHistorySelect = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowResults(true);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const removeHistoryItem = (value: string) => {
    persistSearchHistory(
      searchHistory.filter(
        (historyEntry) => historyEntry.toLowerCase() !== value.toLowerCase()
      )
    );
  };

  const clearSearchHistory = () => {
    persistSearchHistory([]);
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setShowResults(true);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (
        prev < results.length - 1 ? prev + 1 : prev
      ));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      } else if (results[0]) {
        e.preventDefault();
        handleSelectResult(results[0]);
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
      if (!query) {
        onClose?.();
      } else {
        clearQuery();
      }
    }
  };

  const normalizedQuery = query.trim();
  const hasResultView = showResults && normalizedQuery.length >= 2;
  const hasHistoryView = showResults && normalizedQuery.length < 2 && searchHistory.length > 0;

  const resultContainerStyle: React.CSSProperties = isMobile
    ? {
      position: 'fixed',
      top: '56px',
      left: 0,
      right: 0,
      bottom: '56px',
      marginTop: 0,
      backgroundColor: 'var(--bg-primary, #fff)',
      borderTop: '1px solid var(--border-color, #ddd)',
      borderBottom: '1px solid var(--border-color, #ddd)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      overflowY: 'auto',
      zIndex: 2500
    }
    : {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: '0.25rem',
      backgroundColor: 'var(--bg-primary, #fff)',
      border: '1px solid var(--border-color, #ddd)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      maxHeight: '420px',
      overflowY: 'auto',
      zIndex: 2500
    };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', maxWidth: isMobile ? '100%' : '600px' }}
    >
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onKeyDown={handleKeyDown}
          aria-expanded={showResults}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="Notizen durchsuchen"
          onFocus={() => {
            setShowResults(true);
          }}
          placeholder="Notizen durchsuchen..."
          style={{
            width: '100%',
            padding: '0.65rem 4.5rem 0.65rem 0.9rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #ddd)',
            fontSize: isMobile ? '0.95rem' : '1rem',
            backgroundColor: 'var(--bg-primary, #fff)',
            color: 'var(--text-primary, #333)',
            outline: 'none',
            minHeight: '44px'
          }}
        />

        {query && (
          <button
            type="button"
            onClick={clearQuery}
            aria-label="Suchfeld leeren"
            style={{
              position: 'absolute',
              right: isSearching ? '2.4rem' : '1.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        )}

        <span
          style={{
            position: 'absolute',
            right: '0.9rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.875rem',
            color: 'var(--text-secondary, #666)'
          }}
        >
          {isSearching ? '…' : '🔍'}
        </span>
      </div>

      {(hasResultView || hasHistoryView) && (
        <div id={listboxId} role="listbox" style={resultContainerStyle}>
          {hasHistoryView && (
            <div style={{ padding: isMobile ? '0.85rem' : '1rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                gap: '0.5rem'
              }}>
                <div style={{
                  fontSize: isMobile ? '0.86rem' : '0.8rem',
                  color: 'var(--text-secondary, #666)',
                  fontWeight: 700
                }}>
                  Letzte Suchen
                </div>
                <button
                  type="button"
                  onClick={clearSearchHistory}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--accent-color, #1976d2)',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.8rem' : '0.75rem'
                  }}
                >
                  Verlauf löschen
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {searchHistory.map((historyEntry) => (
                  <div
                    key={historyEntry}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleHistorySelect(historyEntry)}
                      style={{
                        border: '1px solid var(--border-color, #ddd)',
                        borderRadius: '999px',
                        padding: isMobile ? '0.45rem 0.65rem' : '0.35rem 0.6rem',
                        backgroundColor: 'var(--bg-secondary, #f8f8f8)',
                        color: 'var(--text-primary, #333)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: isMobile ? '0.86rem' : '0.8rem',
                        flex: 1,
                        minHeight: '36px'
                      }}
                    >
                      {historyEntry}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHistoryItem(historyEntry)}
                      aria-label={`Suchverlaufseintrag ${historyEntry} entfernen`}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary, #666)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasResultView && results.map((result, index) => (
            <div
              key={`${result.path}-${result.type}`}
              role="option"
              aria-selected={selectedIndex === index}
              onClick={() => handleSelectResult(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                padding: isMobile ? '0.85rem' : '1rem',
                cursor: 'pointer',
                backgroundColor: selectedIndex === index
                  ? 'var(--accent-bg, #e3f2fd)'
                  : 'transparent',
                borderBottom: index < results.length - 1
                  ? '1px solid var(--border-color, #eee)'
                  : 'none'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
                gap: '0.5rem'
              }}>
                <div style={{
                  fontWeight: 700,
                  color: 'var(--text-primary, #333)',
                  fontSize: isMobile ? '0.98rem' : '0.92rem',
                  wordBreak: 'break-word'
                }}>
                  {result.name}
                </div>
                <div style={{
                  fontSize: isMobile ? '0.8rem' : '0.75rem',
                  color: 'var(--text-secondary, #666)',
                  display: 'flex',
                  gap: '0.4rem',
                  alignItems: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  <span>{result.type === 'private' ? '📁' : '👥'}</span>
                  <span>{result.matches.length}</span>
                </div>
              </div>

              <div style={{
                fontSize: isMobile ? '0.82rem' : '0.8rem',
                color: 'var(--text-secondary, #666)',
                marginBottom: '0.2rem',
                wordBreak: 'break-word'
              }}>
                {result.path}
              </div>

              {(expandedResults.has(`${result.path}-${result.type}`)
                ? result.matches
                : result.matches.slice(0, 2)
              ).map((match, matchIndex) => (
                <div
                  key={matchIndex}
                  style={{
                    fontSize: isMobile ? '0.78rem' : '0.74rem',
                    color: 'var(--text-secondary, #666)',
                    marginTop: '0.45rem',
                    padding: '0.45rem',
                    backgroundColor: 'var(--bg-secondary, #f9f9f9)',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-word'
                  }}
                >
                  {match.line > 0 ? `Zeile ${match.line}: ${match.context}` : match.context}
                </div>
              ))}

              {result.matches.length > 2 && !expandedResults.has(`${result.path}-${result.type}`) && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedResults((prev) => {
                      const next = new Set(prev);
                      next.add(`${result.path}-${result.type}`);
                      return next;
                    });
                  }}
                  style={{
                    fontSize: isMobile ? '0.78rem' : '0.75rem',
                    color: 'var(--accent-color, #1976d2)',
                    marginTop: '0.25rem',
                    fontStyle: 'italic',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  + {result.matches.length - 2} weitere Treffer
                </div>
              )}

              {expandedResults.has(`${result.path}-${result.type}`) && result.matches.length > 2 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedResults((prev) => {
                      const next = new Set(prev);
                      next.delete(`${result.path}-${result.type}`);
                      return next;
                    });
                  }}
                  style={{
                    fontSize: isMobile ? '0.78rem' : '0.75rem',
                    color: 'var(--accent-color, #1976d2)',
                    marginTop: '0.25rem',
                    fontStyle: 'italic',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Weniger anzeigen
                </div>
              )}
            </div>
          ))}

          {hasResultView && query.trim().length >= 2 && results.length === 0 && !isSearching && (
            <div style={{
              padding: '1rem',
              textAlign: 'center',
              color: 'var(--text-secondary, #666)',
              fontSize: isMobile ? '0.92rem' : '0.85rem'
            }}>
              Keine Ergebnisse gefunden
            </div>
          )}
        </div>
      )}
    </div>
  );
}

