/**
 * Shared-Ordner-Controller
 * 
 * Verwaltet Shared-Ordner-Zuweisungen für Benutzer (NAS-Mode)
 */

import { Request, Response } from 'express';
import db from '../config/database';
import { IS_NAS_MODE } from '../config/constants';
import { 
  listAvailableSharedFolders, 
  validateNasSharedPath 
} from '../utils/nasPathValidator';

/**
 * GET /api/admin/shared-folders
 * Listet verfügbare Shared-Ordner auf
 */
export async function getAvailableSharedFolders(_req: Request, res: Response): Promise<void> {
  try {
    const result = listAvailableSharedFolders();
    
    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({ folders: result.folders, nasMode: IS_NAS_MODE });
  } catch (error) {
    console.error('Error listing shared folders:', error);
    res.status(500).json({ error: 'Failed to list shared folders' });
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

    // Füge Shared-Ordner hinzu (oder update)
    db.prepare(`
      INSERT INTO user_shared_folders (user_id, folder_path)
      VALUES (?, ?)
      ON CONFLICT(user_id, folder_path) DO NOTHING
    `).run(userId, validation.path);

    res.json({ 
      message: 'Shared folder access granted',
      path: validation.path 
    });
  } catch (error) {
    console.error('Error granting shared folder access:', error);
    res.status(500).json({ error: 'Failed to grant access' });
  }
}

/**
 * DELETE /api/admin/users/:id/shared-folders
 * Entfernt Shared-Ordner-Zugriff für einen Benutzer
 */
export async function revokeSharedFolderAccess(req: Request, res: Response): Promise<void> {
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

    // Entferne Zugriff
    const result = db.prepare(`
      DELETE FROM user_shared_folders
      WHERE user_id = ? AND folder_path = ?
    `).run(userId, folderPath);

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
      SELECT folder_path, created_at
      FROM user_shared_folders
      WHERE user_id = ?
      ORDER BY folder_path
    `).all(userId);

    res.json({ folders });
  } catch (error) {
    console.error('Error getting user shared folders:', error);
    res.status(500).json({ error: 'Failed to get shared folders' });
  }
}

