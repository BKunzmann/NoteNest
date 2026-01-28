/**
 * Search Service
 * 
 * Volltextsuche über alle Notizen eines Benutzers
 */

import { listDirectory, readFile } from './file.service';
import path from 'path';

export interface SearchResult {
  path: string;
  type: 'private' | 'shared';
  name: string;
  matches: SearchMatch[];
  relevance: number;
}

export interface SearchMatch {
  line: number;
  text: string;
  context: string; // Text vor und nach dem Match
}

/**
 * Durchsucht eine Datei nach einem Suchbegriff
 */
async function searchInFile(
  userId: number,
  filePath: string,
  searchTerm: string,
  type: 'private' | 'shared'
): Promise<SearchMatch[]> {
  try {
    const content = await readFile(userId, filePath, type);
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes(lowerSearchTerm)) {
        // Finde alle Vorkommen in dieser Zeile
        let startIndex = 0;
        while ((startIndex = lowerLine.indexOf(lowerSearchTerm, startIndex)) !== -1) {
          // Kontext: 50 Zeichen vor und nach dem Match
          const contextStart = Math.max(0, startIndex - 50);
          const contextEnd = Math.min(line.length, startIndex + searchTerm.length + 50);
          const context = line.substring(contextStart, contextEnd);
          
          matches.push({
            line: index + 1,
            text: line,
            context
          });
          
          startIndex += searchTerm.length;
        }
      }
    });
    
    return matches;
  } catch (error) {
    // Datei konnte nicht gelesen werden (z.B. keine Berechtigung)
    return [];
  }
}

/**
 * Rekursive Funktion zum Durchsuchen eines Verzeichnisses
 */
async function searchInDirectory(
  userId: number,
  dirPath: string,
  type: 'private' | 'shared',
  searchTerm: string,
  results: SearchResult[],
  depth: number = 0
): Promise<void> {
  // Maximale Tiefe begrenzen, um endlose Schleifen zu verhindern
  if (depth > 10) {
    console.warn(`Max search depth reached at ${dirPath}`);
    return;
  }

  try {
    const items = await listDirectory(userId, dirPath, type);
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    for (const item of items) {
      const itemPath = item.path;
      
      if (item.type === 'folder') {
        // Rekursiv in Unterordnern suchen
        await searchInDirectory(userId, itemPath, type, searchTerm, results, depth + 1);
      } else if (item.type === 'file') {
        const fileName = path.basename(itemPath);
        const nameMatches = fileName.toLowerCase().includes(lowerSearchTerm);
        let matches: SearchMatch[] = [];

        if (item.isEditable) {
          // Nur durchsuchbare Dateien (.md, .txt)
          matches = await searchInFile(userId, itemPath, searchTerm, type);
        }

        if (matches.length > 0 || nameMatches) {
          if (matches.length === 0 && nameMatches) {
            matches = [{
              line: 0,
              text: fileName,
              context: fileName
            }];
          }

          // Berechne Relevanz basierend auf Anzahl der Matches und Dateiname
          let relevance = matches.length;

          // Bonus, wenn Suchbegriff im Dateinamen vorkommt
          if (nameMatches) {
            relevance += 10;
          }

          results.push({
            path: itemPath,
            type,
            name: fileName,
            matches,
            relevance
          });
        }
      }
    }
  } catch (error: any) {
    // Verzeichnis konnte nicht gelesen werden - nicht kritisch
    if (error.code !== 'ENOENT') {
      console.warn(`Error searching in directory ${dirPath}:`, error.message);
    }
  }
}

/**
 * Sucht nach einem Begriff in allen Notizen eines Benutzers
 * 
 * @param userId - ID des Benutzers
 * @param searchTerm - Suchbegriff
 * @param folderType - Optional: Nur in 'private' oder 'shared' suchen
 * @returns Array von Suchergebnissen, sortiert nach Relevanz
 */
export async function searchNotes(
  userId: number,
  searchTerm: string,
  folderType?: 'private' | 'shared'
): Promise<SearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }
  
  const trimmedTerm = searchTerm.trim();
  const results: SearchResult[] = [];
  
  console.log(`Searching for "${trimmedTerm}" for user ${userId}, type: ${folderType || 'all'}`);
  
  // Suche in privaten Ordnern
  if (!folderType || folderType === 'private') {
    try {
      await searchInDirectory(userId, '/', 'private', trimmedTerm, results, 0);
      console.log(`Private search completed, found ${results.length} results so far`);
    } catch (error: any) {
      console.warn('Error searching private folder:', error.message);
    }
  }
  
  // Suche in geteilten Ordnern
  if (!folderType || folderType === 'shared') {
    try {
      const privateResultCount = results.length;
      await searchInDirectory(userId, '/', 'shared', trimmedTerm, results, 0);
      console.log(`Shared search completed, found ${results.length - privateResultCount} additional results`);
    } catch (error: any) {
      console.warn('Error searching shared folder:', error.message);
    }
  }
  
  // Sortiere nach Relevanz (höchste zuerst)
  results.sort((a, b) => b.relevance - a.relevance);
  
  console.log(`Search for "${trimmedTerm}" completed with ${results.length} total results`);
  
  return results;
}

