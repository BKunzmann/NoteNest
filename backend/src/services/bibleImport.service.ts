/**
 * Bible Import Service
 *
 * Importiert lokale Bibel-JSON-Dateien in die Tabelle bible_verses,
 * wenn dort noch keine Verse vorhanden sind.
 */

import fs from 'fs';
import path from 'path';
import db from '../config/database';

interface BibleVerse {
  book_name: string;
  book: number | string;
  chapter: number | string;
  verse: number | string;
  text: string;
}

export interface BibleImportResult {
  imported: boolean;
  totalImported: number;
  sourcePath: string | null;
  translations: Array<{ translation: string; count: number }>;
  reason?: 'already-imported' | 'path-not-found' | 'no-supported-json-files';
}

/**
 * Mapping von Dateinamen zu Übersetzungs-Codes
 */
const TRANSLATION_MAP: Record<string, string> = {
  'luther_1912.json': 'LUT1912',
  'luther_1545.json': 'LUT1545',
  'elberfelder_1905.json': 'ELB1905',
  'schlachter_1951.json': 'SCH1951'
};

/**
 * Mapping von Buchnummern zu Standard-Codes
 */
const BOOK_NUMBER_MAP: Record<number, string> = {
  1: 'GEN', 2: 'EXO', 3: 'LEV', 4: 'NUM', 5: 'DEU',
  6: 'JOS', 7: 'JDG', 8: 'RUT', 9: '1SA', 10: '2SA',
  11: '1KI', 12: '2KI', 13: '1CH', 14: '2CH', 15: 'EZR',
  16: 'NEH', 17: 'EST', 18: 'JOB', 19: 'PSA', 20: 'PRO',
  21: 'ECC', 22: 'SNG', 23: 'ISA', 24: 'JER', 25: 'LAM',
  26: 'EZK', 27: 'DAN', 28: 'HOS', 29: 'JOL', 30: 'AMO',
  31: 'OBA', 32: 'JON', 33: 'MIC', 34: 'NAM', 35: 'HAB',
  36: 'ZEP', 37: 'HAG', 38: 'ZEC', 39: 'MAL',
  40: 'MAT', 41: 'MRK', 42: 'LUK', 43: 'JHN', 44: 'ACT',
  45: 'ROM', 46: '1CO', 47: '2CO', 48: 'GAL', 49: 'EPH',
  50: 'PHP', 51: 'COL', 52: '1TH', 53: '2TH', 54: '1TI',
  55: '2TI', 56: 'TIT', 57: 'PHM', 58: 'HEB', 59: 'JAS',
  60: '1PE', 61: '2PE', 62: '1JN', 63: '2JN', 64: '3JN',
  65: 'JUD', 66: 'REV'
};

let importInFlight: Promise<BibleImportResult> | null = null;
let checkedExistingData = false;
let hasExistingData = false;

function getBibleVerseCount(): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM bible_verses').get() as { count: number } | undefined;
  return row?.count ?? 0;
}

function getCandidateBiblePaths(): string[] {
  const configuredPath = process.env.BIBLE_LOCAL_PATH?.trim();
  const candidates = [
    configuredPath || '',
    '/data/bibles',
    '/app/data/bibles',
    path.resolve(__dirname, '../../../data/bibles'),
    path.resolve(process.cwd(), 'data/bibles'),
    path.resolve(process.cwd(), '../data/bibles')
  ];

  const normalized = candidates
    .filter(Boolean)
    .map((candidate) => path.resolve(candidate).replace(/\\/g, '/'));

  return Array.from(new Set(normalized));
}

function resolveBiblePath(): string | null {
  for (const candidate of getCandidateBiblePaths()) {
    try {
      const stats = fs.statSync(candidate);
      if (stats.isDirectory()) {
        return candidate;
      }
    } catch {
      // Kandidat existiert nicht; weiter mit dem nächsten
    }
  }
  return null;
}

function parseVersesFromFile(filePath: string): BibleVerse[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);

  if (Array.isArray(parsed)) {
    return parsed as BibleVerse[];
  }
  if (parsed?.verses && Array.isArray(parsed.verses)) {
    return parsed.verses as BibleVerse[];
  }
  if (parsed?.data && Array.isArray(parsed.data)) {
    return parsed.data as BibleVerse[];
  }

  throw new Error(`Ungültiges JSON-Format in ${filePath}`);
}

function importBibleFile(filePath: string, translation: string): number {
  const verses = parseVersesFromFile(filePath);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO bible_verses (translation, book, chapter, verse, text)
    VALUES (?, ?, ?, ?, ?)
  `);

  const importTransaction = db.transaction((rows: BibleVerse[]) => {
    let imported = 0;
    for (const row of rows) {
      const bookNumber = Number(row.book);
      const chapter = Number(row.chapter);
      const verse = Number(row.verse);
      const text = typeof row.text === 'string' ? row.text : '';

      const bookCode = BOOK_NUMBER_MAP[bookNumber];
      if (!bookCode || !Number.isInteger(chapter) || !Number.isInteger(verse) || !text) {
        continue;
      }

      insert.run(translation, bookCode, chapter, verse, text);
      imported += 1;
    }
    return imported;
  });

  return importTransaction(verses);
}

function importFromLocalJsonFiles(biblePath: string): BibleImportResult {
  const files = fs.readdirSync(biblePath);
  const supportedFiles = files.filter((fileName) => TRANSLATION_MAP[fileName]);

  if (supportedFiles.length === 0) {
    return {
      imported: false,
      totalImported: 0,
      sourcePath: biblePath,
      translations: [],
      reason: 'no-supported-json-files'
    };
  }

  const perTranslation: Array<{ translation: string; count: number }> = [];
  let totalImported = 0;

  for (const fileName of supportedFiles) {
    const translation = TRANSLATION_MAP[fileName];
    const fullPath = path.join(biblePath, fileName);
    const importedCount = importBibleFile(fullPath, translation);

    perTranslation.push({ translation, count: importedCount });
    totalImported += importedCount;
  }

  return {
    imported: totalImported > 0,
    totalImported,
    sourcePath: biblePath,
    translations: perTranslation
  };
}

/**
 * Stellt sicher, dass lokale Bibeldaten importiert sind.
 * Führt den Import nur aus, wenn die Tabelle bible_verses noch leer ist.
 */
export async function ensureBibleDataImported(): Promise<BibleImportResult> {
  if (!checkedExistingData || !hasExistingData) {
    const currentCount = getBibleVerseCount();
    checkedExistingData = true;
    hasExistingData = currentCount > 0;
    if (hasExistingData) {
      return {
        imported: false,
        totalImported: 0,
        sourcePath: null,
        translations: [],
        reason: 'already-imported'
      };
    }
  } else {
    return {
      imported: false,
      totalImported: 0,
      sourcePath: null,
      translations: [],
      reason: 'already-imported'
    };
  }

  if (importInFlight) {
    return importInFlight;
  }

  importInFlight = Promise.resolve().then<BibleImportResult>(() => {
    // Race-Condition vermeiden: direkt vor Import erneut prüfen.
    const currentCount = getBibleVerseCount();
    if (currentCount > 0) {
      hasExistingData = true;
      return {
        imported: false,
        totalImported: 0,
        sourcePath: null,
        translations: [],
        reason: 'already-imported'
      };
    }

    const biblePath = resolveBiblePath();
    if (!biblePath) {
      return {
        imported: false,
        totalImported: 0,
        sourcePath: null,
        translations: [],
        reason: 'path-not-found'
      };
    }

    const result = importFromLocalJsonFiles(biblePath);

    if (result.imported) {
      hasExistingData = true;
      const stats = result.translations.map((item) => `${item.translation}:${item.count}`).join(', ');
      console.log(`✅ Bible auto-import completed (${result.totalImported} verses) from ${biblePath}`);
      if (stats) {
        console.log(`   ${stats}`);
      }
    } else {
      console.log(`ℹ️ Bible auto-import skipped (${result.reason ?? 'no-data'}) from ${biblePath}`);
    }

    return result;
  }).finally(() => {
    importInFlight = null;
  });

  return importInFlight as Promise<BibleImportResult>;
}

