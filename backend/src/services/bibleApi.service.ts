/**
 * Bible API Service
 * 
 * Verantwortlich für:
 * - API.Bible (YouVersion) Integration
 * - Bible SuperSearch API Integration (Fallback)
 * - API-Ergebnisse cachen
 */

import axios from 'axios';
import db from '../config/database';
import { BIBLE_CACHE_TTL } from '../config/constants';
import { trackBibleApiCall } from '../middleware/metrics.middleware';

// API.Bible (YouVersion) - Standard URL ist https://api.scripture.api.bible/v1
// Alternative: https://rest.api.bible (wie in .env konfiguriert)
// Wenn URL ohne /v1 endet, füge es hinzu
const rawApiUrl = process.env.BIBLE_API_URL || 'https://api.scripture.api.bible/v1';
const BIBLE_API_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;
const BIBLE_API_KEY = process.env.BIBLE_API_KEY || '';
const BIBLE_SUPERSEARCH_URL = process.env.BIBLE_SUPERSEARCH_URL || 'https://api.biblesupersearch.com/api';
const BIBLE_SUPERSEARCH_ENABLED = process.env.BIBLE_SUPERSEARCH_ENABLED === 'true';

/**
 * API.Bible Übersetzungs-Mapping
 * Mapping von NoteNest-Codes zu API.Bible Bible IDs
 * 
 * HINWEIS: Die API https://rest.api.bible hat nur ältere deutsche Übersetzungen.
 * Moderne Übersetzungen (Luther 2017, Elberfelder 2006, BasisBibel, NGÜ, HFA) sind nicht verfügbar.
 * 
 * Verfügbare Übersetzungen:
 * - ELBBK: Elberfelder Translation (Version of bibelkommentare.de) - linguistisch überarbeitet
 * - deuL1912: German Luther Bible 1912 with Strong's numbers (bereits lokal als LUT1912 verfügbar)
 * - deuelo: German Unrevised Elberfelder Bible (bereits lokal als ELB1905 verfügbar)
 * - deutkw: Kautzsch und Weizsäcker 1906
 */
const API_BIBLE_TRANSLATION_MAP: Record<string, string> = {
  // Elberfelder Translation (Version of bibelkommentare.de) - linguistisch überarbeitete Version
  'ELB': 'f492a38d0e52db0f-01',  // Elberfelder Translation (Version of bibelkommentare.de)
  
  // Weitere verfügbare Übersetzungen (optional, bereits lokal verfügbar):
  // 'LUT1912': '926aa5efbc5e04e2-01',  // German Luther Bible 1912 (bereits lokal als LUT1912 verfügbar)
  // 'ELB1905': '95410db44ef800c1-01',  // German Unrevised Elberfelder Bible (bereits lokal als ELB1905 verfügbar)
  // 'SCH': '542b32484b6e38c2-01',      // Kautzsch und Weizsäcker 1906 (historische Übersetzung)
  
  // HINWEIS: Die folgenden modernen Übersetzungen sind NICHT über diese API verfügbar:
  // - Lutherbibel 2017 (LUT)
  // - Elberfelder 2006 (ELB - verwenden wir stattdessen ELBBK)
  // - BasisBibel
  // - Neue Genfer Übersetzung (NGÜ)
  // - Hoffnung für Alle (HFA)
  // - Neues Leben (NL)
  //
  // Für diese Übersetzungen gibt es folgende Optionen:
  // 1. Kontakt mit API.Bible Support: support@api.bible (möglicherweise benötigen sie spezielle Lizenzen)
  // 2. Alternative APIs prüfen (z.B. Bible Gateway API, andere Bibel-APIs)
  // 3. Lokale Importe (falls lizenzrechtlich möglich)
};

/**
 * Bible SuperSearch Übersetzungs-Mapping
 */
const SUPERSEARCH_TRANSLATION_MAP: Record<string, string> = {
  'LUT1912': 'luther_1912',
  'LUT1545': 'luther_1545',
  'ELB1905': 'elberfelder_1905',
  'SCH1951': 'schlachter_1951'
};

/**
 * Konvertiert einen Buchcode (z.B. 'PSA') zu API.Bible-Format
 */
function convertBookToAPIBibleFormat(bookCode: string): string {
  // API.Bible verwendet standardisierte Buchcodes
  // Die meisten sind identisch, aber einige müssen angepasst werden
  const mapping: Record<string, string> = {
    'PSA': 'PSA',
    'GEN': 'GEN',
    'EXO': 'EXO',
    // ... weitere Mappings bei Bedarf
  };
  
  return mapping[bookCode] || bookCode;
}

/**
 * Konvertiert eine Referenz zu API.Bible-Format
 * z.B. { book: 'PSA', chapter: 23, verse: 3 } -> 'PSA.23.3'
 */
function convertReferenceToAPIBibleFormat(book: string, chapter: number, verse: number): string {
  const apiBook = convertBookToAPIBibleFormat(book);
  return `${apiBook}.${chapter}.${verse}`;
}

/**
 * Ruft einen Bibelvers von API.Bible ab
 */
async function getVerseFromAPIBible(
  book: string,
  chapter: number,
  verse: number,
  translation: string
): Promise<string | null> {
  if (!BIBLE_API_KEY) {
    console.log('⚠️ BIBLE_API_KEY not configured, skipping API.Bible');
    console.log('   To enable API.Bible, set BIBLE_API_KEY in your .env file');
    return null;
  }

  const bibleId = API_BIBLE_TRANSLATION_MAP[translation];
  if (!bibleId) {
    console.log(`⚠️ Translation ${translation} not available via API.Bible`);
    console.log(`   Available API translations: ${Object.keys(API_BIBLE_TRANSLATION_MAP).join(', ')}`);
    return null;
  }

  try {
    const reference = convertReferenceToAPIBibleFormat(book, chapter, verse);
    const url = `${BIBLE_API_URL}/bibles/${bibleId}/verses/${reference}`;
    
    console.log(`📡 Fetching from API.Bible: ${url}`);
    console.log(`   Translation: ${translation} (Bible ID: ${bibleId})`);
    
    // API.Bible verwendet 'api-key' Header, alternative APIs könnten 'Authorization: Bearer' verwenden
    const headers: Record<string, string> = {};
    if (BIBLE_API_URL.includes('api.scripture.api.bible') || BIBLE_API_URL.includes('rest.api.bible')) {
      headers['api-key'] = BIBLE_API_KEY;
    } else {
      headers['Authorization'] = `Bearer ${BIBLE_API_KEY}`;
    }
    
    const response = await axios.get(url, {
      headers,
      timeout: 10000 // 10 Sekunden Timeout
    });

    console.log(`✅ API.Bible response status: ${response.status}`);
    console.log(`   Response data keys: ${Object.keys(response.data || {}).join(', ')}`);

    // API.Bible Response-Format kann variieren, anpassen je nach tatsächlicher API
    const content = response.data?.data?.content || response.data?.content || response.data?.data?.text || null;
    
    if (!content) {
      console.log('⚠️ API.Bible returned empty content');
      console.log(`   Response structure: ${JSON.stringify(response.data).substring(0, 200)}...`);
      return null;
    }

    // Entferne HTML-Tags, falls vorhanden
    const text = typeof content === 'string' 
      ? content.replace(/<[^>]*>/g, '').trim()
      : JSON.stringify(content);

    console.log(`✅ Successfully fetched verse from API.Bible (length: ${text.length} chars)`);
    
    // Metrics-Tracking
    trackBibleApiCall('api.bible', translation, 'success');
    
    return text;
  } catch (error: any) {
    if (error.response) {
      // API hat geantwortet, aber mit Fehler
      console.error(`❌ API.Bible error: ${error.response.status} ${error.response.statusText}`);
      console.error(`   URL: ${error.config?.url}`);
      console.error(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('   ⚠️ Authentication failed - check your BIBLE_API_KEY');
      } else if (error.response.status === 404) {
        console.error('   ⚠️ Verse not found - check Bible ID and reference format');
      } else if (error.response.status === 429) {
        console.error('   ⚠️ Rate limit exceeded - too many requests');
      }
    } else if (error.request) {
      // Request wurde gesendet, aber keine Antwort erhalten
      console.error(`❌ API.Bible network error: No response received`);
      console.error(`   URL: ${error.config?.url}`);
      console.error(`   Error: ${error.message}`);
      console.error('   ⚠️ Check your internet connection and BIBLE_API_URL');
    } else {
      // Fehler beim Setup des Requests
      console.error(`❌ API.Bible request setup error: ${error.message}`);
    }
    
    // Metrics-Tracking (Fehler)
    trackBibleApiCall('api.bible', translation, 'error');
    
    return null;
  }
}

/**
 * Ruft einen Bibelvers von Bible SuperSearch ab (Fallback)
 */
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
    console.log(`Translation ${translation} not available via Bible SuperSearch`);
    return null;
  }

  try {
    // Konvertiere Buchcode zu SuperSearch-Format (klein geschrieben)
    const bookLower = book.toLowerCase();
    
    const url = `${BIBLE_SUPERSEARCH_URL}/bible/${apiTranslation}/${bookLower}/${chapter}/${verse}`;
    
    console.log(`Fetching from Bible SuperSearch: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 10000
    });

    const text = response.data?.text || response.data?.content || null;
    
    if (!text) {
      console.log('Bible SuperSearch returned empty content');
      return null;
    }

    const textResult = typeof text === 'string' ? text.trim() : JSON.stringify(text);
    
    // Metrics-Tracking
    trackBibleApiCall('bible-supersearch', translation, 'success');
    
    return textResult;
  } catch (error: any) {
    console.error('Bible SuperSearch error:', error.response?.status, error.response?.statusText || error.message);
    
    // Metrics-Tracking (Fehler)
    trackBibleApiCall('bible-supersearch', translation, 'error');
    
    return null;
  }
}

/**
 * Speichert ein API-Ergebnis im Cache
 */
function cacheAPIResult(
  reference: string,
  translation: string,
  text: string
): void {
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
 * Ruft einen Bibelvers von externen APIs ab (mit Fallback-Kette)
 * 
 * @param book - Buchcode (z.B. 'PSA')
 * @param chapter - Kapitelnummer
 * @param verse - Versnummer
 * @param translation - Übersetzungs-Code (z.B. 'LUT', 'ELB')
 * @returns Vers-Text oder null, wenn nicht gefunden
 */
export async function getVerseFromAPI(
  book: string,
  chapter: number,
  verse: number,
  translation: string
): Promise<string | null> {
  const reference = `${book}.${chapter}.${verse}`;
  
  // 1. Prüfe Cache zuerst
  const cached = db.prepare(`
    SELECT text
    FROM bible_cache
    WHERE reference = ? AND translation = ? AND expires_at > datetime('now')
  `).get(reference, translation) as { text: string } | undefined;
  
  if (cached) {
    console.log('Using cached API result');
    return cached.text;
  }

  // 2. Versuche API.Bible (moderne Übersetzungen)
  const apiBibleText = await getVerseFromAPIBible(book, chapter, verse, translation);
  if (apiBibleText) {
    cacheAPIResult(reference, translation, apiBibleText);
    return apiBibleText;
  }

  // 3. Fallback: Bible SuperSearch (Public Domain)
  const superSearchText = await getVerseFromSuperSearch(book, chapter, verse, translation);
  if (superSearchText) {
    cacheAPIResult(reference, translation, superSearchText);
    return superSearchText;
  }

  return null;
}

/**
 * Prüft, ob eine Übersetzung über API verfügbar ist
 */
export function isAPITranslation(translation: string): boolean {
  return translation in API_BIBLE_TRANSLATION_MAP || translation in SUPERSEARCH_TRANSLATION_MAP;
}

/**
 * Gibt alle verfügbaren API-Übersetzungen zurück
 */
export function getAPITranslations(): string[] {
  return Object.keys(API_BIBLE_TRANSLATION_MAP);
}

