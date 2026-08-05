/**
 * Bible Translation Utilities
 *
 * Funktionen für Übersetzungs-Namen und -Verwaltung
 */

import type { BibleTranslationDetail } from '../services/api';

/**
 * Mapping von Übersetzungs-Codes zu Anzeigenamen
 */
const TRANSLATION_NAMES: Record<string, string> = {
  LUT: 'Lutherbibel',
  LUT1912: 'Lutherbibel 1912',
  LUT1545: 'Lutherbibel 1545',
  ELB: 'Elberfelder Bibel',
  ELB1905: 'Elberfelder Bibel 1905',
  SCH: 'Schlachter',
  SCH1951: 'Schlachter 1951',
  BasisBibel: 'BasisBibel',
  NGÜ: 'Neue Genfer Übersetzung',
  HFA: 'Hoffnung für Alle'
};

/**
 * Dynamische Namens-Cache aus dem API-Katalog
 */
const dynamicNameCache: Record<string, string> = {};

/**
 * Mapping von generischen Übersetzungs-Codes zu normalisierten Codes (wie im Backend)
 */
const TRANSLATION_NORMALIZATION: Record<string, string> = {
  LUT: 'LUT1912',
  ELB: 'ELB1905',
  SCH: 'SCH1951'
};

/**
 * Normalisiert einen Übersetzungs-Code (wie im Backend)
 * API-Bible-IDs und unbekannte Codes bleiben unverändert.
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
 * Registriert Anzeigenamen aus dem Backend-Katalog
 */
export function registerTranslationDetails(details: BibleTranslationDetail[]): void {
  for (const detail of details) {
    const label = detail.nameLocal || detail.name;
    const withAbbr =
      detail.abbreviation && detail.abbreviation !== label
        ? `${label} (${detail.abbreviation})`
        : label;
    dynamicNameCache[detail.id] = withAbbr;
    if (detail.abbreviation) {
      dynamicNameCache[detail.abbreviation] = withAbbr;
    }
  }
}

/**
 * Gibt den Anzeigenamen für eine Übersetzung zurück
 */
export function getTranslationName(code: string): string {
  return TRANSLATION_NAMES[code] || dynamicNameCache[code] || code;
}

/**
 * Verfügbare lokale Übersetzungen (tatsächlich in der Datenbank vorhanden)
 */
export const LOCAL_TRANSLATIONS = ['LUT1912', 'LUT1545', 'ELB1905', 'SCH1951'];

/**
 * Generische Übersetzungs-Codes, die automatisch normalisiert werden
 */
export const GENERIC_TRANSLATIONS = ['LUT', 'ELB', 'SCH'];

/**
 * Verfügbare API-Übersetzungen (Fallback, wenn Backend-Katalog nicht geladen)
 * Wird dynamisch über GET /bible/translations befüllt.
 */
export const API_TRANSLATIONS: string[] = [];

/**
 * Gibt lokale Übersetzungen zurück (Fallback ohne Backend)
 */
export function getAvailableTranslations(): string[] {
  return [...LOCAL_TRANSLATIONS];
}

/**
 * Häufige Sprachfilter für die UI
 */
export const COMMON_BIBLE_LANGUAGES = [
  { id: 'deu', name: 'Deutsch' },
  { id: 'eng', name: 'Englisch' },
  { id: 'fra', name: 'Französisch' },
  { id: 'spa', name: 'Spanisch' },
  { id: 'ita', name: 'Italienisch' },
  { id: 'nld', name: 'Niederländisch' },
  { id: 'por', name: 'Portugiesisch' },
  { id: 'rus', name: 'Russisch' }
];
