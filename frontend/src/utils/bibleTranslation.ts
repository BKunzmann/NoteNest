/**
 * Bible Translation Utilities
 * 
 * Funktionen für Übersetzungs-Namen und -Verwaltung
 */

/**
 * Mapping von Übersetzungs-Codes zu Anzeigenamen
 */
const TRANSLATION_NAMES: Record<string, string> = {
  'LUT': 'Lutherbibel',
  'LUT1912': 'Lutherbibel 1912',
  'LUT1545': 'Lutherbibel 1545',
  'ELB': 'Elberfelder Bibel',
  'ELB1905': 'Elberfelder Bibel 1905',
  'SCH': 'Schlachter',
  'SCH1951': 'Schlachter 1951',
  'BasisBibel': 'BasisBibel',
  'NGÜ': 'Neue Genfer Übersetzung',
  'HFA': 'Hoffnung für Alle'
};

/**
 * Mapping von generischen Übersetzungs-Codes zu normalisierten Codes (wie im Backend)
 */
const TRANSLATION_NORMALIZATION: Record<string, string> = {
  'LUT': 'LUT1912',
  'ELB': 'ELB1905',
  'SCH': 'SCH1951'
};

/**
 * Normalisiert einen Übersetzungs-Code (wie im Backend)
 */
export function normalizeTranslation(code: string): string {
  return TRANSLATION_NORMALIZATION[code] || code;
}

/**
 * Prüft, ob zwei Übersetzungs-Codes gleich sind (berücksichtigt Normalisierung)
 */
export function translationsMatch(code1: string, code2: string): boolean {
  const normalized1 = normalizeTranslation(code1);
  const normalized2 = normalizeTranslation(code2);
  return normalized1 === normalized2 || code1 === code2 || normalized1 === code2 || code1 === normalized2;
}

/**
 * Gibt den Anzeigenamen für eine Übersetzung zurück
 */
export function getTranslationName(code: string): string {
  return TRANSLATION_NAMES[code] || code;
}

/**
 * Verfügbare lokale Übersetzungen (tatsächlich in der Datenbank vorhanden)
 * Diese 4 Übersetzungen sind in den JSON-Dateien vorhanden
 */
export const LOCAL_TRANSLATIONS = ['LUT1912', 'LUT1545', 'ELB1905', 'SCH1951'];

/**
 * Generische Übersetzungs-Codes, die automatisch normalisiert werden
 * Werden für Kompatibilität verwendet, aber nicht in der Favoriten-Auswahl angezeigt
 */
export const GENERIC_TRANSLATIONS = ['LUT', 'ELB', 'SCH'];

/**
 * Verfügbare API-Übersetzungen (wenn API aktiviert)
 * 
 * HINWEIS: Die API https://rest.api.bible hat nur ältere deutsche Übersetzungen.
 * Moderne Übersetzungen (Luther 2017, Elberfelder 2006, BasisBibel, NGÜ, HFA) sind nicht verfügbar.
 * 
 * Verfügbar über API:
 * - ELB: Elberfelder Translation (Version of bibelkommentare.de)
 */
export const API_TRANSLATIONS: string[] = ['ELB']; // Nur ELB ist über die API verfügbar

/**
 * Gibt alle verfügbaren Übersetzungen zurück
 * Enthält nur die tatsächlich vorhandenen lokalen Übersetzungen
 * (ohne generische Codes, die nur für Normalisierung verwendet werden)
 */
export function getAvailableTranslations(): string[] {
  return [...LOCAL_TRANSLATIONS];
}

