/**
 * Admin-Service
 * 
 * Verwaltet Benutzer-Operationen für Administratoren
 */

import db from '../config/database';
import { User, RegisterRequest } from '../types/auth';
import { hashPassword, createUser } from './auth.service';
import fs from 'fs';

/**
 * Gibt alle Benutzer zurück (für Admin-Übersicht)
 */
export function getAllUsers(): User[] {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
  return users;
}

/**
 * Erstellt einen neuen Benutzer (Admin-Funktion)
 */
export async function adminCreateUser(data: RegisterRequest, isAdmin: boolean = false): Promise<User> {
  const passwordHash = await hashPassword(data.password);
  
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, email, auth_type, is_admin)
    VALUES (?, ?, ?, 'local', ?)
  `).run(data.username, passwordHash, data.email || null, isAdmin ? 1 : 0);
  
  const userId = result.lastInsertRowid as number;
  
  // Erstelle Standard-Einstellungen
  const privatePath = process.env.NAS_HOMES_PATH 
    ? `${process.env.NAS_HOMES_PATH}/${data.username}`
    : process.env.NODE_ENV === 'production'
    ? `/data/users/${data.username}`
    : `/app/data/users/${data.username}`;
  
  const sharedPath = process.env.NAS_SHARED_PATH || (
    process.env.NODE_ENV === 'production'
      ? '/data/shared'
      : '/app/data/shared'
  );
  
  db.prepare(`
    INSERT INTO user_settings (user_id, private_folder_path, shared_folder_path)
    VALUES (?, ?, ?)
  `).run(userId, privatePath, sharedPath);
  
  // Erstelle Benutzer-Ordner, falls nicht vorhanden
  try {
    if (!fs.existsSync(privatePath)) {
      fs.mkdirSync(privatePath, { recursive: true });
      console.log(`✅ Created user directory: ${privatePath}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not create user directory: ${privatePath}`, error);
  }
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (!user) {
    throw new Error('Failed to create user');
  }
  
  return user;
}

/**
 * Löscht einen Benutzer (Admin-Funktion)
 * Hinweis: Foreign Keys löschen automatisch zugehörige Einträge (CASCADE)
 */
export function adminDeleteUser(userId: number): boolean {
  try {
    // Hole Benutzer-Informationen vor dem Löschen (für Ordner-Bereinigung)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
    
    if (!user) {
      return false;
    }

    // Lösche Benutzer (CASCADE löscht automatisch user_settings, sessions, etc.)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    
    // Optional: Lösche Benutzer-Ordner (kann gefährlich sein, daher auskommentiert)
    // try {
    //   if (user.auth_type === 'local') {
    //     const privatePath = process.env.NAS_HOMES_PATH 
    //       ? `${process.env.NAS_HOMES_PATH}/${user.username}`
    //       : process.env.NODE_ENV === 'production'
    //       ? `/data/users/${user.username}`
    //       : `/app/data/users/${user.username}`;
    //     
    //     if (fs.existsSync(privatePath)) {
    //       fs.rmSync(privatePath, { recursive: true, force: true });
    //       console.log(`✅ Deleted user directory: ${privatePath}`);
    //     }
    //   }
    // } catch (error) {
    //   console.warn(`⚠️ Could not delete user directory`, error);
    // }
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

/**
 * Setzt das Passwort eines Benutzers zurück (Admin-Funktion)
 */
export async function adminResetPassword(userId: number, newPassword: string): Promise<boolean> {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
    if (!user) {
      return false;
    }

    // Nur lokale Benutzer können Passwörter haben
    if (user.auth_type !== 'local') {
      throw new Error('Cannot reset password for non-local users');
    }

    const passwordHash = await hashPassword(newPassword);
    
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(passwordHash, userId);
    
    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  }
}

/**
 * Aktualisiert Admin-Status eines Benutzers
 */
export function adminUpdateUserRole(userId: number, isAdmin: boolean): boolean {
  try {
    const result = db.prepare(`
      UPDATE users 
      SET is_admin = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(isAdmin ? 1 : 0, userId);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
}

/**
 * Aktiviert oder deaktiviert einen Benutzer
 */
export function adminUpdateUserStatus(userId: number, isActive: boolean): boolean {
  try {
    const result = db.prepare(`
      UPDATE users 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(isActive ? 1 : 0, userId);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating user status:', error);
    return false;
  }
}

