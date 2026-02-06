/**
 * File Service
 * 
 * Verantwortlich für:
 * - Dateisystem-Zugriff
 * - Pfadvalidierung
 * - Datei-Operationen (CRUD)
 */

import fs from 'fs/promises';
import path from 'path';
import db from '../config/database';
import { FileItem } from '../types/file';
import { trackFileOperation } from '../middleware/metrics.middleware';

// Unterstützte Dateiendungen für Indexierung (alle Markdown-Varianten + .txt)
const INDEXABLE_EXTENSIONS = [
  '.md',
  '.markdown',
  '.mdown',
  '.mkd',
  '.mkdn',
  '.mkdown',
  '.mdwn',
  '.mdtxt',
  '.mdtext',
  '.txt'
];

/**
 * Prüft, ob eine Datei indexierbar ist
 */
export function isIndexable(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return INDEXABLE_EXTENSIONS.includes(ext);
}

interface UserSettings {
  id: number;
  user_id: number;
  private_folder_path: string | null;
  shared_folder_path: string | null;
  theme: string;
  default_export_size: string;
  default_bible_translation: string;
  created_at: string;
  updated_at: string;
}

/**
 * Prüft, ob ein Pfad sicher ist (kein Path Traversal)
 */
export function validatePath(filePath: string): boolean {
  // Normalisiere Pfad
  const normalized = path.normalize(filePath);
  
  // Prüfe auf Path Traversal
  if (normalized.includes('..')) {
    return false;
  }
  
  // Prüfe auf absolute Pfade (außer erlaubte)
  if (path.isAbsolute(normalized) && !normalized.startsWith('/')) {
    return false;
  }
  
  // Prüfe auf erlaubte Zeichen
  const allowedPattern = /^[a-zA-Z0-9._\-\s/]+$/;
  if (!allowedPattern.test(normalized)) {
    return false;
  }
  
  return true;
}

/**
 * Ermittelt den Dateityp
 */
export function getFileType(fileName: string): { type: string; isEditable: boolean } {
  const ext = path.extname(fileName).toLowerCase();
  
  const editableTypes = ['.md', '.txt'];
  const viewableTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'];
  
  if (editableTypes.includes(ext)) {
    return { type: ext.slice(1), isEditable: true };
  }
  
  if (viewableTypes.includes(ext)) {
    return { type: ext.slice(1), isEditable: false };
  }
  
  return { type: 'unknown', isEditable: false };
}

/**
 * Holt Benutzer-Einstellungen
 */
export function getUserSettings(userId: number): UserSettings | null {
  const settings = db.prepare(`
    SELECT * FROM user_settings WHERE user_id = ?
  `).get(userId) as UserSettings | undefined;
  
  return settings || null;
}

/**
 * Ermittelt den vollständigen Pfad für einen Benutzer
 */
export function resolveUserPath(
  userId: number,
  filePath: string,
  type: 'private' | 'shared'
): string {
  const settings = getUserSettings(userId);
  
  if (!settings) {
    throw new Error('User settings not found');
  }
  
  let basePath: string;
  
  if (type === 'private') {
    basePath = settings.private_folder_path || (
      process.env.NODE_ENV === 'production' 
        ? `/data/users/${userId}` 
        : `/app/data/users/${userId}`
    );
  } else {
    basePath = settings.shared_folder_path || (
      process.env.NODE_ENV === 'production' 
        ? '/data/shared' 
        : '/app/data/shared'
    );
  }
  
  // Normalisiere Pfad
  // Stelle sicher, dass der Pfad mit / beginnt (relativ zum Base-Pfad)
  let normalized = filePath.replace(/\\/g, '/'); // Windows-Pfade zu Unix-Pfaden
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  // Entferne doppelte Slashes
  normalized = normalized.replace(/\/+/g, '/');
  
  // Entferne führenden Slash für path.join
  const cleanPath = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  
  // Kombiniere Base-Pfad mit Datei-Pfad
  const fullPath = path.join(basePath, cleanPath);
  
  // Debug-Logging (nur in Development)
  if (process.env.NODE_ENV === 'development') {
    console.log('resolveUserPath:', {
      userId,
      filePath,
      basePath,
      normalized,
      cleanPath,
      fullPath
    });
  }
  
  // Prüfe, ob der resultierende Pfad innerhalb des Base-Pfads liegt
  const resolvedBase = path.resolve(basePath);
  const resolvedFull = path.resolve(fullPath);
  
  if (!resolvedFull.startsWith(resolvedBase)) {
    throw new Error('Path traversal detected');
  }
  
  return resolvedFull;
}

/**
 * Prüft Dateisystem-Berechtigungen
 */
export async function checkPermissions(
  filePath: string,
  mode: 'read' | 'write'
): Promise<boolean> {
  try {
    const fsPromises = await import('fs/promises');
    const fsSync = await import('fs');
    const accessMode = mode === 'read' ? fsSync.constants.R_OK : fsSync.constants.W_OK;
    
    await fsPromises.access(filePath, accessMode);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('checkPermissions: OK', { filePath, mode });
    }
    
    return true;
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('checkPermissions: FAILED', { filePath, mode, error: error.message, code: error.code });
    }
    return false;
  }
}

/**
 * Holt die Liste der zu versteckenden Ordner aus der app_config
 */
export function getHiddenFoldersConfig(): string[] {
  try {
    const result = db.prepare('SELECT value FROM app_config WHERE key = ?').get('hidden_folders') as { value: string } | undefined;
    
    if (result?.value) {
      // Parse JSON-Array aus der Datenbank
      return JSON.parse(result.value);
    }
  } catch (error) {
    console.warn('Error reading hidden_folders config:', error);
  }
  
  // Fallback: Standard-Liste
  return [
    '._DAV',
    '.Trashes',
    '@eaDir',
    '#recycle',
    '.DS_Store',
    'Thumbs.db',
    '.git',
    '.svn',
    '.idea',
    '.vscode',
    'node_modules'
  ];
}

/**
 * Prüft, ob ein Ordner ausgeblendet werden soll
 */
function shouldHideFolder(folderName: string): boolean {
  // Hole Liste der zu versteckenden Ordner aus app_config
  const hiddenFoldersConfig = getHiddenFoldersConfig();
  
  // Prüfe, ob der Ordner in der Liste ist (case-insensitive)
  const normalizedName = folderName.toLowerCase();
  return hiddenFoldersConfig.some(hidden => 
    normalizedName === hidden.toLowerCase() || 
    normalizedName.startsWith(hidden.toLowerCase() + '.') ||
    normalizedName.startsWith('.' + hidden.toLowerCase())
  );
}

/**
 * Prüft, ob ein Dateipfad in einem ausgeblendeten Ordner liegt
 */
export function isPathInHiddenFolder(filePath: string): boolean {
  const hiddenFoldersConfig = getHiddenFoldersConfig();
  
  // Normalisiere Pfad (verwende / als Trennzeichen)
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Teile Pfad in Segmente
  const pathSegments = normalizedPath.split('/').filter(segment => segment.length > 0);
  
  // Prüfe jedes Segment, ob es einem ausgeblendeten Ordner entspricht
  for (const segment of pathSegments) {
    const normalizedSegment = segment.toLowerCase();
    if (hiddenFoldersConfig.some(hidden => {
      const normalizedHidden = hidden.toLowerCase();
      return normalizedSegment === normalizedHidden || 
             normalizedSegment.startsWith(normalizedHidden + '.') ||
             normalizedSegment.startsWith('.' + normalizedHidden);
    })) {
      return true;
    }
  }
  
  return false;
}

/**
 * Listet Verzeichnis-Inhalt auf
 */
export async function listDirectory(
  userId: number,
  dirPath: string,
  type: 'private' | 'shared'
): Promise<FileItem[]> {
  const fullPath = resolveUserPath(userId, dirPath, type);
  
  // Prüfe, ob Verzeichnis existiert
  try {
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Verzeichnis existiert nicht -> erstelle es
      await fs.mkdir(fullPath, { recursive: true });
      return [];
    }
    throw error;
  }
  
  // Prüfe Berechtigungen
  const canRead = await checkPermissions(fullPath, 'read');
  if (!canRead) {
    return [];
  }
  
  // Liste Dateien auf
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  
  const items: FileItem[] = [];
  
  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name);
    const relativePath = path.join(dirPath, entry.name);
    
    // Filtere ausgeblendete Ordner
    if (entry.isDirectory() && shouldHideFolder(entry.name)) {
      continue;
    }
    
    try {
      const stats = await fs.stat(entryPath);
      const fileType = entry.isFile() ? getFileType(entry.name) : null;
      
      const canReadItem = await checkPermissions(entryPath, 'read');
      const canWriteItem = await checkPermissions(entryPath, 'write');
      
      // Normalisiere relativen Pfad (verwende / statt \ für Konsistenz)
      // Stelle sicher, dass der Pfad mit / beginnt
      let normalizedRelativePath = relativePath.replace(/\\/g, '/');
      if (!normalizedRelativePath.startsWith('/')) {
        normalizedRelativePath = '/' + normalizedRelativePath;
      }
      // Entferne doppelte Slashes
      normalizedRelativePath = normalizedRelativePath.replace(/\/+/g, '/');
      
      items.push({
        name: entry.name,
        path: normalizedRelativePath,
        type: entry.isDirectory() ? 'folder' : 'file',
        size: entry.isFile() ? stats.size : undefined,
        lastModified: stats.mtime.toISOString(),
        fileType: fileType?.type,
        isEditable: fileType?.isEditable || false,
        canRead: canReadItem,
        canWrite: canWriteItem
      });
    } catch (error) {
      // Überspringe Dateien, auf die kein Zugriff besteht
      continue;
    }
  }
  
  // Sortiere: Ordner zuerst, dann alphabetisch
  items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  
  return items;
}

/**
 * Liest Datei-Inhalt
 */
export async function readFile(
  userId: number,
  filePath: string,
  type: 'private' | 'shared'
): Promise<string> {
  const fullPath = resolveUserPath(userId, filePath, type);
  
  // Debug-Logging (nur in Development)
  if (process.env.NODE_ENV === 'development') {
    try {
      const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);
      console.log('readFile:', {
        userId,
        filePath,
        type,
        fullPath,
        fileExists
      });
    } catch (e) {
      // Ignore
    }
  }
  
  // Prüfe, ob Datei existiert
  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      throw new Error('Path is a directory, not a file');
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('File not found:', { userId, filePath, type, fullPath });
      throw new Error('File not found');
    }
    throw error;
  }
  
  // Prüfe Berechtigungen
  const canRead = await checkPermissions(fullPath, 'read');
  if (!canRead) {
    console.error('No read permission:', { userId, filePath, type, fullPath });
    throw new Error('No read permission');
  }
  
  // Lese Datei
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    console.log('File read successfully:', { userId, filePath, contentLength: content.length });
    
    // Metrics-Tracking
    trackFileOperation('read', type);
    
    return content;
  } catch (error: any) {
    console.error('Error reading file:', { userId, filePath, type, fullPath, error: error.message, code: error.code });
    throw error;
  }
}

/**
 * Erstellt eine neue Datei
 */
export async function createFile(
  userId: number,
  filePath: string,
  content: string,
  type: 'private' | 'shared'
): Promise<void> {
  const fullPath = resolveUserPath(userId, filePath, type);
  
  // Prüfe, ob Datei bereits existiert
  try {
    await fs.access(fullPath);
    throw new Error('File already exists');
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  
  // Erstelle Verzeichnis, falls nötig
  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });
  
  // Prüfe Schreib-Berechtigung
  const canWrite = await checkPermissions(dir, 'write');
  if (!canWrite) {
    throw new Error('No write permission');
  }
  
  // Erstelle Datei
  await fs.writeFile(fullPath, content, 'utf-8');
  
  // Metrics-Tracking
  trackFileOperation('create', type);
  
  // Index aktualisieren (asynchron, blockiert nicht)
  if (isIndexable(filePath)) {
    import('./index.service').then(({ indexFile }) => {
      indexFile(userId, filePath, type).catch((error) => {
        console.warn(`Failed to index file after create: ${filePath}`, error);
      });
    });
  }
}

/**
 * Aktualisiert eine Datei
 */
export async function updateFile(
  userId: number,
  filePath: string,
  content: string,
  type: 'private' | 'shared'
): Promise<void> {
  const fullPath = resolveUserPath(userId, filePath, type);
  
  // Prüfe, ob Datei existiert
  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      throw new Error('Path is a directory, not a file');
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('File not found');
    }
    throw error;
  }
  
  // Prüfe Schreib-Berechtigung
  const canWrite = await checkPermissions(fullPath, 'write');
  if (!canWrite) {
    throw new Error('No write permission');
  }
  
  // Aktualisiere Datei
  await fs.writeFile(fullPath, content, 'utf-8');
  
  // Metrics-Tracking
  trackFileOperation('update', type);
  
  // Index aktualisieren (asynchron, blockiert nicht)
  if (isIndexable(filePath)) {
    import('./index.service').then(({ updateIndex }) => {
      updateIndex(userId, filePath, type).catch((error) => {
        console.warn(`Failed to update index after file update: ${filePath}`, error);
      });
    });
  }
}

/**
 * Löscht eine Datei oder einen Ordner
 */
export async function deleteFile(
  userId: number,
  filePath: string,
  type: 'private' | 'shared'
): Promise<void> {
  const fullPath = resolveUserPath(userId, filePath, type);
  
  // Prüfe, ob Datei/Ordner existiert
  let stats;
  try {
    stats = await fs.stat(fullPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('File or folder not found');
    }
    throw error;
  }
  
  // Prüfe Schreib-Berechtigung
  const canWrite = await checkPermissions(fullPath, 'write');
  if (!canWrite) {
    throw new Error('No write permission');
  }
  
  // Lösche Datei oder Ordner
  if (stats.isDirectory()) {
    await fs.rmdir(fullPath, { recursive: true });
  } else {
    await fs.unlink(fullPath);
    
    // Index aktualisieren (asynchron, blockiert nicht)
    if (isIndexable(filePath)) {
      import('./index.service').then(({ removeFromIndex }) => {
        removeFromIndex(userId, filePath, type).catch((error) => {
          console.warn(`Failed to remove from index after delete: ${filePath}`, error);
        });
      });
    }
  }
  
  // Metrics-Tracking
  trackFileOperation('delete', type);
}

/**
 * Erstellt einen neuen Ordner
 */
export async function createFolder(
  userId: number,
  folderPath: string,
  type: 'private' | 'shared'
): Promise<void> {
  const fullPath = resolveUserPath(userId, folderPath, type);
  
  // Prüfe, ob Ordner bereits existiert
  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      throw new Error('Folder already exists');
    }
    throw new Error('Path already exists and is not a directory');
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  
  // Prüfe Schreib-Berechtigung im Parent-Verzeichnis
  const parentDir = path.dirname(fullPath);
  const canWrite = await checkPermissions(parentDir, 'write');
  if (!canWrite) {
    throw new Error('No write permission');
  }
  
  // Erstelle Ordner
  await fs.mkdir(fullPath, { recursive: true });
}

/**
 * Verschiebt oder benennt eine Datei/Ordner um
 */
export async function moveFile(
  userId: number,
  from: string,
  to: string,
  fromType: 'private' | 'shared',
  toType: 'private' | 'shared'
): Promise<void> {
  const fromPath = resolveUserPath(userId, from, fromType);
  const toPath = resolveUserPath(userId, to, toType);
  
  // Prüfe, ob Quelle existiert
  try {
    await fs.access(fromPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('Source file or folder not found');
    }
    throw error;
  }
  
  // Prüfe, ob Ziel bereits existiert
  try {
    await fs.access(toPath);
    throw new Error('Destination already exists');
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  
  // Prüfe Berechtigungen
  const canWriteFrom = await checkPermissions(fromPath, 'write');
  const canWriteTo = await checkPermissions(path.dirname(toPath), 'write');
  
  if (!canWriteFrom || !canWriteTo) {
    throw new Error('No write permission');
  }
  
  // Verschiebe Datei/Ordner
  await fs.rename(fromPath, toPath);
  
  // Index aktualisieren (asynchron, blockiert nicht)
  // Prüfe, ob es eine Datei war (nicht Ordner)
  try {
    const toStats = await fs.stat(toPath);
    if (!toStats.isDirectory() && isIndexable(to)) {
      // Entferne alten Eintrag
      import('./index.service').then(({ removeFromIndex, indexFile }) => {
        removeFromIndex(userId, from, fromType).catch((error) => {
          console.warn(`Failed to remove old index entry after move: ${from}`, error);
        });
        // Füge neuen Eintrag hinzu
        indexFile(userId, to, toType).catch((error) => {
          console.warn(`Failed to index file after move: ${to}`, error);
        });
      });
    }
  } catch (error) {
    // Ignoriere Fehler beim Stat-Check
  }
}

