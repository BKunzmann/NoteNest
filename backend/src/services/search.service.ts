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
  results: SearchResult[]
): Promise<void> {
  try {
    const items = await listDirectory(userId, dirPath, type);
    
    for (const item of items) {
      const itemPath = item.path;
      
      if (item.type === 'folder') {
        // Rekursiv in Unterordnern suchen
        await searchInDirectory(userId, itemPath, type, searchTerm, results);
      } else if (item.type === 'file' && item.isEditable) {
        // Nur durchsuchbare Dateien (.md, .txt)
        const matches = await searchInFile(userId, itemPath, searchTerm, type);
        
        if (matches.length > 0) {
          // Berechne Relevanz basierend auf Anzahl der Matches und Dateiname
          let relevance = matches.length;
          
          // Bonus, wenn Suchbegriff im Dateinamen vorkommt
          const fileName = path.basename(itemPath);
          if (fileName.toLowerCase().includes(searchTerm.toLowerCase())) {
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
  } catch (error) {
    // Verzeichnis konnte nicht gelesen werden
    console.error(`Error searching in directory ${dirPath}:`, error);
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
  
  // Suche in privaten Ordnern
  if (!folderType || folderType === 'private') {
    try {
      await searchInDirectory(userId, '/', 'private', trimmedTerm, results);
    } catch (error) {
      console.error('Error searching private folder:', error);
    }
  }
  
  // Suche in geteilten Ordnern
  if (!folderType || folderType === 'shared') {
    try {
      await searchInDirectory(userId, '/', 'shared', trimmedTerm, results);
    } catch (error) {
      console.error('Error searching shared folder:', error);
    }
  }
  
  // Sortiere nach Relevanz (höchste zuerst)
  results.sort((a, b) => b.relevance - a.relevance);
  
  return results;
}

