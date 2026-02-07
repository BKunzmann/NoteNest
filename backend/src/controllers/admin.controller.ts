/**
 * Admin-Controller
 * 
 * Handles HTTP-Requests für Admin-Benutzerverwaltung
 */

import { Request, Response } from 'express';
import {
  getAllUsers,
  adminCreateUser,
  adminDeleteUser,
  adminResetPassword,
  adminUpdateUserRole,
  adminUpdateUserStatus
} from '../services/admin.service';
import { RegisterRequest } from '../types/auth';
import { indexAllFiles } from '../services/index.service';

/**
 * GET /api/admin/users
 * Gibt alle Benutzer zurück
 */
export async function getUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = getAllUsers();
    
    // Entferne Passwort-Hashes aus der Antwort
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      auth_type: user.auth_type,
      auth_source: user.auth_source,
      created_at: user.created_at,
      updated_at: user.updated_at,
      is_active: user.is_active,
      is_admin: user.is_admin
    }));
    
    res.json({ users: safeUsers });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
}

/**
 * POST /api/admin/users
 * Erstellt einen neuen Benutzer
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const data: RegisterRequest & { isAdmin?: boolean } = req.body;

    // Validierung
    if (!data.username || !data.password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    if (data.username.length < 3 || data.username.length > 50) {
      res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
      return;
    }

    if (data.password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Prüfe, ob Benutzer bereits existiert
    const { findUserByUsername } = await import('../services/auth.service');
    const existingUser = findUserByUsername(data.username);
    
    if (existingUser) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    // Erstelle Benutzer
    const user = await adminCreateUser(data, data.isAdmin || false);

    // Entferne Passwort-Hash aus der Antwort
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      auth_type: user.auth_type,
      auth_source: user.auth_source,
      created_at: user.created_at,
      updated_at: user.updated_at,
      is_active: user.is_active,
      is_admin: user.is_admin
    };

    res.status(201).json({ user: safeUser, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

/**
 * DELETE /api/admin/users/:id
 * Löscht einen Benutzer
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Verhindere, dass ein Admin sich selbst löscht
    if (req.user && req.user.id === userId) {
      res.status(400).json({ error: 'Sie können Ihr eigenes Konto nicht löschen' });
      return;
    }

    // Verhindere das Löschen des letzten Admins
    const users = getAllUsers();
    const targetUser = users.find(u => u.id === userId);
    
    if (targetUser?.is_admin) {
      const adminCount = users.filter(u => u.is_admin && u.is_active).length;
      if (adminCount <= 1) {
        res.status(400).json({ 
          error: 'Es muss mindestens ein Administrator vorhanden sein. Ernennen Sie erst einen anderen Benutzer zum Admin.' 
        });
        return;
      }
    }

    const success = adminDeleteUser(userId);
    
    if (!success) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

/**
 * POST /api/admin/users/:id/reset-password
 * Setzt das Passwort eines Benutzers zurück
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const success = await adminResetPassword(userId, newPassword);
    
    if (!success) {
      res.status(404).json({ error: 'User not found or password reset failed' });
      return;
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    if (error.message === 'Cannot reset password for non-local users') {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

/**
 * Zählt die Anzahl der aktiven Admins
 */
function countActiveAdmins(): number {
  const users = getAllUsers();
  return users.filter(user => user.is_admin && user.is_active).length;
}

/**
 * PATCH /api/admin/users/:id/role
 * Aktualisiert den Admin-Status eines Benutzers
 */
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    const { isAdmin } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (typeof isAdmin !== 'boolean') {
      res.status(400).json({ error: 'isAdmin must be a boolean' });
      return;
    }

    // Verhindere, dass ein Admin sich selbst die Admin-Rechte entzieht
    if (req.user && req.user.id === userId && !isAdmin) {
      res.status(400).json({ error: 'Sie können sich nicht selbst die Admin-Rechte entziehen' });
      return;
    }

    // Verhindere das Entfernen des letzten Admins
    if (!isAdmin) {
      const adminCount = countActiveAdmins();
      
      // Hole den Benutzer, dessen Rolle geändert werden soll
      const users = getAllUsers();
      const targetUser = users.find(u => u.id === userId);
      
      // Wenn der Ziel-Benutzer derzeit Admin ist und es nur noch einen Admin gibt
      if (targetUser?.is_admin && adminCount <= 1) {
        res.status(400).json({ 
          error: 'Es muss mindestens ein Administrator vorhanden sein. Ernennen Sie erst einen anderen Benutzer zum Admin.' 
        });
        return;
      }
    }

    const success = adminUpdateUserRole(userId, isAdmin);
    
    if (!success) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Aktiviert oder deaktiviert einen Benutzer
 */
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    const { isActive } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive must be a boolean' });
      return;
    }

    // Verhindere, dass ein Admin sich selbst deaktiviert
    if (req.user && req.user.id === userId && !isActive) {
      res.status(400).json({ error: 'Sie können Ihr eigenes Konto nicht deaktivieren' });
      return;
    }

    // Verhindere das Deaktivieren des letzten Admins
    if (!isActive) {
      const adminCount = countActiveAdmins();
      
      // Hole den Benutzer, dessen Status geändert werden soll
      const users = getAllUsers();
      const targetUser = users.find(u => u.id === userId);
      
      // Wenn der Ziel-Benutzer Admin ist und es nur noch einen aktiven Admin gibt
      if (targetUser?.is_admin && adminCount <= 1) {
        res.status(400).json({ 
          error: 'Es muss mindestens ein aktiver Administrator vorhanden sein. Ernennen Sie erst einen anderen Benutzer zum Admin.' 
        });
        return;
      }
    }

    const success = adminUpdateUserStatus(userId, isActive);
    
    if (!success) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
}

/**
 * POST /api/admin/search/reindex
 * Startet eine vollständige Re-Indexierung aller Dateien
 * Optional: ?userId=X für einen spezifischen Benutzer
 * Optional: ?type=private|shared für einen spezifischen Ordner-Typ
 */
export async function reindexAll(req: Request, res: Response): Promise<void> {
  try {
    const userIdParam = req.query.userId as string | undefined;
    const folderType = req.query.type as 'private' | 'shared' | undefined;
    
    // Validiere folderType
    if (folderType && folderType !== 'private' && folderType !== 'shared') {
      res.status(400).json({ error: 'Invalid folder type. Must be "private" or "shared"' });
      return;
    }
    
    // Wenn userId angegeben, prüfe ob Benutzer existiert
    if (userIdParam) {
      const userId = parseInt(userIdParam, 10);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }
      
      const users = getAllUsers();
      const user = users.find(u => u.id === userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      // Starte Re-Indexierung für einen Benutzer (asynchron)
      res.json({ 
        message: 'Re-indexing started',
        userId,
        folderType: folderType || 'all'
      });
      
      // Führe Indexierung im Hintergrund aus
      indexAllFiles(userId, folderType)
        .then(result => {
          console.log(`Re-indexing completed for user ${userId}: ${result.indexed} indexed, ${result.errors} errors`);
        })
        .catch(error => {
          console.error(`Re-indexing failed for user ${userId}:`, error);
        });
      
      return;
    }
    
    // Re-Indexierung für alle Benutzer
    const users = getAllUsers();
    const activeUsers = users.filter(u => u.is_active);
    
    res.json({ 
      message: 'Re-indexing started for all users',
      userCount: activeUsers.length,
      folderType: folderType || 'all'
    });
    
    // Führe Indexierung für alle Benutzer im Hintergrund aus
    Promise.all(
      activeUsers.map(user => 
        indexAllFiles(user.id, folderType)
          .then(result => {
            console.log(`Re-indexing completed for user ${user.id} (${user.username}): ${result.indexed} indexed, ${result.errors} errors`);
            return result;
          })
          .catch(error => {
            console.error(`Re-indexing failed for user ${user.id} (${user.username}):`, error);
            return { indexed: 0, errors: 1 };
          })
      )
    ).then(results => {
      const totalIndexed = results.reduce((sum, r) => sum + r.indexed, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
      console.log(`Re-indexing completed for all users: ${totalIndexed} indexed, ${totalErrors} errors`);
    });
    
  } catch (error) {
    console.error('Error starting re-indexing:', error);
    res.status(500).json({ error: 'Failed to start re-indexing' });
  }
}

/**
 * GET /api/admin/search/index-status
 * Gibt Statistiken über den Index zurück
 */
export async function getIndexStatus(_req: Request, res: Response): Promise<void> {
  try {
    const db = (await import('../config/database')).default;
    
    // Hole Index-Statistiken
    const totalFiles = db.prepare('SELECT COUNT(*) as count FROM search_index').get() as { count: number };
    const totalTokens = db.prepare('SELECT COUNT(*) as count FROM search_tokens').get() as { count: number };
    const totalSize = db.prepare('SELECT SUM(file_size) as size FROM search_index').get() as { size: number | null };
    const byType = db.prepare(`
      SELECT file_type, COUNT(*) as count 
      FROM search_index 
      GROUP BY file_type
    `).all() as Array<{ file_type: string; count: number }>;
    const byExtension = db.prepare(`
      SELECT file_extension, COUNT(*) as count 
      FROM search_index 
      GROUP BY file_extension
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ file_extension: string; count: number }>;
    
    res.json({
      totalFiles: totalFiles.count,
      totalTokens: totalTokens.count,
      totalSize: totalSize.size || 0,
      byType: byType.reduce((acc, row) => {
        acc[row.file_type] = row.count;
        return acc;
      }, {} as Record<string, number>),
      topExtensions: byExtension
    });
  } catch (error) {
    console.error('Error getting index status:', error);
    res.status(500).json({ error: 'Failed to get index status' });
  }
}

/**
 * GET /api/admin/config/hidden-folders
 * Gibt die Liste der ausgeblendeten Ordner zurück
 */
export async function getHiddenFolders(req: Request, res: Response): Promise<void> {
  try {
    const db = (await import('../config/database')).default;
    const result = db.prepare('SELECT value FROM app_config WHERE key = ?').get('hidden_folders') as { value: string } | undefined;
    
    if (result?.value) {
      const folders = JSON.parse(result.value);
      res.json({ folders });
    } else {
      res.json({ folders: [] });
    }
  } catch (error: any) {
    console.error('Error getting hidden folders:', error);
    res.status(500).json({ error: 'Failed to get hidden folders' });
  }
}

/**
 * PUT /api/admin/config/hidden-folders
 * Aktualisiert die Liste der ausgeblendeten Ordner
 */
export async function updateHiddenFolders(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { folders } = req.body;

    if (!Array.isArray(folders)) {
      res.status(400).json({ error: 'folders must be an array' });
      return;
    }

    // Validiere, dass alle Einträge Strings sind
    if (!folders.every((f: any) => typeof f === 'string')) {
      res.status(400).json({ error: 'All folder names must be strings' });
      return;
    }

    const db = (await import('../config/database')).default;
    const foldersJson = JSON.stringify(folders);
    
    // Aktualisiere oder erstelle Eintrag
    db.prepare(`
      INSERT INTO app_config (key, value, description, updated_by, updated_at)
      VALUES ('hidden_folders', ?, 'Liste der Ordner, die in der Dateiansicht ausgeblendet werden (JSON-Array)', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `).run(foldersJson, req.user.id);

    res.json({ message: 'Hidden folders updated successfully', folders });
  } catch (error: any) {
    console.error('Error updating hidden folders:', error);
    res.status(500).json({ error: error.message || 'Failed to update hidden folders' });
  }
}
 