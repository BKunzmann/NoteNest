/**
 * Bible Reference Formatting Utilities
 * 
 * Formatierung von Bibelstellen nach Standard-Abkürzungen
 */

/**
 * Mapping von Buch-Codes zu Standard-Abkürzungen (deutsch)
 * (Wird derzeit nicht verwendet, aber für zukünftige Erweiterungen bereitgehalten)
 */
// BOOK_ABBREVIATIONS - für zukünftige Verwendung reserviert
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const BOOK_ABBREVIATIONS_UNUSED: Record<string, string> = {
  // Altes Testament
  'GEN': '1. Mose',
  'EXO': '2. Mose',
  'LEV': '3. Mose',
  'NUM': '4. Mose',
  'DEU': '5. Mose',
  'JOS': 'Jos',
  'JDG': 'Ri',
  'RUT': 'Rut',
  '1SA': '1. Sam',
  '2SA': '2. Sam',
  '1KI': '1. Kön',
  '2KI': '2. Kön',
  '1CH': '1. Chr',
  '2CH': '2. Chr',
  'EZR': 'Esr',
  'NEH': 'Neh',
  'EST': 'Est',
  'JOB': 'Hiob',
  'PSA': 'Ps',
  'PRO': 'Spr',
  'ECC': 'Pred',
  'SNG': 'Hld',
  'ISA': 'Jes',
  'JER': 'Jer',
  'LAM': 'Klgl',
  'EZK': 'Hes',
  'DAN': 'Dan',
  'HOS': 'Hos',
  'JOL': 'Joel',
  'AMO': 'Am',
  'OBA': 'Obd',
  'JON': 'Jona',
  'MIC': 'Mi',
  'NAM': 'Nah',
  'HAB': 'Hab',
  'ZEP': 'Zef',
  'HAG': 'Hag',
  'ZEC': 'Sach',
  'MAL': 'Mal',
  
  // Neues Testament
  'MAT': 'Mt',
  'MRK': 'Mk',
  'LUK': 'Lk',
  'JHN': 'Joh',
  'ACT': 'Apg',
  'ROM': 'Röm',
  '1CO': '1. Kor',
  '2CO': '2. Kor',
  'GAL': 'Gal',
  'EPH': 'Eph',
  'PHP': 'Phil',
  'COL': 'Kol',
  '1TH': '1. Thess',
  '2TH': '2. Thess',
  '1TI': '1. Tim',
  '2TI': '2. Tim',
  'TIT': 'Tit',
  'PHM': 'Phlm',
  'HEB': 'Hebr',
  'JAS': 'Jak',
  '1PE': '1. Petr',
  '2PE': '2. Petr',
  '1JN': '1. Joh',
  '2JN': '2. Joh',
  '3JN': '3. Joh',
  'JUD': 'Jud',
  'REV': 'Offb'
};

/**
 * Formatiert eine Bibelstellen-Referenz für die Anzeige
 * Konvertiert z.B. "1. Korinther 2,5" zu "1. Kor 2,5"
 * Entfernt Paragraph-Zeichen und ersetzt Punkte durch Kommas
 */
export function formatBibleReference(reference: string): string {
  if (!reference) return '';
  
  // Entferne Paragraph-Zeichen (¶) und andere unerwünschte Zeichen
  let formatted = reference
    .replace(/¶/g, '') // Paragraph-Zeichen
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Unsichtbare Zeichen
    .trim();
  
  // Ersetze Punkte durch Kommas zwischen Kapitel und Vers (z.B. "2.5" -> "2,5")
  // Aber nicht bei Buchnamen (z.B. "1. Kor" bleibt "1. Kor")
  formatted = formatted.replace(/(\d+)\.(\d+)/g, '$1,$2');
  
  // Versuche, Buchnamen zu erkennen und zu formatieren
  // Pattern: "Buch Kapitel,Vers" oder "Buch Kapitel:Vers" oder "Buch Kapitel"
  const patterns = [
    /^(.+?)\s+(\d+)[,:\s]+(\d+)(?:[-–—](\d+))?$/i, // Mit Vers
    /^(.+?)\s+(\d+)$/i // Nur Kapitel
  ];
  
  for (const pattern of patterns) {
    const match = formatted.match(pattern);
    if (match) {
      const bookName = match[1].trim();
      const chapter = match[2];
      const verse = match[3];
      const verseEnd = match[4];
      
      // Versuche, Buchnamen zu normalisieren und abzukürzen
      const normalizedBook = normalizeBookNameForDisplay(bookName);
      
      if (verse) {
        if (verseEnd) {
          return `${normalizedBook} ${chapter},${verse}-${verseEnd}`;
        }
        return `${normalizedBook} ${chapter},${verse}`;
      } else {
        return `${normalizedBook} ${chapter}`;
      }
    }
  }
  
  // Falls kein Pattern passt, entferne nur Paragraph-Zeichen und ersetze Punkte
  return formatted;
}

/**
 * Normalisiert einen Buchnamen für die Anzeige
 * Versucht, den Buchnamen zu erkennen und zur Standard-Abkürzung zu konvertieren
 */
function normalizeBookNameForDisplay(bookName: string): string {
  const lower = bookName.toLowerCase().trim();
  
  // Direktes Mapping für häufige Fälle
  const directMapping: Record<string, string> = {
    '1. korinther': '1. Kor',
    '1 korinther': '1. Kor',
    '1.korinther': '1. Kor',
    '1korinther': '1. Kor',
    '1. kor': '1. Kor',
    '1 kor': '1. Kor',
    '1kor': '1. Kor',
    '2. korinther': '2. Kor',
    '2 korinther': '2. Kor',
    '2.korinther': '2. Kor',
    '2korinther': '2. Kor',
    '2. kor': '2. Kor',
    '2 kor': '2. Kor',
    '2kor': '2. Kor',
    'johannes': 'Joh',
    'joh': 'Joh',
    'matthäus': 'Mt',
    'matthaeus': 'Mt',
    'mt': 'Mt',
    'markus': 'Mk',
    'mk': 'Mk',
    'lukas': 'Lk',
    'lk': 'Lk',
    'apostelgeschichte': 'Apg',
    'apg': 'Apg',
    'römer': 'Röm',
    'roem': 'Röm',
    'röm': 'Röm',
    'galater': 'Gal',
    'gal': 'Gal',
    'epheser': 'Eph',
    'eph': 'Eph',
    'philipper': 'Phil',
    'phil': 'Phil',
    'kolosser': 'Kol',
    'kol': 'Kol',
    '1. thessalonicher': '1. Thess',
    '1 thessalonicher': '1. Thess',
    '1.thessalonicher': '1. Thess',
    '1thessalonicher': '1. Thess',
    '1. thess': '1. Thess',
    '1 thess': '1. Thess',
    '1thess': '1. Thess',
    '2. thessalonicher': '2. Thess',
    '2 thessalonicher': '2. Thess',
    '2.thessalonicher': '2. Thess',
    '2thessalonicher': '2. Thess',
    '2. thess': '2. Thess',
    '2 thess': '2. Thess',
    '2thess': '2. Thess',
    '1. timotheus': '1. Tim',
    '1 timotheus': '1. Tim',
    '1.timotheus': '1. Tim',
    '1timotheus': '1. Tim',
    '1. tim': '1. Tim',
    '1 tim': '1. Tim',
    '1tim': '1. Tim',
    '2. timotheus': '2. Tim',
    '2 timotheus': '2. Tim',
    '2.timotheus': '2. Tim',
    '2timotheus': '2. Tim',
    '2. tim': '2. Tim',
    '2 tim': '2. Tim',
    '2tim': '2. Tim',
    '1. petrus': '1. Petr',
    '1 petrus': '1. Petr',
    '1.petrus': '1. Petr',
    '1petrus': '1. Petr',
    '1. petr': '1. Petr',
    '1 petr': '1. Petr',
    '1petr': '1. Petr',
    '2. petrus': '2. Petr',
    '2 petrus': '2. Petr',
    '2.petrus': '2. Petr',
    '2petrus': '2. Petr',
    '2. petr': '2. Petr',
    '2 petr': '2. Petr',
    '2petr': '2. Petr',
    '1. johannes': '1. Joh',
    '1 johannes': '1. Joh',
    '1.johannes': '1. Joh',
    '1johannes': '1. Joh',
    '1. joh': '1. Joh',
    '1 joh': '1. Joh',
    '1joh': '1. Joh',
    '2. johannes': '2. Joh',
    '2 johannes': '2. Joh',
    '2.johannes': '2. Joh',
    '2johannes': '2. Joh',
    '2. joh': '2. Joh',
    '2 joh': '2. Joh',
    '2joh': '2. Joh',
    '3. johannes': '3. Joh',
    '3 johannes': '3. Joh',
    '3.johannes': '3. Joh',
    '3johannes': '3. Joh',
    '3. joh': '3. Joh',
    '3 joh': '3. Joh',
    '3joh': '3. Joh',
    'jakobus': 'Jak',
    'jak': 'Jak',
    'hebräer': 'Hebr',
    'hebraeer': 'Hebr',
    'hebr': 'Hebr',
    'offenbarung': 'Offb',
    'offb': 'Offb',
    'apokalypse': 'Offb',
    'psalm': 'Ps',
    'ps': 'Ps',
    'psalmen': 'Ps'
  };
  
  if (directMapping[lower]) {
    return directMapping[lower];
  }
  
  // Fallback: Original zurückgeben (bereits ohne Paragraph-Zeichen)
  return bookName;
}

