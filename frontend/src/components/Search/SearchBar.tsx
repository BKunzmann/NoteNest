/**
 * Search Bar Component
 * 
 * Suchleiste mit Dropdown für Suchergebnisse
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI, SearchResult } from '../../services/api';

interface SearchBarProps {
  onClose?: () => void;
}

export default function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = 'search-results-list';

  useEffect(() => {
    // Fokussiere Input beim Öffnen
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Debounce: Warte 300ms nach Eingabe, bevor gesucht wird
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
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

  const handleSelectResult = (result: SearchResult) => {
    // Navigiere zur Notiz (die NotesPage lädt die Datei dann aus der URL)
    // Wichtig: Pfad muss korrekt encodiert werden
    // Entferne führenden Slash für die URL (wird in NotesPage wieder hinzugefügt)
    let pathForUrl = result.path;
    if (pathForUrl.startsWith('/')) {
      pathForUrl = pathForUrl.substring(1);
    }
    
    // Encodiere den gesamten Pfad (React Router decodiert automatisch)
    const encodedPath = encodeURIComponent(pathForUrl);
    
    navigate(`/notes/${result.type}/${encodedPath}`);
    
    // Schließe Suche
    setQuery('');
    setShowResults(false);
    if (onClose) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setQuery('');
      setShowResults(false);
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-expanded={showResults}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="Notizen durchsuchen"
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          placeholder="Notizen durchsuchen..."
          style={{
            width: '100%',
            padding: '0.75rem 2.5rem 0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #ddd)',
            fontSize: '1rem',
            backgroundColor: 'var(--bg-primary, #fff)',
            color: 'var(--text-primary, #333)',
            outline: 'none',
            minHeight: '44px'
          }}
        />
        {isSearching && (
          <span
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #666)'
            }}
          >
            🔍
          </span>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'var(--bg-primary, #fff)',
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000
          }}
        >
          {results.map((result, index) => (
            <div
              key={`${result.path}-${result.type}`}
              role="option"
              aria-selected={selectedIndex === index}
              onClick={() => handleSelectResult(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                padding: '1rem',
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
                marginBottom: '0.5rem'
              }}>
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary, #333)' }}>
                  {result.name}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary, #666)',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  <span>{result.type === 'private' ? '📁' : '👥'}</span>
                  <span>{result.matches.length} Treffer</span>
                </div>
              </div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary, #666)',
                marginBottom: '0.25rem'
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
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #666)',
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: 'var(--bg-secondary, #f9f9f9)',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  Zeile {match.line}: {match.context}
                </div>
              ))}
              {result.matches.length > 2 && !expandedResults.has(`${result.path}-${result.type}`) && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedResults(prev => {
                      const newSet = new Set(prev);
                      newSet.add(`${result.path}-${result.type}`);
                      return newSet;
                    });
                  }}
                  style={{ 
                    fontSize: '0.75rem', 
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
                    setExpandedResults(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(`${result.path}-${result.type}`);
                      return newSet;
                    });
                  }}
                  style={{ 
                    fontSize: '0.75rem', 
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
        </div>
      )}

      {showResults && query.trim().length >= 2 && results.length === 0 && !isSearching && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-primary, #fff)',
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            textAlign: 'center',
            color: 'var(--text-secondary, #666)'
          }}
        >
          Keine Ergebnisse gefunden
        </div>
      )}
    </div>
  );
}

