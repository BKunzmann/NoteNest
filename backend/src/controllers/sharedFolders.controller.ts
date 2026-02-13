/**
 * Shared-Ordner-Controller
 * 
 * Verwaltet Shared-Ordner-Zuweisungen für Benutzer (NAS-Mode)
 */

import { Request, Response } from 'express';
import path from 'path';
import db from '../config/database';
import { IS_NAS_MODE } from '../config/constants';
import { 
  listAvailableSharedFolders, 
  validateNasSharedPath 
} from '../utils/nasPathValidator';

function getSharedBasePath(): string {
  return path.resolve(process.env.NAS_SHARED_PATH || '/data/shared');
}

function normalizeSharedFolderAssignment(absolutePath: string): string | null {
  const sharedBasePath = getSharedBasePath();
  const resolvedTarget = path.resolve(absolutePath);

  if (
    resolvedTarget !== sharedBasePath &&
    !resolvedTarget.startsWith(`${sharedBasePath}${path.sep}`)
  ) {
    return null;
  }

  const relative = path.relative(sharedBasePath, resolvedTarget)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim();

  if (!relative || relative === '.' || relative.includes('..')) {
    return null;
  }

  return relative;
}

/**
 * GET /api/admin/shared-folders
 * Listet verfügbare Shared-Ordner auf
 */
export async function getAvailableSharedFolders(_req: Request, res: Response): Promise<void> {
  try {
    const result = listAvailableSharedFolders();
    
    // Bei Fehler nur loggen, aber trotzdem antworten (leere Liste)
    if (result.error) {
      console.warn('Warning listing shared folders:', result.error);
    }

    res.json({ folders: result.folders || [], nasMode: IS_NAS_MODE });
  } catch (error) {
    console.error('Error listing shared folders:', error);
    res.status(500).json({ error: 'Failed to list shared folders', folders: [] });
  }
}

/**
 * POST /api/admin/users/:id/shared-folders
 * Fügt einen Shared-Ordner für einen Benutzer hinzu
 */
export async function grantSharedFolderAccess(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    const { folderPath } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (!folderPath) {
      res.status(400).json({ error: 'Folder path is required' });
      return;
    }

    // Validiere Pfad
    const validation = validateNasSharedPath(folderPath);
    if (!validation.valid) {
      res.status(400).json({ 
        error: 'Invalid folder path',
        message: validation.error 
      });
      return;
    }

    // Prüfe, ob User existiert
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const normalizedFolderPath = normalizeSharedFolderAssignment(validation.path);
    if (!normalizedFolderPath) {
      res.status(400).json({
        error: 'Invalid folder path',
        message: 'Shared-Ordner muss innerhalb von NAS_SHARED_PATH liegen und darf nicht der Basisordner selbst sein'
      });
      return;
    }

    // Füge Shared-Ordner hinzu (oder update)
    db.prepare(`
      INSERT INTO user_shared_folders (user_id, folder_path)
      VALUES (?, ?)
      ON CONFLICT(user_id, folder_path) DO NOTHING
    `).run(userId, normalizedFolderPath);

    // Stelle sicher, dass der gemeinsame Root-Pfad in den User-Settings hinterlegt ist.
    db.prepare(`
      UPDATE user_settings
      SET shared_folder_path = COALESCE(shared_folder_path, ?)
      WHERE user_id = ?
    `).run(getSharedBasePath(), userId);

    res.json({ 
      message: 'Shared folder access granted',
      path: normalizedFolderPath
    });
  } catch (error) {
    console.error('Error granting shared folder access:', error);
    res.status(500).json({ error: 'Failed to grant access' });
  }
}

/**
 * DELETE /api/admin/users/:id/shared-folders/:folderId
 * Entfernt Shared-Ordner-Zugriff für einen Benutzer
 */
export async function revokeSharedFolderAccess(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    const folderId = parseInt(req.params.folderId, 10);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (isNaN(folderId)) {
      res.status(400).json({ error: 'Invalid folder ID' });
      return;
    }

    // Entferne Zugriff per ID
    const result = db.prepare(`
      DELETE FROM user_shared_folders
      WHERE id = ? AND user_id = ?
    `).run(folderId, userId);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Access not found' });
      return;
    }

    res.json({ message: 'Shared folder access revoked' });
  } catch (error) {
    console.error('Error revoking shared folder access:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
}

/**
 * GET /api/admin/users/:id/shared-folders
 * Listet Shared-Ordner eines Benutzers auf
 */
export async function getUserSharedFolders(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const folders = db.prepare(`
      SELECT id, user_id, folder_path, created_at
      FROM user_shared_folders
      WHERE user_id = ?
      ORDER BY folder_path
    `).all(userId) as Array<{ id: number; user_id: number; folder_path: string; created_at: string }>;

    res.json({ folders });
  } catch (error) {
    console.error('Error getting user shared folders:', error);
    res.status(500).json({ error: 'Failed to get shared folders', folders: [] });
  }
}

