/**
 * Bible Service
 * 
 * Verantwortlich für:
 * - Bibelverse aus der Datenbank abrufen
 * - Bibelstellen-Parsing und -Normalisierung
 * - Cache-Verwaltung
 */

import db from '../config/database';
import { BIBLE_CACHE_TTL } from '../config/constants';

/**
 * Buchnamen-Mapping (Deutsch -> Standard-Codes)
 */
const BOOK_MAPPING: Record<string, string> = {
  // Altes Testament
  '1. mose': 'GEN', '1 mose': 'GEN', '1.mose': 'GEN', 'genesis': 'GEN',
  '2. mose': 'EXO', '2 mose': 'EXO', '2.mose': 'EXO', 'exodus': 'EXO',
  '3. mose': 'LEV', '3 mose': 'LEV', '3.mose': 'LEV', 'levitikus': 'LEV',
  '4. mose': 'NUM', '4 mose': 'NUM', '4.mose': 'NUM', 'numeri': 'NUM',
  '5. mose': 'DEU', '5 mose': 'DEU', '5.mose': 'DEU', 'deuteronomium': 'DEU',
  'josua': 'JOS', 'joshua': 'JOS',
  'richter': 'JDG', 'judges': 'JDG',
  'ruth': 'RUT',
  '1. samuel': '1SA', '1 samuel': '1SA', '1samuel': '1SA', '1.samuel': '1SA',
  '2. samuel': '2SA', '2 samuel': '2SA', '2samuel': '2SA', '2.samuel': '2SA',
  '1. könige': '1KI', '1 könige': '1KI', '1könige': '1KI', '1.könige': '1KI',
  '2. könige': '2KI', '2 könige': '2KI', '2könige': '2KI', '2.könige': '2KI',
  '1. chronik': '1CH', '1 chronik': '1CH', '1chronik': '1CH', '1.chronik': '1CH',
  '2. chronik': '2CH', '2 chronik': '2CH', '2chronik': '2CH', '2.chronik': '2CH',
  'esra': 'EZR',
  'nehemia': 'NEH',
  'esther': 'EST',
  'hiob': 'JOB', 'job': 'JOB',
  'psalm': 'PSA', 'ps': 'PSA', 'psalmen': 'PSA',
  'sprüche': 'PRO', 'sprueche': 'PRO',
  'prediger': 'ECC', 'kohelet': 'ECC',
  'hohelied': 'SNG', 'hoheslied': 'SNG',
  'jesaja': 'ISA',
  'jeremia': 'JER',
  'klagelieder': 'LAM',
  'hesekiel': 'EZK',
  'daniel': 'DAN',
  'hosea': 'HOS',
  'joel': 'JOL',
  'amos': 'AMO',
  'obadja': 'OBA',
  'jona': 'JON',
  'micha': 'MIC',
  'nahum': 'NAM',
  'habakuk': 'HAB',
  'zefanja': 'ZEP',
  'haggai': 'HAG',
  'sacharja': 'ZEC',
  'maleachi': 'MAL',
  
  // Neues Testament
  'matthäus': 'MAT', 'matthaeus': 'MAT', 'mt': 'MAT',
  'markus': 'MRK', 'mk': 'MRK',
  'lukas': 'LUK', 'lk': 'LUK',
  'johannes': 'JHN', 'joh': 'JHN',
  'apostelgeschichte': 'ACT', 'apg': 'ACT',
  'römer': 'ROM', 'roem': 'ROM',
  '1. korinther': '1CO', '1 korinther': '1CO', '1korinther': '1CO', '1kor': '1CO', '1.korinther': '1CO',
  '2. korinther': '2CO', '2 korinther': '2CO', '2korinther': '2CO', '2kor': '2CO', '2.korinther': '2CO',
  'galater': 'GAL',
  'epheser': 'EPH',
  'philipper': 'PHP',
  'kolosser': 'COL',
  '1. thessalonicher': '1TH', '1 thessalonicher': '1TH', '1thessalonicher': '1TH', '1.thessalonicher': '1TH',
  '2. thessalonicher': '2TH', '2 thessalonicher': '2TH', '2thessalonicher': '2TH', '2.thessalonicher': '2TH',
  '1. timotheus': '1TI', '1 timotheus': '1TI', '1timotheus': '1TI', '1.timotheus': '1TI',
  '2. timotheus': '2TI', '2 timotheus': '2TI', '2timotheus': '2TI', '2.timotheus': '2TI',
  'titus': 'TIT',
  'philemon': 'PHM',
  'hebräer': 'HEB', 'hebraeer': 'HEB',
  'jakobus': 'JAS',
  '1. petrus': '1PE', '1 petrus': '1PE', '1petrus': '1PE', '1.petrus': '1PE', '1. petr': '1PE', '1 petr': '1PE', '1petr': '1PE', '1.petr': '1PE',
  '2. petrus': '2PE', '2 petrus': '2PE', '2petrus': '2PE', '2.petrus': '2PE', '2. petr': '2PE', '2 petr': '2PE', '2petr': '2PE', '2.petr': '2PE',
  '1. johannes': '1JN', '1 johannes': '1JN', '1johannes': '1JN', '1.johannes': '1JN',
  '2. johannes': '2JN', '2 johannes': '2JN', '2johannes': '2JN', '2.johannes': '2JN',
  '3. johannes': '3JN', '3 johannes': '3JN', '3johannes': '3JN', '3.johannes': '3JN',
  'judas': 'JUD',
  'offenbarung': 'REV', 'apokalypse': 'REV'
};

/**
 * Normalisiert einen Buchnamen zu einem Standard-Code
 */
function normalizeBookName(bookName: string): string | null {
  // Normalisiere: Entferne führende/nachfolgende Leerzeichen, konvertiere zu Kleinbuchstaben
  let normalized = bookName.toLowerCase().trim();
  
  // Versuche direktes Mapping
  if (BOOK_MAPPING[normalized]) {
    return BOOK_MAPPING[normalized];
  }
  
  // Fallback 1: Ersetze "1." durch "1. " (mit Leerzeichen) für bessere Erkennung
  // z.B. "1.korinther" -> "1. korinther"
  const normalizedWithSpace = normalized.replace(/^(\d+)\.([a-zäöü])/i, '$1. $2');
  if (normalizedWithSpace !== normalized && BOOK_MAPPING[normalizedWithSpace]) {
    return BOOK_MAPPING[normalizedWithSpace];
  }
  
  // Fallback 2: Erweitere Abkürzungen
  // z.B. "1. petr" -> "1. petrus", "1. tim" -> "1. timotheus"
  const expanded = normalized
    .replace(/\bpetr\b/g, 'petrus')
    .replace(/\btim\b/g, 'timotheus')
    .replace(/\bkor\b/g, 'korinther')
    .replace(/\bthess\b/g, 'thessalonicher');
  if (expanded !== normalized && BOOK_MAPPING[expanded]) {
    return BOOK_MAPPING[expanded];
  }
  
  // Fallback 3: Ersetze "1. " durch "1." (ohne Leerzeichen) und versuche erneut
  const normalizedWithoutSpace = normalized.replace(/^(\d+)\.\s+/i, '$1.');
  if (normalizedWithoutSpace !== normalized && BOOK_MAPPING[normalizedWithoutSpace]) {
    return BOOK_MAPPING[normalizedWithoutSpace];
  }
  
  // Fallback 4: Kombiniere Fallback 2 und 3
  const expandedWithoutSpace = expanded.replace(/^(\d+)\.\s+/i, '$1.');
  if (expandedWithoutSpace !== expanded && BOOK_MAPPING[expandedWithoutSpace]) {
    return BOOK_MAPPING[expandedWithoutSpace];
  }
  
  return null;
}

/**
 * Parst eine Bibelstellen-Referenz
 * Unterstützt Formate wie:
 * - "Psalm 23,3" oder "Ps 23:3"
 * - "1. Mose 1:1"
 * - "Johannes 3,16"
 * - "Psalm 23,1-6" (Versbereiche)
 */
export interface ParsedReference {
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  originalText: string;
}

export function parseBibleReference(text: string): ParsedReference | null {
  // Entferne führende/nachfolgende Leerzeichen
  // Normalisiere Gedankenstriche zu normalen Bindestrichen für einfacheres Parsing
  const trimmed = text.trim().replace(/[–—]/g, '-');
  
  // Pattern für: "Buch Kapitel,Vers" oder "Buch Kapitel:Vers"
  // Unterstützt auch Versbereiche: "Buch Kapitel,Vers-Vers" (mit Bindestrich, Gedankenstrich oder Geviertstrich)
  const pattern = /^(.+?)\s+(\d+)[,:\s]+(\d+)(?:-(\d+))?$/i;
  const match = trimmed.match(pattern);
  
  if (!match) {
    // Fallback: Nur Kapitel (z.B. "Psalm 23")
    const chapterPattern = /^(.+?)\s+(\d+)$/i;
    const chapterMatch = trimmed.match(chapterPattern);
    if (chapterMatch) {
      const book = normalizeBookName(chapterMatch[1]);
      if (book) {
        return {
          book,
          chapter: parseInt(chapterMatch[2], 10),
          verse: 1, // Standard: erster Vers
          originalText: trimmed
        };
      }
    }
    return null;
  }
  
  const bookName = match[1].trim();
  const book = normalizeBookName(bookName);
  
  if (!book) {
    return null;
  }
  
  const chapter = parseInt(match[2], 10);
  const verse = parseInt(match[3], 10);
  const verseEnd = match[4] ? parseInt(match[4], 10) : undefined;
  
  return {
    book,
    chapter,
    verse,
    verseEnd,
    originalText: trimmed
  };
}

/**
 * Normalisiert eine Referenz zu einem Standard-Format für die Datenbank
 */
export function normalizeReference(reference: ParsedReference): string {
  if (reference.verseEnd) {
    return `${reference.book}.${reference.chapter}.${reference.verse}-${reference.verseEnd}`;
  }
  return `${reference.book}.${reference.chapter}.${reference.verse}`;
}

/**
 * Ruft einen Bibelvers aus der Datenbank ab
 */
export async function getBibleVerse(
  reference: string,
  translation: string = 'LUT'
): Promise<{ text: string; reference: string; translation: string } | null> {
  console.log('getBibleVerse called with:', { reference, translation });
  
  // Parse Referenz
  const parsed = parseBibleReference(reference);
  if (!parsed) {
    console.log('Failed to parse reference:', reference);
    return null;
  }
  
  console.log('Parsed reference:', parsed);
  
  // Normalisiere Übersetzung (LUT -> LUT1912, ELB -> ELB1905)
  const translationMap: Record<string, string> = {
    'LUT': 'LUT1912',
    'ELB': 'ELB1905',
    'SCH': 'SCH1951'
  };
  const finalTranslation = translationMap[translation] || translation;
  console.log(`Using translation: ${finalTranslation} (from ${translation})`);
  
  // Prüfe Cache zuerst
  const cacheKey = normalizeReference(parsed);
  const cached = db.prepare(`
    SELECT text, reference, translation
    FROM bible_cache
    WHERE reference = ? AND translation = ? AND expires_at > datetime('now')
  `).get(cacheKey, finalTranslation) as { text: string; reference: string; translation: string } | undefined;
  
  if (cached) {
    return cached;
  }
  
  // Hole Vers aus lokaler Datenbank
  if (parsed.verseEnd) {
    // Versbereich: Hole alle Verse
    const verses = db.prepare(`
      SELECT verse, text
      FROM bible_verses
      WHERE translation = ? AND book = ? AND chapter = ? AND verse >= ? AND verse <= ?
      ORDER BY verse ASC
    `).all(finalTranslation, parsed.book, parsed.chapter, parsed.verse, parsed.verseEnd) as Array<{ verse: number; text: string }>;
    
    if (verses.length > 0) {
      // Lokale Verse gefunden
      const text = verses.map(v => `${v.verse} ${v.text}`).join('\n\n');
      
      // Cache Ergebnis
      const expiresAt = new Date(Date.now() + BIBLE_CACHE_TTL * 1000).toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO bible_cache (reference, translation, text, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(cacheKey, finalTranslation, text, expiresAt);
      
      return {
        text,
        reference: parsed.originalText,
        translation: finalTranslation
      };
    }
    
    // Versbereich nicht lokal gefunden - für API-Übersetzungen nicht unterstützt (zu komplex)
    console.log(`Verse range not found locally for ${finalTranslation}`);
    return null;
  } else {
    // Einzelner Vers
    console.log('Querying single verse:', { translation: finalTranslation, book: parsed.book, chapter: parsed.chapter, verse: parsed.verse });
    const verse = db.prepare(`
      SELECT text
      FROM bible_verses
      WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?
    `).get(finalTranslation, parsed.book, parsed.chapter, parsed.verse) as { text: string } | undefined;
    
    if (verse) {
      // Lokaler Vers gefunden - Cache und zurückgeben
      const expiresAt = new Date(Date.now() + BIBLE_CACHE_TTL * 1000).toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO bible_cache (reference, translation, text, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(cacheKey, finalTranslation, verse.text, expiresAt);
      
      return {
        text: verse.text,
        reference: parsed.originalText,
        translation: finalTranslation
      };
    }
    
    // Lokaler Vers nicht gefunden - versuche API
    console.log(`Verse not found locally for ${finalTranslation}, trying API...`);
    
    // Prüfe, ob es eine API-Übersetzung ist
    // HINWEIS: Nur ELB ist aktuell über die API verfügbar (Elberfelder Translation)
    // Moderne Übersetzungen (LUT 2017, BasisBibel, NGÜ, HFA) sind nicht verfügbar
    let isAPITranslation = false;
    try {
      const { isAPITranslation: checkAPITranslation } = await import('./bibleApi.service');
      isAPITranslation = checkAPITranslation(translation);
    } catch (error) {
      console.warn('Could not check API translation:', error);
    }
    
    // Fallback: Prüfe manuell für ELB
    if (!isAPITranslation) {
      isAPITranslation = translation === 'ELB' || 
        (translation !== finalTranslation && ['LUT', 'ELB'].includes(translation));
    }
    
    if (isAPITranslation) {
      try {
        const { getVerseFromAPI } = await import('./bibleApi.service');
        const apiText = await getVerseFromAPI(parsed.book, parsed.chapter, parsed.verse, translation);
        
        if (apiText) {
          return {
            text: apiText,
            reference: parsed.originalText,
            translation: translation // Verwende Original-Übersetzung, nicht normalisierte
          };
        }
      } catch (error) {
        console.error('Error fetching from API:', error);
      }
    }
    
    // Prüfe, ob Tabelle existiert und ob überhaupt Daten vorhanden sind
    const count = db.prepare(`
      SELECT COUNT(*) as count FROM bible_verses WHERE translation = ?
    `).get(finalTranslation) as { count: number } | undefined;
    console.log(`No verse found. Total verses in ${finalTranslation}:`, count?.count || 0);
    
    // Prüfe, ob Übersetzung überhaupt verfügbar ist
    const availableLocalTranslations = ['LUT1912', 'LUT1545', 'ELB1905', 'SCH1951'];
    const isAvailable = availableLocalTranslations.includes(finalTranslation) || isAPITranslation;
    
    if (!isAvailable) {
      console.log(`Translation ${finalTranslation} (from ${translation}) is not available`);
      // Wirf einen spezifischen Fehler, damit der Controller eine bessere Meldung geben kann
      const availableList = [...availableLocalTranslations];
      if (isAPITranslation) {
        try {
          const { getAPITranslations } = await import('./bibleApi.service');
          availableList.push(...getAPITranslations());
        } catch (error) {
          // Ignoriere Fehler
        }
      }
      throw new Error(`Übersetzung '${translation}' ist nicht verfügbar. Verfügbare Übersetzungen: ${availableList.join(', ')}`);
    }
    
    return null;
  }
}

/**
 * Ruft ein ganzes Kapitel ab
 */
export async function getBibleChapter(
  book: string,
  chapter: number,
  translation: string = 'LUT'
): Promise<Array<{ verse: number; text: string }> | null> {
  const normalizedBook = normalizeBookName(book);
  if (!normalizedBook) {
    console.log('Failed to normalize book name:', book);
    return null;
  }
  
  // Normalisiere Übersetzung (LUT -> LUT1912, ELB -> ELB1905)
  const translationMap: Record<string, string> = {
    'LUT': 'LUT1912',
    'ELB': 'ELB1905',
    'SCH': 'SCH1951'
  };
  const finalTranslation = translationMap[translation] || translation;
  console.log(`Using translation: ${finalTranslation} (from ${translation})`);
  
  const verses = db.prepare(`
    SELECT verse, text
    FROM bible_verses
    WHERE translation = ? AND book = ? AND chapter = ?
    ORDER BY verse ASC
  `).all(finalTranslation, normalizedBook, chapter) as Array<{ verse: number; text: string }>;
  
  console.log(`Found ${verses.length} verses for ${normalizedBook} ${chapter} in ${finalTranslation}`);
  
  // Wenn lokal nicht gefunden und API-Übersetzung, versuche API (nur für einzelne Verse, nicht für ganze Kapitel)
  if (verses.length === 0 && translation !== finalTranslation) {
    console.log(`Chapter not found locally for ${translation}, API chapter lookup not implemented`);
    // Kapitel-Lookup über API ist komplexer und wird hier nicht implementiert
    // (würde viele API-Calls erfordern)
  }
  
  return verses.length > 0 ? verses : null;
}

