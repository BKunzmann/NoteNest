/**
 * Bible API Service
 *
 * Integration von API.Bible (https://rest.api.bible) zusätzlich zu lokalen Bibeln.
 * Unterstützt dynamischen Übersetzungskatalog mit Sprachfilter und User-Auswahl.
 */

import axios, { AxiosRequestConfig } from 'axios';
import db from '../config/database';
import { BIBLE_CACHE_TTL } from '../config/constants';
import { trackBibleApiCall } from '../middleware/metrics.middleware';

const rawApiUrl = process.env.BIBLE_API_URL || 'https://rest.api.bible';
const BIBLE_API_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/v1`;
const BIBLE_API_KEY = process.env.BIBLE_API_KEY || '';
const BIBLE_API_ENABLED = process.env.BIBLE_API_ENABLED !== 'false' && Boolean(BIBLE_API_KEY);
const BIBLE_SUPERSEARCH_URL = process.env.BIBLE_SUPERSEARCH_URL || 'https://api.biblesupersearch.com/api';
const BIBLE_SUPERSEARCH_ENABLED = process.env.BIBLE_SUPERSEARCH_ENABLED === 'true';

/** Katalog-Cache TTL (1 Stunde) */
const CATALOG_CACHE_TTL_MS = 60 * 60 * 1000;

export interface ApiBibleTranslation {
  id: string;
  abbreviation: string;
  name: string;
  nameLocal?: string;
  description?: string;
  language: string;
  languageName: string;
  source: 'api';
}

interface CatalogCacheEntry {
  fetchedAt: number;
  language: string | null;
  bibles: ApiBibleTranslation[];
}

let catalogCache: CatalogCacheEntry | null = null;
let fullCatalogCache: CatalogCacheEntry | null = null;

/**
 * Bekannte Kurzaliases → API.Bible Bible-IDs (Rückwärtskompatibilität)
 */
const LEGACY_ALIAS_MAP: Record<string, string> = {
  ELB: 'f492a38d0e52db0f-01', // Elberfelder (bibelkommentare.de)
};

/**
 * SuperSearch (Public Domain Fallback)
 */
const SUPERSEARCH_TRANSLATION_MAP: Record<string, string> = {
  LUT1912: 'luther_1912',
  LUT1545: 'luther_1545',
  ELB1905: 'elberfelder_1905',
  SCH1951: 'schlachter_1951'
};

function isApiBibleConfigured(): boolean {
  return BIBLE_API_ENABLED && Boolean(BIBLE_API_KEY);
}

function buildApiHeaders(): Record<string, string> {
  if (BIBLE_API_URL.includes('api.scripture.api.bible') || BIBLE_API_URL.includes('rest.api.bible')) {
    return { 'api-key': BIBLE_API_KEY };
  }
  return { Authorization: `Bearer ${BIBLE_API_KEY}` };
}

function stripHtml(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeBibleId(value: string): boolean {
  // API.Bible IDs: z.B. f492a38d0e52db0f-01
  return /^[a-f0-9]{8,}-[0-9a-z]+$/i.test(value);
}

function mapApiBible(raw: any): ApiBibleTranslation | null {
  if (!raw?.id) return null;
  const languageId = String(raw.language?.id || raw.languageId || '').toLowerCase();
  const languageName = String(raw.language?.name || raw.languageName || languageId || 'unknown');
  return {
    id: String(raw.id),
    abbreviation: String(raw.abbreviationLocal || raw.abbreviation || raw.id).trim(),
    name: String(raw.nameLocal || raw.name || raw.abbreviation || raw.id).trim(),
    nameLocal: raw.nameLocal ? String(raw.nameLocal) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    language: languageId || 'und',
    languageName,
    source: 'api'
  };
}

/**
 * Lädt den Übersetzungskatalog von API.Bible (optional nach Sprache gefiltert)
 */
export async function fetchApiBibleCatalog(language?: string): Promise<ApiBibleTranslation[]> {
  if (!isApiBibleConfigured()) {
    return [];
  }

  const langKey = language?.trim().toLowerCase() || null;
  const now = Date.now();

  if (langKey && catalogCache && catalogCache.language === langKey && now - catalogCache.fetchedAt < CATALOG_CACHE_TTL_MS) {
    return catalogCache.bibles;
  }
  if (!langKey && fullCatalogCache && now - fullCatalogCache.fetchedAt < CATALOG_CACHE_TTL_MS) {
    return fullCatalogCache.bibles;
  }

  try {
    const params: Record<string, string> = {};
    if (langKey) {
      params.language = langKey;
    }

    const response = await axios.get(`${BIBLE_API_URL}/bibles`, {
      headers: buildApiHeaders(),
      params,
      timeout: 15000
    } as AxiosRequestConfig);

    const rawList = Array.isArray(response.data?.data) ? response.data.data : [];
    let bibles = rawList
      .map(mapApiBible)
      .filter((b: ApiBibleTranslation | null): b is ApiBibleTranslation => Boolean(b));

    // Client-seitiger Sprachfilter als Fallback, falls API den Parameter ignoriert
    if (langKey) {
      bibles = bibles.filter((b) => {
        const id = b.language.toLowerCase();
        const name = b.languageName.toLowerCase();
        if (langKey === 'deu' || langKey === 'de') {
          return id === 'deu' || id === 'de' || name.includes('german') || name.includes('deutsch');
        }
        if (langKey === 'eng' || langKey === 'en') {
          return id === 'eng' || id === 'en' || name.includes('english');
        }
        return id === langKey || id.startsWith(langKey);
      });
    }

    bibles.sort((a, b) => a.name.localeCompare(b.name, 'de'));

    const entry: CatalogCacheEntry = { fetchedAt: now, language: langKey, bibles };
    if (langKey) {
      catalogCache = entry;
    } else {
      fullCatalogCache = entry;
    }

    console.log(`📚 API.Bible catalog loaded: ${bibles.length} bibles${langKey ? ` (language=${langKey})` : ''}`);
    return bibles;
  } catch (error: any) {
    console.error('❌ Failed to fetch API.Bible catalog:', error.response?.status || error.message);
    return catalogCache?.bibles || fullCatalogCache?.bibles || [];
  }
}

/**
 * Löst einen Übersetzungs-Code (Alias, Abbreviation oder Bible-ID) zu einer API-Bible-ID auf
 */
export async function resolveApiBibleId(translation: string): Promise<string | null> {
  if (!translation || !isApiBibleConfigured()) {
    return null;
  }

  if (LEGACY_ALIAS_MAP[translation]) {
    return LEGACY_ALIAS_MAP[translation];
  }

  if (looksLikeBibleId(translation)) {
    return translation;
  }

  // Suche in gecachtem/geladenem Katalog (alle Sprachen)
  const catalog = await fetchApiBibleCatalog();
  const upper = translation.toUpperCase();
  const byAbbr = catalog.find(
    (b) => b.abbreviation.toUpperCase() === upper || b.id === translation
  );
  if (byAbbr) {
    return byAbbr.id;
  }

  // Deutsche Übersetzungen gezielt nachladen und nochmals prüfen
  const deCatalog = await fetchApiBibleCatalog('deu');
  const deMatch = deCatalog.find(
    (b) => b.abbreviation.toUpperCase() === upper || b.id === translation
  );
  return deMatch?.id || null;
}

/**
 * Gibt verfügbare Sprachen aus dem Katalog zurück
 */
export async function getApiBibleLanguages(): Promise<Array<{ id: string; name: string; count: number }>> {
  const catalog = await fetchApiBibleCatalog();
  const map = new Map<string, { id: string; name: string; count: number }>();

  for (const bible of catalog) {
    const key = bible.language || 'und';
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { id: key, name: bible.languageName || key, count: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/**
 * Rich-Übersetzungen für die UI (optional gefiltert)
 */
export async function getAPITranslationDetails(language?: string): Promise<ApiBibleTranslation[]> {
  return fetchApiBibleCatalog(language);
}

/**
 * Kurzcodes / IDs für Abwärtskompatibilität von getAPITranslations()
 */
export function getAPITranslations(): string[] {
  // Synchroner Snapshot aus Cache + Legacy-Aliases
  const ids = new Set<string>(Object.keys(LEGACY_ALIAS_MAP));
  const cached = catalogCache?.bibles || fullCatalogCache?.bibles || [];
  for (const b of cached) {
    ids.add(b.id);
    if (b.abbreviation) ids.add(b.abbreviation);
  }
  return Array.from(ids);
}

export function isAPITranslation(translation: string): boolean {
  if (!translation) return false;
  if (translation in LEGACY_ALIAS_MAP) return true;
  if (looksLikeBibleId(translation)) return true;
  if (translation in SUPERSEARCH_TRANSLATION_MAP) return true;

  const cached = catalogCache?.bibles || fullCatalogCache?.bibles || [];
  const upper = translation.toUpperCase();
  return cached.some(
    (b) => b.id === translation || b.abbreviation.toUpperCase() === upper
  );
}

function convertBookToAPIBibleFormat(bookCode: string): string {
  return bookCode;
}

function convertReferenceToAPIBibleFormat(book: string, chapter: number, verse: number): string {
  return `${convertBookToAPIBibleFormat(book)}.${chapter}.${verse}`;
}

function extractTextFromApiResponse(data: any): string | null {
  const content =
    data?.data?.content ||
    data?.content ||
    data?.data?.text ||
    data?.text ||
    null;

  if (!content) return null;
  return typeof content === 'string' ? stripHtml(content) : stripHtml(JSON.stringify(content));
}

/**
 * Einzelner Vers von API.Bible
 */
async function getVerseFromAPIBible(
  book: string,
  chapter: number,
  verse: number,
  translation: string
): Promise<string | null> {
  if (!isApiBibleConfigured()) {
    console.log('⚠️ API.Bible not configured (BIBLE_API_KEY / BIBLE_API_ENABLED)');
    return null;
  }

  const bibleId = await resolveApiBibleId(translation);
  if (!bibleId) {
    console.log(`⚠️ Translation ${translation} not available via API.Bible`);
    return null;
  }

  try {
    const reference = convertReferenceToAPIBibleFormat(book, chapter, verse);
    const url = `${BIBLE_API_URL}/bibles/${bibleId}/verses/${reference}`;

    console.log(`📡 Fetching from API.Bible: ${url}`);

    const response = await axios.get(url, {
      headers: buildApiHeaders(),
      params: {
        'content-type': 'text',
        'include-notes': 'false',
        'include-titles': 'false',
        'include-chapter-numbers': 'false',
        'include-verse-numbers': 'false'
      },
      timeout: 10000
    });

    const text = extractTextFromApiResponse(response.data);
    if (!text) {
      console.log('⚠️ API.Bible returned empty content');
      return null;
    }

    trackBibleApiCall('api.bible', translation, 'success');
    return text;
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ API.Bible error: ${error.response.status} ${error.response.statusText}`);
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('   ⚠️ Authentication failed - check BIBLE_API_KEY');
      }
    } else {
      console.error(`❌ API.Bible request error: ${error.message}`);
    }
    trackBibleApiCall('api.bible', translation, 'error');
    return null;
  }
}

/**
 * Passage (Versbereich oder Kapitel) von API.Bible
 */
export async function getPassageFromAPIBible(
  book: string,
  chapter: number,
  translation: string,
  verseStart?: number,
  verseEnd?: number
): Promise<string | null> {
  if (!isApiBibleConfigured()) {
    return null;
  }

  const bibleId = await resolveApiBibleId(translation);
  if (!bibleId) {
    return null;
  }

  try {
    const apiBook = convertBookToAPIBibleFormat(book);
    let passageId: string;
    if (verseStart != null && verseEnd != null) {
      passageId = `${apiBook}.${chapter}.${verseStart}-${apiBook}.${chapter}.${verseEnd}`;
    } else if (verseStart != null) {
      passageId = `${apiBook}.${chapter}.${verseStart}`;
    } else {
      passageId = `${apiBook}.${chapter}`;
    }

    const url = `${BIBLE_API_URL}/bibles/${bibleId}/passages/${passageId}`;
    console.log(`📡 Fetching passage from API.Bible: ${url}`);

    const response = await axios.get(url, {
      headers: buildApiHeaders(),
      params: {
        'content-type': 'text',
        'include-notes': 'false',
        'include-titles': 'false',
        'include-chapter-numbers': 'false',
        'include-verse-numbers': 'true'
      },
      timeout: 15000
    });

    const text = extractTextFromApiResponse(response.data);
    if (!text) return null;

    trackBibleApiCall('api.bible', translation, 'success');
    return text;
  } catch (error: any) {
    console.error(`❌ API.Bible passage error: ${error.response?.status || error.message}`);
    trackBibleApiCall('api.bible', translation, 'error');
    return null;
  }
}

/**
 * Kapitel-Verse von API.Bible (über Passage-Endpoint)
 */
export async function getChapterFromAPI(
  book: string,
  chapter: number,
  translation: string
): Promise<Array<{ verse: number; text: string }> | null> {
  const text = await getPassageFromAPIBible(book, chapter, translation);
  if (!text) return null;

  // Versuche Verse anhand führender Nummern zu splitten
  const verses: Array<{ verse: number; text: string }> = [];
  const parts = text.split(/(?=\b\d+\b)/).map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^(\d+)\s*(.*)$/s);
    if (match) {
      verses.push({ verse: parseInt(match[1], 10), text: match[2].trim() });
    }
  }

  if (verses.length === 0) {
    return [{ verse: 1, text }];
  }

  return verses;
}

async function getVerseFromSuperSearch(
  book: string,
  chapter: number,
  verse: number,
  translation: string
): Promise<string | null> {
  if (!BIBLE_SUPERSEARCH_ENABLED) {
    return null;
  }

  const apiTranslation = SUPERSEARCH_TRANSLATION_MAP[translation];
  if (!apiTranslation) {
    return null;
  }

  try {
    const url = `${BIBLE_SUPERSEARCH_URL}/bible/${apiTranslation}/${book.toLowerCase()}/${chapter}/${verse}`;
    const response = await axios.get(url, { timeout: 10000 });
    const text = response.data?.text || response.data?.content || null;
    if (!text) return null;

    const textResult = typeof text === 'string' ? text.trim() : JSON.stringify(text);
    trackBibleApiCall('bible-supersearch', translation, 'success');
    return textResult;
  } catch (error: any) {
    console.error('Bible SuperSearch error:', error.response?.status || error.message);
    trackBibleApiCall('bible-supersearch', translation, 'error');
    return null;
  }
}

function cacheAPIResult(reference: string, translation: string, text: string): void {
  const expiresAt = new Date(Date.now() + BIBLE_CACHE_TTL * 1000).toISOString();
  try {
    db.prepare(`
      INSERT OR REPLACE INTO bible_cache (reference, translation, text, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(reference, translation, text, expiresAt);
  } catch (error) {
    console.error('Error caching API result:', error);
  }
}

/**
 * Vers von externen APIs (API.Bible → SuperSearch)
 */
export async function getVerseFromAPI(
  book: string,
  chapter: number,
  verse: number,
  translation: string
): Promise<string | null> {
  const reference = `${book}.${chapter}.${verse}`;

  const cached = db.prepare(`
    SELECT text
    FROM bible_cache
    WHERE reference = ? AND translation = ? AND expires_at > datetime('now')
  `).get(reference, translation) as { text: string } | undefined;

  if (cached) {
    return cached.text;
  }

  const apiBibleText = await getVerseFromAPIBible(book, chapter, verse, translation);
  if (apiBibleText) {
    cacheAPIResult(reference, translation, apiBibleText);
    return apiBibleText;
  }

  const superSearchText = await getVerseFromSuperSearch(book, chapter, verse, translation);
  if (superSearchText) {
    cacheAPIResult(reference, translation, superSearchText);
    return superSearchText;
  }

  return null;
}

export function isApiBibleEnabled(): boolean {
  return isApiBibleConfigured();
}
