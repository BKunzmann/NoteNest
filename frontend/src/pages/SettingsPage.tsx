/**
 * Settings Page
 * 
 * Einstellungen für Benutzer (Pfade, Theme, etc.)
 */

import { useState, useEffect, FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { settingsAPI, bibleAPI, BibleFavorite } from '../services/api';
import {
  UserSettings,
  UpdateSettingsRequest,
  SettingsPathOptionsResponse
} from '../types/settings';
import { useThemeStore } from '../store/themeStore';
import { getTranslationName } from '../utils/bibleTranslation';
import FolderNavigator from '../components/FileManager/FolderNavigator';

// Verfügbare Übersetzungen (tatsächlich in den JSON-Dateien vorhanden)
import { LOCAL_TRANSLATIONS } from '../utils/bibleTranslation';

export default function SettingsPage() {
  const location = useLocation();
  const { setTheme: updateTheme } = useThemeStore();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pathOptions, setPathOptions] = useState<SettingsPathOptionsResponse | null>(null);

  const [privatePath, setPrivatePath] = useState('');
  const [sharedPath, setSharedPath] = useState('');
  const [defaultNoteType, setDefaultNoteType] = useState<'private' | 'shared'>('private');
  const [defaultNoteFolderPath, setDefaultNoteFolderPath] = useState('/');
  const [sidebarViewMode, setSidebarViewMode] = useState<'recent' | 'folders'>('recent');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [exportSize, setExportSize] = useState('A4');
  const [bibleTranslation, setBibleTranslation] = useState('LUT1912');
  
  // Bibelübersetzungs-Favoriten
  const [favorites, setFavorites] = useState<BibleFavorite[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState<string>('');
  
  // Verfügbare Übersetzungen (lokal + API)
  const [availableTranslations, setAvailableTranslations] = useState<{
    local: string[];
    api: string[];
    all: string[];
  } | null>(null);

  // Nur rendern, wenn wir tatsächlich auf /settings sind
  if (location.pathname !== '/settings') {
    return null;
  }

  useEffect(() => {
    loadSettings();
    loadPathOptions();
    loadFavorites();
    loadAvailableTranslations();
  }, []);

  const loadPathOptions = async () => {
    try {
      const options = await settingsAPI.getPathOptions();
      setPathOptions(options);
    } catch (err) {
      console.error('Error loading path options:', err);
      setPathOptions({ privatePaths: [], sharedPaths: [] });
    }
  };

  const loadAvailableTranslations = async () => {
    try {
      const data = await bibleAPI.getTranslations();
      setAvailableTranslations(data);
    } catch (err: any) {
      console.error('Error loading available translations:', err);
      // Fallback: Verwende nur lokale Übersetzungen
      setAvailableTranslations({
        local: LOCAL_TRANSLATIONS,
        api: [],
        all: LOCAL_TRANSLATIONS
      });
    }
  };

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await settingsAPI.getSettings();
      setSettings(data);
      setPrivatePath(data.private_folder_path || '');
      setSharedPath(data.shared_folder_path || '');
      setDefaultNoteType(data.default_note_type || 'private');
      setDefaultNoteFolderPath(data.default_note_folder_path || '/');
      setSidebarViewMode(data.sidebar_view_mode || 'recent');
      setTheme((data.theme || 'light') as 'light' | 'dark');
      setExportSize(data.default_export_size || 'A4');
      // Normalisiere Standard-Übersetzung (LUT -> LUT1912, etc.)
      const defaultTranslation = data.default_bible_translation || 'LUT1912';
      const normalized = defaultTranslation === 'LUT' ? 'LUT1912' : 
                        defaultTranslation === 'ELB' ? 'ELB1905' : 
                        defaultTranslation === 'SCH' ? 'SCH1951' : defaultTranslation;
      const finalTranslation = LOCAL_TRANSLATIONS.includes(normalized) ? normalized : 'LUT1912';
      setBibleTranslation(finalTranslation);
      
      // Stelle sicher, dass Standard-Übersetzung als Favorit existiert
      await ensureDefaultTranslationIsFavorite(finalTranslation);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = async () => {
    setIsLoadingFavorites(true);
    try {
      const data = await bibleAPI.getFavorites();
      setFavorites(data.favorites);
    } catch (err: any) {
      console.error('Error loading favorites:', err);
      // Fehler ignorieren, Favoriten sind optional
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  /**
   * Stellt sicher, dass die Standard-Übersetzung als Favorit existiert
   */
  const ensureDefaultTranslationIsFavorite = async (defaultTranslation: string) => {
    try {
      const favoritesData = await bibleAPI.getFavorites();
      const existingFavorite = favoritesData.favorites.find(f => f.translation === defaultTranslation);
      
      if (!existingFavorite) {
        // Füge Standard-Übersetzung automatisch als Favorit hinzu (mit isDefault: true)
        await bibleAPI.addFavorite(defaultTranslation, true);
        // Lade Favoriten neu, um die aktualisierte Liste zu bekommen
        await loadFavorites();
      } else if (existingFavorite.display_order !== 0) {
        // Wenn bereits vorhanden, aber nicht an Position 0, setze es auf 0
        // Verschiebe alle anderen um 1 nach unten
        const sortedFavorites = favoritesData.favorites
          .filter(f => f.translation !== defaultTranslation)
          .sort((a, b) => a.display_order - b.display_order)
          .map((f, idx) => ({ translation: f.translation, order: idx + 1 }));
        
        // Füge Standard-Übersetzung mit order 0 hinzu
        sortedFavorites.unshift({ translation: defaultTranslation, order: 0 });
        
        await bibleAPI.updateFavoritesOrder(sortedFavorites);
        await loadFavorites();
      }
    } catch (err: any) {
      console.error('Error ensuring default translation is favorite:', err);
      // Fehler ignorieren, ist nicht kritisch
    }
  };

  const handleAddFavorite = async () => {
    if (!selectedTranslation) {
      setError('Bitte wähle eine Übersetzung aus');
      return;
    }
    
    try {
      await bibleAPI.addFavorite(selectedTranslation);
      await loadFavorites();
      setSelectedTranslation('');
      setSuccess('Favorit hinzugefügt');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Hinzufügen des Favoriten');
    }
  };

  const handleRemoveFavorite = async (translation: string) => {
    // Verhindere Entfernen der Standard-Übersetzung
    if (translation === bibleTranslation) {
      setError('Die Standard-Übersetzung kann nicht aus den Favoriten entfernt werden');
      return;
    }
    
    try {
      await bibleAPI.deleteFavorite(translation);
      await loadFavorites();
      setSuccess('Favorit entfernt');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Entfernen des Favoriten');
    }
  };

  const handleMoveFavorite = async (translation: string, direction: 'up' | 'down') => {
    // Verhindere Verschieben der Standard-Übersetzung
    if (translation === bibleTranslation) {
      setError('Die Standard-Übersetzung bleibt immer an erster Stelle');
      return;
    }
    
    const sortedFavorites = [...favorites]
      .filter(f => f.translation !== bibleTranslation) // Standard-Übersetzung ausschließen
      .sort((a, b) => a.display_order - b.display_order);
    const index = sortedFavorites.findIndex(f => f.translation === translation);
    
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedFavorites.length - 1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = sortedFavorites[index];
    sortedFavorites[index] = sortedFavorites[newIndex];
    sortedFavorites[newIndex] = temp;
    
    // Aktualisiere display_order
    // Standard-Übersetzung bleibt immer bei order 0
    const updatedFavorites = [
      { translation: bibleTranslation, order: 0 },
      ...sortedFavorites.map((fav, idx) => ({
        translation: fav.translation,
        order: idx + 1
      }))
    ];
    
    try {
      await bibleAPI.updateFavoritesOrder(updatedFavorites);
      await loadFavorites();
      setSuccess('Reihenfolge aktualisiert');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Aktualisieren der Reihenfolge');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const oldDefaultTranslation = settings?.default_bible_translation;
      const updates: UpdateSettingsRequest = {
        private_folder_path: privatePath || null,
        shared_folder_path: sharedPath || null,
        default_note_type: defaultNoteType,
        default_note_folder_path: defaultNoteFolderPath || '/',
        sidebar_view_mode: sidebarViewMode,
        theme,
        default_export_size: exportSize,
        default_bible_translation: bibleTranslation
      };

      const updated = await settingsAPI.updateSettings(updates);
      setSettings(updated);
      window.dispatchEvent(new CustomEvent('notenest:settings-changed', { detail: updates }));
      
      // Wende Theme sofort an
      if (updates.theme) {
        updateTheme(updates.theme as 'light' | 'dark');
      }
      
      // Wenn sich die Standard-Übersetzung geändert hat:
      if (oldDefaultTranslation && oldDefaultTranslation !== bibleTranslation) {
        // Stelle sicher, dass die alte Standard-Übersetzung nicht mehr order 0 hat
        // (wird automatisch durch ensureDefaultTranslationIsFavorite für die neue gemacht)
        // Lade Favoriten neu, um die aktualisierte Liste zu bekommen
        await loadFavorites();
      }
      
      // Stelle sicher, dass die neue Standard-Übersetzung als Favorit existiert (mit order 0)
      await ensureDefaultTranslationIsFavorite(bibleTranslation);
      
      setSuccess('Einstellungen erfolgreich gespeichert');
      
      // Scrolle nach oben, damit die Erfolgsmeldung sichtbar ist
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern der Einstellungen');
      // Scrolle nach oben, damit die Fehlermeldung sichtbar ist
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
        <div>Lädt Einstellungen...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '2rem',
      position: 'relative',
      zIndex: 1
    }}>
      <h1 style={{ marginBottom: '2rem' }}>Einstellungen</h1>

      {/* Erfolgs- und Fehlermeldungen - immer sichtbar am oberen Rand */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--bg-primary, #fff)',
        paddingTop: '1rem',
        marginTop: '-1rem',
        marginBottom: '1rem',
        paddingBottom: error || success ? '0' : '1rem'
      }}>
        {error && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            border: '1px solid #c33',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#efe',
            color: '#3c3',
            borderRadius: '4px',
            border: '1px solid #3c3',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {success}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Ordner-Pfade */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Ordner-Konfiguration</h2>

          {(() => {
            const privateOptions = pathOptions?.privatePaths || [];
            const sharedOptions = pathOptions?.sharedPaths || [];
            const hasCurrentPrivate = privatePath
              ? privateOptions.some(option => option.path === privatePath)
              : false;
            const hasCurrentShared = sharedPath
              ? sharedOptions.some(option => option.path === sharedPath)
              : false;

            return (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="privatePath" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Privater Ordner-Pfad
                  </label>
                  <select
                    id="privatePath"
                    value={privatePath}
                    onChange={(e) => setPrivatePath(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  >
                    {!hasCurrentPrivate && privatePath && (
                      <option value={privatePath}>
                        {privatePath} (aktuell)
                      </option>
                    )}
                    {privateOptions.length === 0 && (
                      <option value={privatePath || ''} disabled>
                        Keine Pfadoptionen verfügbar
                      </option>
                    )}
                    {privateOptions.map((option) => (
                      <option key={`private-${option.path}`} value={option.path}>
                        {option.label}: {option.path}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    Auswahl über sichere Vorschläge, damit keine ungültigen Pfade gespeichert werden.
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="sharedPath" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Geteilter Ordner-Pfad (optional)
                  </label>
                  <select
                    id="sharedPath"
                    value={sharedPath}
                    onChange={(e) => setSharedPath(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Nicht gesetzt</option>
                    {!hasCurrentShared && sharedPath && (
                      <option value={sharedPath}>
                        {sharedPath} (aktuell)
                      </option>
                    )}
                    {sharedOptions.map((option) => (
                      <option key={`shared-${option.path}`} value={option.path}>
                        {option.label}: {option.path}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    Shared-Pfade werden aus den erlaubten Freigaben vorgeschlagen.
                  </div>
                </div>
              </>
            );
          })()}

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="defaultNoteType" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Standardablage für neue Notizen
            </label>
            <div style={{ marginBottom: '0.75rem' }}>
              <select
                id="defaultNoteType"
                value={defaultNoteType}
                onChange={(e) => setDefaultNoteType(e.target.value as 'private' | 'shared')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="private">Privat</option>
                <option value="shared">Geteilt</option>
              </select>
            </div>
            <FolderNavigator
              storageType={defaultNoteType}
              value={defaultNoteFolderPath}
              onChange={setDefaultNoteFolderPath}
              label="Standard-Zielordner"
              helperText="Die Auswahl erfolgt per Ordnernavigation, um Tippfehler zu vermeiden."
            />
            <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
              Neue Notizen landen standardmäßig hier (z.B. /Predigten/2026).
            </div>
          </div>
        </div>

        {/* Weitere Einstellungen */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Weitere Einstellungen</h2>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="sidebarViewMode" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Standard-Sidebar-Ansicht
            </label>
            <select
              id="sidebarViewMode"
              value={sidebarViewMode}
              onChange={(e) => setSidebarViewMode(e.target.value as 'recent' | 'folders')}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="recent">Zuletzt bearbeitet (gruppiert)</option>
              <option value="folders">Ordneransicht</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="theme" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Theme
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => {
                const newTheme = e.target.value as 'light' | 'dark';
                setTheme(newTheme);
                updateTheme(newTheme); // Wende sofort an
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="light">Hell</option>
              <option value="dark">Dunkel</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="exportSize" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Standard Export-Größe
            </label>
            <select
              id="exportSize"
              value={exportSize}
              onChange={(e) => setExportSize(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="bibleTranslation" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Standard Bibel-Übersetzung
            </label>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              Diese Übersetzung wird standardmäßig in Hover-Text und Popup verwendet
            </div>
            <select
              id="bibleTranslation"
              value={bibleTranslation}
              onChange={(e) => setBibleTranslation(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              {(availableTranslations?.all || LOCAL_TRANSLATIONS).map(translation => (
                <option key={translation} value={translation}>
                  {getTranslationName(translation)}
                  {availableTranslations?.api.includes(translation) && ' (API)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bibelübersetzungs-Favoriten */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Bibelübersetzungs-Favoriten</h2>
          <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
            Füge häufig verwendete Übersetzungen zu deinen Favoriten hinzu. Sie erscheinen dann zuerst in der Auswahl.
          </div>

          {/* Favoriten-Liste */}
          {isLoadingFavorites ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
              Lädt Favoriten...
            </div>
          ) : favorites.length > 0 ? (
            <div style={{ marginBottom: '1.5rem' }}>
              {/* Standard-Übersetzung immer zuerst anzeigen */}
              {favorites
                .filter(fav => fav.translation === bibleTranslation)
                .map((fav) => (
                  <div
                    key={fav.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '4px',
                      border: '1px solid #2196F3'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>⭐</span>
                    <span style={{ flex: 1, fontWeight: 'bold' }}>
                      {getTranslationName(fav.translation)} <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>(Standard)</span>
                    </span>
                    <button
                      type="button"
                      disabled={true}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'not-allowed',
                        fontSize: '0.875rem',
                        opacity: 0.5
                      }}
                      title="Standard-Übersetzung kann nicht verschoben werden"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={true}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'not-allowed',
                        fontSize: '0.875rem',
                        opacity: 0.5
                      }}
                      title="Standard-Übersetzung kann nicht verschoben werden"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={true}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'not-allowed',
                        fontSize: '0.875rem',
                        opacity: 0.5
                      }}
                      title="Standard-Übersetzung kann nicht entfernt werden"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              {/* Andere Favoriten (ohne Standard-Übersetzung) */}
              {favorites
                .filter(fav => fav.translation !== bibleTranslation)
                .sort((a, b) => a.display_order - b.display_order)
                .map((fav, index) => {
                  // Index für andere Favoriten (ohne Standard)
                  const otherFavorites = favorites.filter(f => f.translation !== bibleTranslation);
                  return (
                    <div
                      key={fav.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>⭐</span>
                      <span style={{ flex: 1, fontWeight: 'bold' }}>
                        {getTranslationName(fav.translation)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveFavorite(fav.translation, 'up')}
                        disabled={index === 0}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: index === 0 ? '#ccc' : '#007AFF',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          opacity: index === 0 ? 0.5 : 1
                        }}
                        title="Nach oben"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFavorite(fav.translation, 'down')}
                        disabled={index === otherFavorites.length - 1}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: index === otherFavorites.length - 1 ? '#ccc' : '#007AFF',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: index === otherFavorites.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          opacity: index === otherFavorites.length - 1 ? 0.5 : 1
                        }}
                        title="Nach unten"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFavorite(fav.translation)}
                        disabled={fav.translation === bibleTranslation}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: fav.translation === bibleTranslation ? '#ccc' : '#ff3b30',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: fav.translation === bibleTranslation ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          opacity: fav.translation === bibleTranslation ? 0.5 : 1
                        }}
                        title={fav.translation === bibleTranslation ? 'Standard-Übersetzung kann nicht entfernt werden' : 'Entfernen'}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div style={{ 
              padding: '1rem', 
              textAlign: 'center', 
              color: '#666',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              marginBottom: '1.5rem'
            }}>
              Noch keine Favoriten hinzugefügt
            </div>
          )}

          {/* Favorit hinzufügen */}
          <div>
            <label htmlFor="addFavorite" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Übersetzung zu Favoriten hinzufügen
            </label>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              Favoriten erscheinen zuerst im Popup und können mit einem Klick gewechselt werden
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                id="addFavorite"
                value={selectedTranslation}
                onChange={(e) => setSelectedTranslation(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="">-- Übersetzung wählen --</option>
                {(availableTranslations?.all || LOCAL_TRANSLATIONS)
                  .filter(t => !favorites.some(f => f.translation === t))
                  .map(t => (
                    <option key={t} value={t}>
                      {getTranslationName(t)}
                      {availableTranslations?.api.includes(t) && ' (API)'}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddFavorite}
                disabled={!selectedTranslation}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: selectedTranslation ? '#007AFF' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedTranslation ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1
          }}
        >
          {isSaving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
        </button>
      </form>
    </div>
  );
}

