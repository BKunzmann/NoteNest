/**
 * Index Service
 * 
 * Verantwortlich für:
 * - Volltext-Indexierung von Dateien
 * - Tokenisierung von Text
 * - Fuzzy Search im Index
 * - Parallele Indexierung
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import db from '../config/database';
import { readFile, resolveUserPath, listDirectory, isIndexable, isPathInHiddenFolder } from './file.service';

/**
 * Berechnet SHA-256 Hash einer Datei
 */
async function calculateFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Berechnet Levenshtein-Distanz zwischen zwei Strings
 * Für Fuzzy Search
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Erstelle Matrix
  const matrix: number[][] = [];
  
  // Initialisiere erste Zeile und Spalte
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fülle Matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // Löschung
          matrix[i][j - 1] + 1,     // Einfügung
          matrix[i - 1][j - 1] + 1  // Ersetzung
        );
      }
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Tokenisiert Text in Wörter
 * Normalisiert (lowercase, Umlaute) und entfernt Sonderzeichen
 */
function tokenizeText(text: string): Array<{ token: string; line: number; position: number; context: string }> {
  const tokens: Array<{ token: string; line: number; position: number; context: string }> = [];
  const lines = text.split('\n');
  
  // Regex für Wörter (Unicode-fähig, unterstützt Umlaute)
  const wordRegex = /\b[\w\u00C0-\u017F]+\b/g;
  
  lines.forEach((line, lineIndex) => {
    const normalizedLine = line.toLowerCase();
    let match;
    
    while ((match = wordRegex.exec(normalizedLine)) !== null) {
      const token = match[0];
      const position = match.index;
      
      // Kontext: 50 Zeichen vor und nach dem Token
      const contextStart = Math.max(0, position - 50);
      const contextEnd = Math.min(line.length, position + token.length + 50);
      const context = line.substring(contextStart, contextEnd);
      
      tokens.push({
        token,
        line: lineIndex + 1,
        position,
        context
      });
    }
  });
  
  return tokens;
}

/**
 * Holt App-Config Wert
 */
function getAppConfig(key: string, defaultValue: string = ''): string {
  const result = db.prepare('SELECT value FROM app_config WHERE key = ?').get(key) as { value: string } | undefined;
  return result?.value || defaultValue;
}

/**
 * Indexiert eine einzelne Datei
 */
export async function indexFile(
  userId: number,
  filePath: string,
  type: 'private' | 'shared'
): Promise<void> {
  try {
    // Prüfe, ob Datei indexierbar ist
    if (!isIndexable(filePath)) {
      return;
    }
    
    // Prüfe, ob Datei in einem ausgeblendeten Ordner liegt
    if (isPathInHiddenFolder(filePath)) {
      return;
    }
    
    const fullPath = resolveUserPath(userId, filePath, type);
    
    // Prüfe, ob Datei existiert
    let stats;
    try {
      stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        return; // Überspringe Verzeichnisse
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Datei existiert nicht mehr - entferne aus Index
        await removeFromIndex(userId, filePath, type);
        return;
      }
      throw error;
    }
    
    // Berechne Content-Hash
    const contentHash = await calculateFileHash(fullPath);
    
    // Prüfe, ob bereits indexiert und unverändert
    const existing = db.prepare(`
      SELECT id, content_hash, last_modified 
      FROM search_index 
      WHERE user_id = ? AND file_path = ? AND file_type = ?
    `).get(userId, filePath, type) as { id: number; content_hash: string; last_modified: string } | undefined;
    
    if (existing && existing.content_hash === contentHash) {
      // Datei unverändert, überspringe Indexierung
      return;
    }
    
    // Lese Datei-Inhalt
    let fileContent: string;
    try {
      fileContent = await readFile(userId, filePath, type);
    } catch (error) {
      console.warn(`Could not read file for indexing: ${filePath}`, error);
      return;
    }
    
    // Tokenisiere Text
    const tokens = tokenizeText(fileContent);
    
    // Beginne Transaktion
    const transaction = db.transaction(() => {
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const wordCount = fileContent.split(/\s+/).filter(w => w.length > 0).length;
      
      let fileId: number;
      
      // Aktualisiere oder erstelle Index-Eintrag
      if (existing) {
        fileId = existing.id;
        db.prepare(`
          UPDATE search_index 
          SET content_hash = ?, 
              file_size = ?, 
              word_count = ?,
              last_modified = ?,
              indexed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(contentHash, stats.size, wordCount, stats.mtime.toISOString(), fileId);
        
        // Lösche alte Tokens
        db.prepare('DELETE FROM search_tokens WHERE file_id = ?').run(fileId);
      } else {
        const result = db.prepare(`
          INSERT INTO search_index 
          (user_id, file_path, file_type, file_name, file_extension, content_hash, file_size, word_count, last_modified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          filePath,
          type,
          fileName,
          fileExtension,
          contentHash,
          stats.size,
          wordCount,
          stats.mtime.toISOString()
        );
        
        fileId = result.lastInsertRowid as number;
      }
      
      // Füge Tokens hinzu (Batch-Insert für Performance)
      if (tokens.length > 0) {
        const insertToken = db.prepare(`
          INSERT INTO search_tokens (token, file_id, line_number, position, context)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const token of tokens) {
          insertToken.run(token.token, fileId, token.line, token.position, token.context);
        }
      }
    });
    
    transaction();
    
  } catch (error) {
    console.error(`Error indexing file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Entfernt eine Datei aus dem Index
 */
export async function removeFromIndex(
  userId: number,
  filePath: string,
  type: 'private' | 'shared'
): Promise<void> {
  try {
    const indexEntry = db.prepare(`
      SELECT id FROM search_index 
      WHERE user_id = ? AND file_path = ? AND file_type = ?
    `).get(userId, filePath, type) as { id: number } | undefined;
    
    if (indexEntry) {
      const transaction = db.transaction(() => {
        // Lösche Tokens
        db.prepare('DELETE FROM search_tokens WHERE file_id = ?').run(indexEntry.id);
        // Lösche Index-Eintrag
        db.prepare('DELETE FROM search_index WHERE id = ?').run(indexEntry.id);
      });
      
      transaction();
    }
  } catch (error) {
    console.error(`Error removing file from index ${filePath}:`, error);
    throw error;
  }
}

/**
 * Sammelt alle indexierbaren Dateien rekursiv
 */
async function getAllIndexableFiles(
  userId: number,
  dirPath: string,
  type: 'private' | 'shared',
  files: Array<{ path: string; type: 'private' | 'shared' }> = [],
  depth: number = 0
): Promise<Array<{ path: string; type: 'private' | 'shared' }>> {
  // Maximale Tiefe begrenzen
  if (depth > 20) {
    console.warn(`Max depth reached at ${dirPath}`);
    return files;
  }
  
  try {
    const items = await listDirectory(userId, dirPath, type);
    
    for (const item of items) {
      if (item.type === 'folder') {
        // Rekursiv in Unterordnern suchen
        await getAllIndexableFiles(userId, item.path, type, files, depth + 1);
      } else if (item.type === 'file' && isIndexable(item.path)) {
        files.push({ path: item.path, type });
      }
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.warn(`Error listing directory ${dirPath}:`, error.message);
    }
  }
  
  return files;
}

/**
 * Indexiert alle Dateien eines Benutzers (parallel)
 */
export async function indexAllFiles(
  userId: number,
  folderType?: 'private' | 'shared',
  onProgress?: (current: number, total: number) => void
): Promise<{ indexed: number; errors: number }> {
  const files: Array<{ path: string; type: 'private' | 'shared' }> = [];
  
  // Sammle alle indexierbaren Dateien
  if (!folderType || folderType === 'private') {
    await getAllIndexableFiles(userId, '/', 'private', files);
  }
  
  if (!folderType || folderType === 'shared') {
    await getAllIndexableFiles(userId, '/', 'shared', files);
  }
  
  const total = files.length;
  let indexed = 0;
  let errors = 0;
  
  // Hole Worker-Anzahl aus Config
  const workerCount = parseInt(getAppConfig('index_parallel_workers', '4'), 10);
  const concurrency = Math.max(1, Math.min(workerCount, 10)); // Max 10 Worker
  
  // Indexiere Dateien parallel
  const processFile = async (file: { path: string; type: 'private' | 'shared' }) => {
    try {
      await indexFile(userId, file.path, file.type);
      indexed++;
      if (onProgress) {
        onProgress(indexed, total);
      }
    } catch (error) {
      errors++;
      console.error(`Error indexing file ${file.path}:`, error);
    }
  };
  
  // Verarbeite in Chunks für kontrollierte Parallelität
  const chunks: Array<Array<{ path: string; type: 'private' | 'shared' }>> = [];
  for (let i = 0; i < files.length; i += concurrency) {
    chunks.push(files.slice(i, i + concurrency));
  }
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(processFile));
  }
  
  return { indexed, errors };
}

/**
 * Sucht im Index mit Fuzzy Search
 */
export function searchIndex(
  userId: number,
  searchTerm: string,
  folderType?: 'private' | 'shared',
  maxDistance: number = 2
): Array<{
  path: string;
  type: 'private' | 'shared';
  name: string;
  matches: Array<{ line: number; text: string; context: string }>;
  relevance: number;
}> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }
  
  const normalizedQuery = searchTerm.toLowerCase().trim();
  const results: Map<number, {
    path: string;
    type: 'private' | 'shared';
    name: string;
    matches: Array<{ line: number; text: string; context: string }>;
    relevance: number;
    lastModified?: string;
  }> = new Map();
  
  // Baue WHERE-Klausel für die Subquery (ohne Alias)
  let subqueryWhereClause = 'user_id = ?';
  const subqueryParams: any[] = [userId];
  
  if (folderType) {
    subqueryWhereClause += ' AND file_type = ?';
    subqueryParams.push(folderType);
  }
  
  // Hole alle Tokens, die dem Suchbegriff ähnlich sind
  const allTokens = db.prepare(`
    SELECT DISTINCT token 
    FROM search_tokens 
    WHERE file_id IN (
      SELECT id FROM search_index WHERE ${subqueryWhereClause}
    )
  `).all(...subqueryParams) as Array<{ token: string }>;
  
  // Finde passende Tokens (exakt oder fuzzy)
  const matchingTokens: string[] = [];
  for (const { token } of allTokens) {
    if (token === normalizedQuery) {
      // Exakter Match - höchste Priorität
      matchingTokens.push(token);
    } else if (token.includes(normalizedQuery) || normalizedQuery.includes(token)) {
      // Teilstring-Match
      matchingTokens.push(token);
    } else {
      // Fuzzy Match
      if (normalizedQuery.length < 3 || token.length < 3) {
        continue;
      }
      const distance = levenshteinDistance(normalizedQuery, token);
      if (distance <= maxDistance) {
        matchingTokens.push(token);
      }
    }
  }

  // Hole alle Dateien mit Token-Matches
  if (matchingTokens.length > 0) {
    const placeholders = matchingTokens.map(() => '?').join(',');
    const fileTypeClause = folderType ? 'AND si.file_type = ?' : '';
    const fileResultParams = [
      userId,
      ...matchingTokens,
      ...(folderType ? [folderType] : [])
    ];

    const fileResults = db.prepare(`
      SELECT DISTINCT 
        si.id,
        si.file_path,
        si.file_type,
        si.file_name,
        si.last_modified,
        st.line_number,
        st.context,
        st.token
      FROM search_index si
      INNER JOIN search_tokens st ON si.id = st.file_id
      WHERE si.user_id = ? 
        AND st.token IN (${placeholders})
        ${fileTypeClause}
      ORDER BY si.id, st.line_number
    `).all(...fileResultParams) as Array<{
      id: number;
      file_path: string;
      file_type: 'private' | 'shared';
      file_name: string;
      last_modified: string;
      line_number: number;
      context: string;
      token: string;
    }>;

    for (const row of fileResults) {
      if (!results.has(row.id)) {
        results.set(row.id, {
          path: row.file_path,
          type: row.file_type,
          name: row.file_name,
          matches: [],
          relevance: 0,
          lastModified: row.last_modified
        });
      }

      const result = results.get(row.id)!;

      const existingMatch = result.matches.find((m) => m.line === row.line_number && m.context === row.context);
      if (!existingMatch) {
        result.matches.push({
          line: row.line_number,
          text: row.context,
          context: row.context
        });
      }

      let relevance = 1;
      if (row.token === normalizedQuery) {
        relevance += 10;
      } else if (row.token.includes(normalizedQuery)) {
        relevance += 6;
      }
      if (row.file_name.toLowerCase().includes(normalizedQuery)) {
        relevance += 5;
      }
      result.relevance += relevance;
    }
  }

  // Ergänze Dateiname-Matches auch ohne Token-Matches.
  const filenameTypeClause = folderType ? 'AND file_type = ?' : '';
  const filenameParams = [
    userId,
    `%${normalizedQuery}%`,
    ...(folderType ? [folderType] : [])
  ];
  const filenameRows = db.prepare(`
    SELECT id, file_path, file_type, file_name, last_modified
    FROM search_index
    WHERE user_id = ?
      AND lower(file_name) LIKE ?
      ${filenameTypeClause}
    ORDER BY datetime(last_modified) DESC
    LIMIT 500
  `).all(...filenameParams) as Array<{
    id: number;
    file_path: string;
    file_type: 'private' | 'shared';
    file_name: string;
    last_modified: string;
  }>;

  for (const row of filenameRows) {
    const existing = results.get(row.id);
    if (!existing) {
      results.set(row.id, {
        path: row.file_path,
        type: row.file_type,
        name: row.file_name,
        matches: [{
          line: 0,
          text: row.file_name,
          context: `Dateiname enthält "${searchTerm}"`
        }],
        relevance: 12,
        lastModified: row.last_modified
      });
      continue;
    }

    existing.relevance += 8;
    if (!existing.matches.some((m) => m.line === 0 && m.context.includes('Dateiname enthält'))) {
      existing.matches.unshift({
        line: 0,
        text: row.file_name,
        context: `Dateiname enthält "${searchTerm}"`
      });
    }
  }

  if (results.size === 0) {
    return [];
  }
  
  // Konvertiere Map zu Array und sortiere nach Relevanz
  const resultArray = Array.from(results.values());
  
  // Filtere Ergebnisse aus ausgeblendeten Ordnern
  const filteredResults = resultArray.filter(result => !isPathInHiddenFolder(result.path));
  
  filteredResults.sort((a, b) => {
    if (b.relevance !== a.relevance) {
      return b.relevance - a.relevance;
    }
    const aTime = a.lastModified ? Date.parse(a.lastModified) : 0;
    const bTime = b.lastModified ? Date.parse(b.lastModified) : 0;
    return bTime - aTime;
  });
  
  return filteredResults.map((entry) => ({
    path: entry.path,
    type: entry.type,
    name: entry.name,
    matches: entry.matches,
    relevance: entry.relevance
  }));
}

/**
 * Aktualisiert den Index für eine Datei (wird bei Änderungen aufgerufen)
 */
export async function updateIndex(
  userId: number,
  filePath: string,
  type: 'private' | 'shared'
): Promise<void> {
  // Einfach neu indexieren (indexFile prüft selbst auf Änderungen)
  await indexFile(userId, filePath, type);
}
 