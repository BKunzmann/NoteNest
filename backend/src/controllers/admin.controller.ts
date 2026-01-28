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
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
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
      res.status(400).json({ error: 'Cannot remove admin rights from your own account' });
      return;
    }

    const success = adminUpdateUserRole(userId, isAdmin);
    
    if (!success) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    if (error.message === 'Cannot remove the last administrator') {
      res.status(400).json({ error: error.message });
      return;
    }
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
      res.status(400).json({ error: 'Cannot deactivate your own account' });
      return;
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

