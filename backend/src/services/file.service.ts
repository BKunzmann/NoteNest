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
import { IS_NAS_MODE } from '../config/constants';
import { FileItem } from '../types/file';
import { trackFileOperation } from '../middleware/metrics.middleware';
import {
  getDefaultPrivateRoot,
  getDefaultSharedRoot,
  isPathWithinRoot,
  resolvePathWithinRoot
} from '../utils/pathAccess';

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

function getUsernameById(userId: number): string {
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as { username: string } | undefined;
  if (!user) {
    throw new Error('User not found');
  }
  return user.username;
}

function normalizeVirtualPath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  normalized = normalized.replace(/\/+/g, '/');
  return normalized;
}

function getSafePrivateBasePath(userId: number, settings: UserSettings): string {
  const username = getUsernameById(userId);
  const privateRoot = getDefaultPrivateRoot(username);

  if (settings.private_folder_path) {
    try {
      return resolvePathWithinRoot(settings.private_folder_path, privateRoot);
    } catch (error) {
      console.warn('Invalid private folder path detected, falling back to user root:', {
        userId,
        username,
        private_folder_path: settings.private_folder_path
      });
    }
  }

  return privateRoot;
}

function getSharedRoots(userId: number, settings: UserSettings): string[] {
  if (IS_NAS_MODE) {
    const rows = db.prepare(`
      SELECT folder_path
      FROM user_shared_folders
      WHERE user_id = ?
      ORDER BY folder_path
    `).all(userId) as Array<{ folder_path: string }>;

    return rows.map(row => path.resolve(row.folder_path));
  }

  const sharedRoot = getDefaultSharedRoot();
  if (settings.shared_folder_path) {
    try {
      return [resolvePathWithinRoot(settings.shared_folder_path, sharedRoot)];
    } catch (error) {
      console.warn('Invalid shared folder path detected, falling back to default shared root:', {
        userId,
        shared_folder_path: settings.shared_folder_path
      });
    }
  }

  return [sharedRoot];
}

function resolveSharedPath(userId: number, filePath: string, settings: UserSettings): string {
  const sharedRoots = getSharedRoots(userId, settings);
  if (sharedRoots.length === 0) {
    throw new Error('Shared folder access denied');
  }

  const normalized = normalizeVirtualPath(filePath);
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length === 0) {
    throw new Error('Shared folder access denied');
  }

  const rootName = segments[0];
  const matchingRoot = sharedRoots.find(root => path.basename(root) === rootName);

  if (matchingRoot) {
    const remaining = segments.slice(1).join('/');
    const fullPath = path.join(matchingRoot, remaining);

    if (!isPathWithinRoot(fullPath, matchingRoot)) {
      throw new Error('Path traversal detected');
    }

    return fullPath;
  }

  for (const root of sharedRoots) {
    try {
      return resolvePathWithinRoot(filePath, root);
    } catch {
      // ignore, try next root
    }
  }

  throw new Error('Shared folder access denied');
}

async function listSharedRootItems(userId: number, settings: UserSettings): Promise<FileItem[]> {
  const sharedRoots = getSharedRoots(userId, settings);
  if (sharedRoots.length === 0) {
    return [];
  }

  const items: FileItem[] = [];

  for (const root of sharedRoots) {
    try {
      const stats = await fs.stat(root);
      if (!stats.isDirectory()) {
        continue;
      }

      const name = path.basename(root);
      const canReadItem = await checkPermissions(root, 'read');
      const canWriteItem = await checkPermissions(root, 'write');

      items.push({
        name,
        path: `/${name}`,
        type: 'folder',
        lastModified: stats.mtime.toISOString(),
        isEditable: false,
        canRead: canReadItem,
        canWrite: canWriteItem
      });
    } catch (error) {
      continue;
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
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

  if (type === 'private') {
    const basePath = getSafePrivateBasePath(userId, settings);
    const normalized = normalizeVirtualPath(filePath);
    const cleanPath = normalized.startsWith('/') ? normalized.slice(1) : normalized;
    const fullPath = path.join(basePath, cleanPath);

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

    if (!isPathWithinRoot(fullPath, basePath)) {
      throw new Error('Path traversal detected');
    }

    return path.resolve(fullPath);
  }

  return resolveSharedPath(userId, filePath, settings);
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
 * Listet Verzeichnis-Inhalt auf
 */
export async function listDirectory(
  userId: number,
  dirPath: string,
  type: 'private' | 'shared'
): Promise<FileItem[]> {
  const settings = getUserSettings(userId);
  if (!settings) {
    throw new Error('User settings not found');
  }

  const normalizedDirPath = normalizeVirtualPath(dirPath);
  if (type === 'shared' && normalizedDirPath === '/') {
    return await listSharedRootItems(userId, settings);
  }

  const fullPath = type === 'shared'
    ? resolveSharedPath(userId, dirPath, settings)
    : resolveUserPath(userId, dirPath, type);
  
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
}

