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
 * PUT /api/settings
 * Aktualisiert Benutzer-Einstellungen
 */
export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { private_folder_path, shared_folder_path, theme, default_export_size, default_bible_translation, show_only_notes } = req.body;

    // Validiere private Pfade
    if (private_folder_path !== undefined && private_folder_path !== null) {
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
        const dir = path.dirname(private_folder_path);
        await fs.mkdir(dir, { recursive: true });
        await fs.access(dir);
      } catch (error: any) {
        res.status(400).json({ error: `Invalid private folder path: ${error.message}` });
        return;
      }
    }

    // Validiere shared Pfade
    if (shared_folder_path !== undefined && shared_folder_path !== null) {
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
        const dir = path.dirname(shared_folder_path);
        await fs.mkdir(dir, { recursive: true });
        await fs.access(dir);
      } catch (error: any) {
        res.status(400).json({ error: `Invalid shared folder path: ${error.message}` });
        return;
      }
    }

    const updated = updateUserSettings(req.user.id, {
      private_folder_path,
      shared_folder_path,
      theme,
      default_export_size,
      default_bible_translation,
      show_only_notes
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
}

