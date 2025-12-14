/**
 * Bible Reference Utilities
 * 
 * Funktionen zur Erkennung und Parsing von Bibelstellen
 */

export interface BibleReferenceMatch {
  text: string;
  start: number;
  end: number;
  reference: string;
}

/**
 * Regex-Patterns für verschiedene Bibelstellen-Formate
 * Unterstützt: Bindestrich (-), Gedankenstrich (–), Geviertstrich (—)
 */
const BIBLE_REFERENCE_PATTERNS = [
  // Format: "Psalm 23,3" oder "Ps 23:3" oder "Psalmen 23,3" (mit Vers)
  // WICHTIG: Dieses Pattern muss VOR dem Pattern ohne Vers kommen, damit "Psalm 15,3" nicht als "Psalm 1" erkannt wird
  /(?:Psalm|Ps|Psalmen)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
  
  // Format: "1. Mose 1:1" oder "1 Mose 1,1" (mit Vers)
  /\d+\.?\s*Mose\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
  
  // Format: "Johannes 3,16" oder "Joh 1,12-13" oder "Joh 1,12–13" (mit Vers)
  // Unterstützt auch Abkürzungen: Joh, Mt, Mk, Lk, Apg, Röm, Gal, Eph, Phil, Kol, Jak, Hebr, Offb
  /(?:Matthäus|Mt|Markus|Mk|Lukas|Lk|Johannes|Joh|Apostelgeschichte|Apg|Römer|Röm|Galater|Gal|Epheser|Eph|Philipper|Phil|Kolosser|Kol|Jakobus|Jak|Hebräer|Hebr|Offenbarung|Offb|Apokalypse)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
  
  // Format: "1. Samuel 1:1" oder "2. Könige 5:3" (mit Vers)
  /\d+\.?\s*(?:Samuel|Könige|Chronik|Korinther|Kor|Thessalonicher|Thess|Timotheus|Tim|Petrus|Petr|Johannes|Joh)\s+\d+[,:\s]+\d+(?:[-–—]\d+)?/gi,
  
  // Format: "Psalm 23" (nur Kapitel)
  // WICHTIG: Negative Lookahead muss sicherstellen, dass nach der Zahl kein Komma/Doppelpunkt/Leerzeichen+Zahl kommt
  // Verwende \b (Word Boundary) oder prüfe, dass nach der Zahl ein Leerzeichen, Satzende oder nichts kommt
  /(?:Psalm|Ps|Psalmen)\s+\d+(?![,:\s]\d)/gi,
  
  // Format: "1. Mose 1" (nur Kapitel)
  /\d+\.?\s*Mose\s+\d+(?![,:\s]\d)/gi,
  
  // Format: "Epheser 3" oder "Johannes 3" oder "Joh 3" (nur Kapitel, ohne Vers)
  /(?:Matthäus|Mt|Markus|Mk|Lukas|Lk|Johannes|Joh|Apostelgeschichte|Apg|Römer|Röm|Galater|Gal|Epheser|Eph|Philipper|Phil|Kolosser|Kol|Jakobus|Jak|Hebräer|Hebr|Offenbarung|Offb|Apokalypse)\s+\d+(?![,:\s]\d)/gi,
  
  // Format: "1. Samuel 1" oder "2. Könige 5" (nur Kapitel)
  /\d+\.?\s*(?:Samuel|Könige|Chronik|Korinther|Kor|Thessalonicher|Thess|Timotheus|Tim|Petrus|Petr|Johannes|Joh)\s+\d+(?![,:\s]\d)/gi
];

/**
 * Findet alle Bibelstellen-Referenzen in einem Text
 */
export function findBibleReferences(text: string): BibleReferenceMatch[] {
  const matches: BibleReferenceMatch[] = [];
  const foundPositions = new Set<string>(); // Verhindere Duplikate basierend auf Position
  
  // Sammle alle Matches von allen Patterns
  for (const pattern of BIBLE_REFERENCE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    
    // Reset lastIndex für jedes Pattern
    regex.lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0];
      const start = match.index;
      const end = start + matchText.length;
      const positionKey = `${start}-${end}`;
      
      // Überspringe, wenn bereits gefunden
      if (foundPositions.has(positionKey)) {
        continue;
      }
      
      // Prüfe, ob diese Referenz mit einer bereits gefundenen überlappt
      let overlaps = false;
      for (const existingMatch of matches) {
        // Wenn die neue Referenz innerhalb einer existierenden liegt oder umgekehrt
        if (
          (start >= existingMatch.start && start < existingMatch.end) ||
          (end > existingMatch.start && end <= existingMatch.end) ||
          (start <= existingMatch.start && end >= existingMatch.end)
        ) {
          // Behalte die längere Referenz (wahrscheinlich spezifischer)
          if (matchText.length > existingMatch.text.length) {
            // Entferne die kürzere und füge die längere hinzu
            const index = matches.indexOf(existingMatch);
            matches.splice(index, 1);
            foundPositions.delete(`${existingMatch.start}-${existingMatch.end}`);
          } else {
            overlaps = true;
          }
          break;
        }
      }
      
      if (!overlaps) {
        foundPositions.add(positionKey);
        matches.push({
          text: matchText,
          start,
          end,
          reference: matchText.trim()
        });
      }
    }
  }
  
  // Sortiere nach Position im Text
  matches.sort((a, b) => a.start - b.start);
  
  return matches;
}

/**
 * Prüft, ob ein Text eine Bibelstellen-Referenz enthält
 */
export function hasBibleReference(text: string): boolean {
  return findBibleReferences(text).length > 0;
}

