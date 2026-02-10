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
    const nasHomesPath = process.env.NAS_HOMES_PATH || '/data/homes';
    const defaultUsersPath = process.env.NODE_ENV === 'production' 
      ? '/data/users' 
      : '/app/data/users';
    
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
    const nasSharedPath = process.env.NAS_SHARED_PATH || (
      process.env.NODE_ENV === 'production' ? '/data/shared' : '/app/data/shared'
    );
    
    // Prüfe, ob der Pfad im Shared-Bereich liegt
    const resolvedRequested = path.resolve(normalizedPath);
    const resolvedSharedBase = path.resolve(nasSharedPath);
    
    if (!resolvedRequested.startsWith(resolvedSharedBase)) {
      return { 
        allowed: false, 
        error: 'Zugriff verweigert: Der Pfad muss im Shared-Bereich liegen' 
      };
    }
    
    // Im NAS-Mode: Prüfe, ob der Benutzer Zugriff auf diesen Shared-Ordner hat
    if (IS_NAS_MODE) {
      const userSharedFolders = db.prepare(`
        SELECT folder_path FROM user_shared_folders WHERE user_id = ?
      `).all(userId) as { folder_path: string }[];
      
      // Extrahiere den Ordnernamen aus dem Pfad
      const relativePath = resolvedRequested.replace(resolvedSharedBase, '').replace(/^\/+/, '');
      const folderName = relativePath.split('/')[0];
      
      if (folderName && userSharedFolders.length > 0) {
        const hasAccess = userSharedFolders.some(folder => 
          folder.folder_path === folderName || folder.folder_path === relativePath
        );
        
        if (!hasAccess) {
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

function getPrivatePathCandidates(userId: number, username: string): Array<{ path: string; label: string }> {
  const nasHomesPath = process.env.NAS_HOMES_PATH || '/data/homes';
  const defaultUsersPath = process.env.NODE_ENV === 'production'
    ? '/data/users'
    : '/app/data/users';

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
  const sharedBase = process.env.NAS_SHARED_PATH || (
    process.env.NODE_ENV === 'production' ? '/data/shared' : '/app/data/shared'
  );

  const options: Array<{ path: string; label: string }> = [
    { path: normalizeAbsolutePath(sharedBase), label: 'Shared-Basisordner' }
  ];

  if (IS_NAS_MODE) {
    const userSharedFolders = db.prepare(`
      SELECT folder_path FROM user_shared_folders WHERE user_id = ?
    `).all(userId) as { folder_path: string }[];

    for (const folder of userSharedFolders) {
      options.push({
        path: normalizeAbsolutePath(path.join(sharedBase, folder.folder_path)),
        label: `Freigegebener NAS-Ordner (${folder.folder_path})`
      });
    }
  }

  return options;
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

    res.json(settings);
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

