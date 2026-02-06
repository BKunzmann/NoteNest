/**
 * Search Service
 * 
 * Volltextsuche über alle Notizen eines Benutzers
 * Verwendet den Index für schnelle Suchen
 */

import { searchIndex } from './index.service';

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
 * Sucht nach einem Begriff in allen Notizen eines Benutzers
 * Verwendet den Index für schnelle Suchen mit Fuzzy Search
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
  
  console.log(`Searching for "${trimmedTerm}" for user ${userId}, type: ${folderType || 'all'}`);
  
  try {
    // Suche im Index (synchron, sehr schnell)
    const indexResults = searchIndex(userId, trimmedTerm, folderType, 2);
    
    // Konvertiere Index-Ergebnisse zu SearchResult-Format
    const results: SearchResult[] = indexResults.map(result => ({
      path: result.path,
      type: result.type,
      name: result.name,
      matches: result.matches.map(match => ({
        line: match.line,
        text: match.text,
        context: match.context
      })),
      relevance: result.relevance
    }));
    
    console.log(`Search for "${trimmedTerm}" completed with ${results.length} total results`);
    
    return results;
  } catch (error: any) {
    console.error('Error searching index:', error);
    // Fallback: Leeres Array bei Fehler
    return [];
  }
}

