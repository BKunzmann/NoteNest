/**
 * Search Service
 * 
 * Volltextsuche über alle Notizen eines Benutzers
 * Verwendet den Index für schnelle Suchen
 */

import fs from 'fs/promises';
import db from '../config/database';
import { removeFromIndex, searchIndex } from './index.service';
import {
  getFileType,
  isPathInHiddenFolder,
  listDirectory,
  readFile,
  resolveUserPath
} from './file.service';

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

function parseMetadataPathKey(metadataPathKey: string): {
  type: 'private' | 'shared' | null;
  path: string;
} {
  if (metadataPathKey.startsWith('private:')) {
    return { type: 'private', path: metadataPathKey.slice('private:'.length) || '/' };
  }
  if (metadataPathKey.startsWith('shared:')) {
    return { type: 'shared', path: metadataPathKey.slice('shared:'.length) || '/' };
  }
  return { type: null, path: metadataPathKey || '/' };
}

function normalizePath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  return normalized.replace(/\/+/g, '/');
}

function extractLineMatches(content: string, query: string, maxMatches: number = 6): SearchMatch[] {
  const lowerQuery = query.toLowerCase();
  const lines = content.split('\n');
  const matches: SearchMatch[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.toLowerCase().includes(lowerQuery)) {
      continue;
    }
    matches.push({
      line: index + 1,
      text: line,
      context: line.length > 220 ? `${line.slice(0, 220)}...` : line
    });
    if (matches.length >= maxMatches) {
      break;
    }
  }

  return matches;
}

async function searchByFilesystemFallback(
  userId: number,
  searchTerm: string,
  folderType?: 'private' | 'shared'
): Promise<SearchResult[]> {
  const normalizedQuery = searchTerm.toLowerCase();
  const maxResults = 200;
  const maxDepth = 20;
  const results: SearchResult[] = [];
  const targets: Array<'private' | 'shared'> = folderType ? [folderType] : ['private', 'shared'];

  const scanDirectory = async (
    targetType: 'private' | 'shared',
    dirPath: string,
    depth: number
  ): Promise<void> => {
    if (depth > maxDepth || results.length >= maxResults) {
      return;
    }

    let items: Awaited<ReturnType<typeof listDirectory>>;
    try {
      items = await listDirectory(userId, dirPath, targetType);
    } catch {
      return;
    }

    for (const item of items) {
      if (results.length >= maxResults) {
        return;
      }

      const itemPath = normalizePath(item.path || `${dirPath}/${item.name}`);
      if (isPathInHiddenFolder(itemPath)) {
        continue;
      }

      if (item.type === 'folder') {
        await scanDirectory(targetType, itemPath, depth + 1);
        continue;
      }

      const matches: SearchMatch[] = [];
      const fileNameMatch = item.name.toLowerCase().includes(normalizedQuery);
      if (fileNameMatch) {
        matches.push({
          line: 0,
          text: item.name,
          context: `Dateiname enthält "${searchTerm}"`
        });
      }

      const fileType = getFileType(item.name);
      if (fileType.isEditable) {
        try {
          const content = await readFile(userId, itemPath, targetType);
          matches.push(...extractLineMatches(content, normalizedQuery));
        } catch {
          // Ignoriere Lesefehler im Fallback
        }
      }

      if (matches.length > 0) {
        results.push({
          path: itemPath,
          type: targetType,
          name: item.name,
          matches,
          relevance: fileNameMatch ? 16 : 10
        });
      }
    }
  };

  for (const targetType of targets) {
    await scanDirectory(targetType, '/', 0);
  }

  results.sort((a, b) => b.relevance - a.relevance);
  return results;
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
    type CandidateResult = SearchResult & { fromIndex: boolean };
    const byKey = new Map<string, CandidateResult>();

    // 1) Suche im Volltextindex (schnell, inkl. Dateiname innerhalb search_index)
    const indexResults = searchIndex(userId, trimmedTerm, folderType, 2);
    for (const result of indexResults) {
      const key = `${result.type}:${normalizePath(result.path)}`;
      byKey.set(key, {
        ...result,
        path: normalizePath(result.path),
        fromIndex: true
      });
    }

    // 2) Dateiname-Matches aus file_metadata ergänzen (deckt nicht-indexierte Dateien ab)
    const metadataRows = db.prepare(`
      SELECT file_path, file_name
      FROM file_metadata
      WHERE user_id = ?
        AND lower(file_name) LIKE ?
      LIMIT 600
    `).all(userId, `%${trimmedTerm.toLowerCase()}%`) as Array<{
      file_path: string;
      file_name: string;
    }>;

    for (const row of metadataRows) {
      const parsed = parseMetadataPathKey(row.file_path);
      const parsedType = parsed.type;
      if (parsedType === null) {
        continue;
      }
      if (folderType && parsedType !== folderType) {
        continue;
      }

      const normalizedPath = normalizePath(parsed.path);
      if (isPathInHiddenFolder(normalizedPath)) {
        continue;
      }

      const key = `${parsedType}:${normalizedPath}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.relevance += 4;
        if (!existing.matches.some((match) => match.line === 0 && match.context.includes('Dateiname enthält'))) {
          existing.matches.unshift({
            line: 0,
            text: row.file_name,
            context: `Dateiname enthält "${trimmedTerm}"`
          });
        }
        continue;
      }

      byKey.set(key, {
        path: normalizedPath,
        type: parsedType,
        name: row.file_name,
        matches: [{
          line: 0,
          text: row.file_name,
          context: `Dateiname enthält "${trimmedTerm}"`
        }],
        relevance: 12,
        fromIndex: false
      });
    }

    // 3) Existenzprüfung (stale Indexeinträge entfernen, falsche Treffer filtern)
    const validResults: CandidateResult[] = [];
    for (const result of byKey.values()) {
      try {
        const normalizedPath = normalizePath(result.path);
        const absolutePath = resolveUserPath(userId, normalizedPath, result.type);
        const stats = await fs.stat(absolutePath);
        if (!stats.isFile()) {
          if (result.fromIndex) {
            await removeFromIndex(userId, normalizedPath, result.type);
          }
          continue;
        }
        validResults.push({
          ...result,
          path: normalizedPath
        });
      } catch (error: any) {
        if (error.code === 'ENOENT' && result.fromIndex) {
          await removeFromIndex(userId, normalizePath(result.path), result.type);
        }
      }
    }

    validResults.sort((a, b) => b.relevance - a.relevance);
    const results: SearchResult[] = validResults.map(({ fromIndex: _fromIndex, ...result }) => result);

    // 4) Fallback: Wenn Index keine verwertbaren Ergebnisse liefert, Dateisystem direkt durchsuchen
    if (results.length === 0) {
      const fallbackResults = await searchByFilesystemFallback(userId, trimmedTerm, folderType);
      console.log(`Search fallback for "${trimmedTerm}" returned ${fallbackResults.length} results`);
      return fallbackResults;
    }

    console.log(`Search for "${trimmedTerm}" completed with ${results.length} total results`);
    
    return results;
  } catch (error: any) {
    console.error('Error searching index:', error);
    // Fallback: Leeres Array bei Fehler
    return [];
  }
}

