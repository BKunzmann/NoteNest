/**
 * Settings Controller
 * 
 * Handles HTTP-Requests für Benutzer-Einstellungen
 */

import { Request, Response } from 'express';
import { getUserSettings, updateUserSettings } from '../services/settings.service';
import fs from 'fs/promises';
import path from 'path';
import db from '../config/database';
import { IS_NAS_MODE } from '../config/constants';
import { resolveUserPath } from '../services/file.service';
import {
  getNasHomesRootPath,
  getSharedRootPathForDeployment,
  getStandaloneUsersRootPath
} from '../utils/storageRoots';

/**
 * Validiert, ob ein Pfad für den Benutzer erlaubt ist
 * @param userId - Benutzer-ID
 * @param username - Benutzername
 * @param requestedPath - Der angeforderte Pfad
 * @param pathType - 'private' oder 'shared'
 */
function isPathAllowedForUser(
  userId: number,
  username: string,
  requestedPath: string,
  pathType: 'private' | 'shared'
): { allowed: boolean; error?: string } {
  // Normalisiere den Pfad
  const normalizedPath = path.normalize(requestedPath).replace(/\\/g, '/');
  
  // Verhindere Path Traversal
  if (normalizedPath.includes('..')) {
    return { allowed: false, error: 'Path traversal not allowed' };
  }

  if (pathType === 'private') {
    // Für private Pfade: Nur der eigene Benutzer-Ordner ist erlaubt
    const nasHomesPath = getNasHomesRootPath();
    const defaultUsersPath = getStandaloneUsersRootPath();
    
    // Erlaubte Basis-Pfade für den Benutzer
    const allowedBasePaths = [
      path.join(nasHomesPath, username),
      path.join(defaultUsersPath, username),
      // Fallback für user-id basierte Pfade
      path.join(defaultUsersPath, String(userId)),
    ];
    
    // Prüfe, ob der angeforderte Pfad innerhalb eines erlaubten Pfades liegt
    const isAllowed = allowedBasePaths.some(basePath => {
      const resolvedRequested = path.resolve(normalizedPath);
      const resolvedBase = path.resolve(basePath);
      return resolvedRequested.startsWith(resolvedBase) || resolvedRequested === resolvedBase;
    });
    
    if (!isAllowed) {
      return { 
        allowed: false, 
        error: `Zugriff verweigert: Sie können nur auf Ihren eigenen privaten Ordner zugreifen (${username})` 
      };
    }
  } else if (pathType === 'shared') {
    // Für shared Pfade: Nur zugewiesene Shared-Ordner sind erlaubt
    const nasSharedPath = getSharedRootPathForDeployment();
    
    // Prüfe, ob der Pfad im Shared-Bereich liegt
    const resolvedRequested = path.resolve(normalizedPath);
    const resolvedSharedBase = path.resolve(nasSharedPath);
    
    if (
      resolvedRequested !== resolvedSharedBase &&
      !resolvedRequested.startsWith(`${resolvedSharedBase}${path.sep}`)
    ) {
      return { 
        allowed: false, 
        error: 'Zugriff verweigert: Der Pfad muss im Shared-Bereich liegen' 
      };
    }
    
    // Im NAS-Mode: Prüfe, ob der Benutzer Zugriff auf diesen Shared-Ordner hat
    if (IS_NAS_MODE) {
      const assignments = getUserSharedAssignments(userId, resolvedSharedBase);
      if (assignments.length === 0) {
        return {
          allowed: false,
          error: 'Zugriff verweigert: Es wurden noch keine Shared-Ordner für Sie freigegeben'
        };
      }

      const relativePath = resolvedRequested
        .replace(resolvedSharedBase, '')
        .replace(/^\/+/, '')
        .replace(/\\/g, '/');

      if (relativePath) {
        const hasAccess = assignments.some((assignment) => (
          relativePath === assignment || relativePath.startsWith(`${assignment}/`)
        ));

        if (!hasAccess) {
          const folderName = relativePath.split('/')[0];
          return {
            allowed: false,
            error: `Zugriff verweigert: Sie haben keinen Zugriff auf den Shared-Ordner "${folderName}"`
          };
        }
      }
    }
  }

  return { allowed: true };
}

/**
 * Normalisiert einen relativen Ordnerpfad für Notizablage.
 * Erlaubte Beispiele: "/", "/predigten", "predigten/2026"
 */
function normalizeRelativeFolderPath(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (!trimmed) {
    return '/';
  }

  // Windows-Trennzeichen vereinheitlichen und Normalisierung ohne Base-Pfad
  let normalized = path.posix.normalize(trimmed.replace(/\\/g, '/'));
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // Path Traversal verhindern
  if (normalized.includes('..')) {
    throw new Error('Ungültiger Standardordner: Path Traversal ist nicht erlaubt');
  }

  // Doppel-Slashes entfernen und Root sicherstellen
  normalized = normalized.replace(/\/+/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = '/';
  }

  return normalized;
}

function normalizeAbsolutePath(inputPath: string): string {
  return path.resolve(inputPath).replace(/\\/g, '/');
}

function normalizeSharedAssignmentPath(folderPath: string, sharedBase: string): string | null {
  const trimmed = folderPath.trim();
  if (!trimmed) {
    return null;
  }

  const resolvedBase = path.resolve(sharedBase);
  const resolvedCandidate = path.resolve(trimmed);
  let relativeCandidate: string;

  if (resolvedCandidate === resolvedBase || resolvedCandidate.startsWith(`${resolvedBase}${path.sep}`)) {
    relativeCandidate = path.relative(resolvedBase, resolvedCandidate);
  } else {
    relativeCandidate = trimmed;
  }

  const normalized = relativeCandidate
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim();

  if (!normalized || normalized === '.' || normalized.includes('..')) {
    return null;
  }

  return normalized;
}

function getUserSharedAssignments(userId: number, sharedBase: string): string[] {
  const rows = db.prepare(`
    SELECT folder_path FROM user_shared_folders WHERE user_id = ?
  `).all(userId) as { folder_path: string }[];

  const unique = new Set<string>();
  for (const row of rows) {
    const normalized = normalizeSharedAssignmentPath(row.folder_path, sharedBase);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
}

function getPrivatePathCandidates(userId: number, username: string): Array<{ path: string; label: string }> {
  const nasHomesPath = getNasHomesRootPath();
  const defaultUsersPath = getStandaloneUsersRootPath();

  return [
    { path: path.join(nasHomesPath, username), label: 'NAS Home-Verzeichnis' },
    { path: path.join(defaultUsersPath, username), label: 'Standard-Benutzerordner (Username)' },
    { path: path.join(defaultUsersPath, String(userId)), label: 'Standard-Benutzerordner (User-ID)' }
  ].map((option) => ({
    path: normalizeAbsolutePath(option.path),
    label: option.label
  }));
}

function getSharedPathCandidates(userId: number): Array<{ path: string; label: string }> {
  const sharedBase = normalizeAbsolutePath(getSharedRootPathForDeployment());

  if (IS_NAS_MODE) {
    const assignments = getUserSharedAssignments(userId, sharedBase);
    return assignments.map((assignment) => ({
      path: normalizeAbsolutePath(path.join(sharedBase, assignment)),
      label: `Freigegebener NAS-Ordner (${assignment})`
    }));
  }

  return [{ path: sharedBase, label: 'Shared-Basisordner' }];
}

/**
 * GET /api/settings
 * Gibt aktuelle Benutzer-Einstellungen zurück
 */
export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const settings = getUserSettings(req.user.id);
    
    if (!settings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    const sharedBase = normalizeAbsolutePath(getSharedRootPathForDeployment());
    const sharedAssignments = getUserSharedAssignments(req.user.id, sharedBase);
    const sharedFolderCount = sharedAssignments.length;
    const hasSharedAccess = IS_NAS_MODE
      ? sharedFolderCount > 0
      : Boolean(settings.shared_folder_path);

    res.json({
      ...settings,
      has_shared_access: hasSharedAccess,
      shared_folder_count: sharedFolderCount
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
}

/**
 * GET /api/settings/path-options
 * Liefert sichere Pfadoptionen für Dropdown-Auswahl in den Einstellungen.
 */
export async function getSettingsPathOptions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const settings = getUserSettings(req.user.id);
    const privateCandidates = getPrivatePathCandidates(req.user.id, req.user.username);
    const sharedCandidates = getSharedPathCandidates(req.user.id);

    const dedupe = (items: Array<{ path: string; label: string }>) => {
      const unique = new Map<string, { path: string; label: string }>();
      for (const item of items) {
        if (!unique.has(item.path)) {
          unique.set(item.path, item);
        }
      }
      return Array.from(unique.values());
    };

    const privatePaths = dedupe([
      ...(settings?.private_folder_path
        ? [{ path: normalizeAbsolutePath(settings.private_folder_path), label: 'Aktuell konfiguriert' }]
        : []),
      ...privateCandidates
    ]);

    const sharedPaths = dedupe([
      ...(settings?.shared_folder_path
        ? [{ path: normalizeAbsolutePath(settings.shared_folder_path), label: 'Aktuell konfiguriert' }]
        : []),
      ...sharedCandidates
    ]);

    res.json({ privatePaths, sharedPaths });
  } catch (error: any) {
    console.error('Get settings path options error:', error);
    res.status(500).json({ error: error.message || 'Failed to get settings path options' });
  }
}

/**
 * PUT /api/settings
 * Aktualisiert Benutzer-Einstellungen
 */
export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      private_folder_path,
      shared_folder_path,
      theme,
      default_export_size,
      default_bible_translation,
      show_only_notes,
      non_editable_files_mode,
      default_note_type,
      default_note_folder_path,
      sidebar_view_mode
    } = req.body;

    const existingSettings = getUserSettings(req.user.id);
    if (!existingSettings) {
      res.status(404).json({ error: 'Settings not found' });
      return;
    }

    // Validiere private Pfade
    if (private_folder_path !== undefined && private_folder_path !== null) {
      if (typeof private_folder_path !== 'string') {
        res.status(400).json({ error: 'private_folder_path must be a string' });
        return;
      }
      // Sicherheitsprüfung: Ist der Pfad für diesen Benutzer erlaubt?
      const pathCheck = isPathAllowedForUser(
        req.user.id, 
        req.user.username, 
        private_folder_path, 
        'private'
      );
      
      if (!pathCheck.allowed) {
        res.status(403).json({ error: pathCheck.error });
        return;
      }

      try {
        // Prüfe, ob Pfad existiert oder erstellt werden kann
        await fs.mkdir(private_folder_path, { recursive: true });
        await fs.access(private_folder_path);
      } catch (error: any) {
        res.status(400).json({ error: `Invalid private folder path: ${error.message}` });
        return;
      }
    }

    // Validiere shared Pfade
    if (shared_folder_path !== undefined && shared_folder_path !== null) {
      if (typeof shared_folder_path !== 'string') {
        res.status(400).json({ error: 'shared_folder_path must be a string' });
        return;
      }
      // Sicherheitsprüfung: Ist der Pfad für diesen Benutzer erlaubt?
      const pathCheck = isPathAllowedForUser(
        req.user.id, 
        req.user.username, 
        shared_folder_path, 
        'shared'
      );
      
      if (!pathCheck.allowed) {
        res.status(403).json({ error: pathCheck.error });
        return;
      }

      try {
        await fs.mkdir(shared_folder_path, { recursive: true });
        await fs.access(shared_folder_path);
      } catch (error: any) {
        res.status(400).json({ error: `Invalid shared folder path: ${error.message}` });
        return;
      }
    }

    // Validiere default_note_type
    if (
      default_note_type !== undefined &&
      default_note_type !== 'private' &&
      default_note_type !== 'shared'
    ) {
      res.status(400).json({ error: 'Invalid default_note_type (allowed: private, shared)' });
      return;
    }

    // Validiere sidebar_view_mode
    if (
      sidebar_view_mode !== undefined &&
      sidebar_view_mode !== 'recent' &&
      sidebar_view_mode !== 'folders'
    ) {
      res.status(400).json({ error: 'Invalid sidebar_view_mode (allowed: recent, folders)' });
      return;
    }

    if (default_bible_translation !== undefined) {
      if (typeof default_bible_translation !== 'string') {
        res.status(400).json({ error: 'default_bible_translation must be a string' });
        return;
      }

      const localAndGenericTranslations = new Set([
        'LUT',
        'ELB',
        'SCH',
        'LUT1912',
        'LUT1545',
        'ELB1905',
        'SCH1951'
      ]);

      try {
        const { getAPITranslations } = await import('../services/bibleApi.service');
        for (const translation of getAPITranslations()) {
          localAndGenericTranslations.add(translation);
        }
      } catch (error) {
        // API-Übersetzungen optional: Lokale/Gewohnte Codes bleiben erlaubt.
      }

      if (!localAndGenericTranslations.has(default_bible_translation)) {
        res.status(400).json({
          error: `Ungültige Bibel-Übersetzung. Erlaubt: ${Array.from(localAndGenericTranslations).join(', ')}`
        });
        return;
      }
    }

    if (
      non_editable_files_mode !== undefined &&
      non_editable_files_mode !== 'gray' &&
      non_editable_files_mode !== 'hide'
    ) {
      res.status(400).json({ error: 'Invalid non_editable_files_mode (allowed: gray, hide)' });
      return;
    }

    // Normalisiere/validiere default_note_folder_path
    let normalizedDefaultFolderPath: string | undefined;
    if (default_note_folder_path !== undefined) {
      if (typeof default_note_folder_path !== 'string') {
        res.status(400).json({ error: 'default_note_folder_path must be a string' });
        return;
      }

      try {
        normalizedDefaultFolderPath = normalizeRelativeFolderPath(default_note_folder_path);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Invalid default_note_folder_path' });
        return;
      }
    }

    // Stelle sicher, dass der Standardordner existiert und für den Benutzer auflösbar ist
    const finalDefaultType = (default_note_type ??
      existingSettings.default_note_type ??
      'private') as 'private' | 'shared';
    const finalDefaultFolderPath = normalizedDefaultFolderPath ??
      existingSettings.default_note_folder_path ??
      '/';

    try {
      const resolvedDefaultFolderPath = resolveUserPath(
        req.user.id,
        finalDefaultFolderPath,
        finalDefaultType
      );
      await fs.mkdir(resolvedDefaultFolderPath, { recursive: true });
      await fs.access(resolvedDefaultFolderPath);
    } catch (error: any) {
      res.status(400).json({
        error: `Invalid default note folder (${finalDefaultType}:${finalDefaultFolderPath}): ${error.message}`
      });
      return;
    }

    const updated = updateUserSettings(req.user.id, {
      private_folder_path,
      shared_folder_path,
      default_note_type,
      default_note_folder_path: normalizedDefaultFolderPath,
      sidebar_view_mode,
      theme,
      default_export_size,
      default_bible_translation,
      show_only_notes,
      non_editable_files_mode
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
}

