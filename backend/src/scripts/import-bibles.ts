/**
 * Import Bible Script
 * 
 * Importiert Bibel-JSON-Dateien in die SQLite-Datenbank
 */

import * as fs from 'fs';
import * as path from 'path';
import db from '../config/database';
import { initializeDatabase } from '../config/database';

interface BibleVerse {
  book_name: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
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
 * Standard-Buchnummern (1-66)
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

function getBiblePath(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.BIBLE_LOCAL_PATH || '/app/data/bibles';
  }
  // Development: Relativer Pfad
  return process.env.BIBLE_LOCAL_PATH || path.join(__dirname, '../../../data/bibles');
}

async function importBibleFile(filePath: string, translation: string): Promise<number> {
  console.log(`Importing ${filePath} as ${translation}...`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let parsed: any;
  
  try {
    parsed = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Failed to parse JSON file ${filePath}:`, error);
    throw error;
  }
  
  // Handle both array and object with array property
  let verses: BibleVerse[];
  if (Array.isArray(parsed)) {
    verses = parsed;
  } else if (parsed.verses && Array.isArray(parsed.verses)) {
    verses = parsed.verses;
  } else if (parsed.data && Array.isArray(parsed.data)) {
    verses = parsed.data;
  } else {
    throw new Error(`Invalid JSON structure in ${filePath}. Expected array or object with 'verses' or 'data' property.`);
  }
  
  console.log(`Found ${verses.length} verses`);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO bible_verses (translation, book, chapter, verse, text)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((verses: BibleVerse[]) => {
    let count = 0;
    for (const verse of verses) {
      const bookCode = BOOK_NUMBER_MAP[verse.book];
      if (!bookCode) {
        console.warn(`Unknown book number: ${verse.book} (${verse.book_name})`);
        continue;
      }
      
      insert.run(
        translation,
        bookCode,
        verse.chapter,
        verse.verse,
        verse.text
      );
      count++;
    }
    return count;
  });
  
  const imported = insertMany(verses);
  console.log(`Imported ${imported} verses for ${translation}`);
  return imported;
}

async function main() {
  console.log('Starting Bible import...');
  
  // Initialisiere Datenbank (stellt sicher, dass Tabellen existieren)
  initializeDatabase();
  
  const biblePath = getBiblePath();
  console.log(`Bible path: ${biblePath}`);
  
  if (!fs.existsSync(biblePath)) {
    console.error(`Bible directory not found: ${biblePath}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(biblePath);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'package.json');
  
  if (jsonFiles.length === 0) {
    console.error('No JSON files found in bible directory');
    process.exit(1);
  }
  
  console.log(`Found ${jsonFiles.length} Bible files`);
  
  let totalImported = 0;
  for (const file of jsonFiles) {
    const translation = TRANSLATION_MAP[file];
    if (!translation) {
      console.warn(`Unknown translation for file: ${file}, skipping...`);
      continue;
    }
    
    const filePath = path.join(biblePath, file);
    const imported = await importBibleFile(filePath, translation);
    totalImported += imported;
  }
  
  console.log(`\n✅ Import complete! Total verses imported: ${totalImported}`);
  
  // Zeige Statistiken
  const stats = db.prepare(`
    SELECT translation, COUNT(*) as count
    FROM bible_verses
    GROUP BY translation
  `).all() as Array<{ translation: string; count: number }>;
  
  console.log('\nStatistics:');
  for (const stat of stats) {
    console.log(`  ${stat.translation}: ${stat.count} verses`);
  }
}

main().catch((error) => {
  console.error('Error during import:', error);
  process.exit(1);
});

