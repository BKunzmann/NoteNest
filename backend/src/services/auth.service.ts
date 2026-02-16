/**
 * Authentifizierungs-Service
 * 
 * Verantwortlich für:
 * - Passwort-Hashing (Argon2)
 * - JWT-Token-Generierung
 * - Benutzer-Verwaltung
 */

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import db from '../config/database';
import { User, LoginRequest, RegisterRequest } from '../types/auth';
import { getPrivateRootPathForDeployment, getSharedRootPathForDeployment } from '../utils/storageRoots';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
}

/**
 * Hasht ein Passwort mit Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verifiziert ein Passwort gegen einen Hash
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

/**
 * Generiert einen Access Token (JWT)
 */
export function generateAccessToken(userId: number, username: string): string {
  const jti = crypto.randomUUID();
  
  // @ts-ignore - jsonwebtoken type issue with expiresIn
  return jwt.sign(
    {
      userId,
      username,
      jti
    },
    JWT_SECRET,
    {
      expiresIn: JWT_ACCESS_EXPIRES_IN as string,
      issuer: 'notenest',
      audience: 'notenest-users'
    }
  );
}

/**
 * Generiert einen Refresh Token (JWT)
 */
export function generateRefreshToken(userId: number, username: string): string {
  const jti = crypto.randomUUID();
  
  // @ts-ignore - jsonwebtoken type issue with expiresIn
  return jwt.sign(
    {
      userId,
      username,
      jti,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN as string,
      issuer: 'notenest',
      audience: 'notenest-users'
    }
  );
}

/**
 * Verifiziert einen Access Token
 */
export function verifyAccessToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'notenest',
    audience: 'notenest-users'
  }) as jwt.JwtPayload;
}

/**
 * Verifiziert einen Refresh Token
 */
export function verifyRefreshToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'notenest',
    audience: 'notenest-users'
  }) as jwt.JwtPayload;
}

/**
 * Findet einen Benutzer anhand des Usernamens
 */
export function findUserByUsername(username: string): User | null {
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username) as User | undefined;
  return user || null;
}

/**
 * Findet einen Benutzer anhand der ID
 */
export function findUserById(id: number): User | null {
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(id) as User | undefined;
  return user || null;
}

/**
 * Erstellt einen neuen Benutzer (lokale Registrierung)
 */
export async function createUser(data: RegisterRequest): Promise<User> {
  const passwordHash = await hashPassword(data.password);
  
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, email, auth_type)
    VALUES (?, ?, ?, 'local')
  `).run(data.username, passwordHash, data.email || null);
  
  const userId = result.lastInsertRowid as number;
  
  // Erstelle Standard-Einstellungen
  // Ziel: konsistente Pfade über Docker-Setups hinweg (auch bei NODE_ENV=development im Container).
  const privateRoot = getPrivateRootPathForDeployment();
  const sharedRoot = getSharedRootPathForDeployment();
  const privatePath = path.join(privateRoot, data.username);
  const sharedPath = sharedRoot;
  const defaultNotesFolder = '/Notizen';
  
  db.prepare(`
    INSERT INTO user_settings (
      user_id,
      private_folder_path,
      shared_folder_path,
      default_note_type,
      default_note_folder_path,
      sidebar_view_mode,
      show_only_notes
    )
    VALUES (?, ?, ?, 'private', ?, 'recent', 1)
  `).run(
    userId,
    privatePath,
    sharedPath,
    defaultNotesFolder
  );
  
  // Erstelle oder validiere Benutzer-Ordner
  try {
    const { IS_NAS_MODE } = await import('../config/constants');
    const { validateNasHomePath, createPathIfNotExists } = await import('../utils/nasPathValidator');
    
    if (IS_NAS_MODE) {
      // NAS-Mode: Validiere, dass Ordner auf NAS existiert
      const validation = validateNasHomePath(data.username);
      if (!validation.valid) {
        console.warn(`⚠️ NAS home directory validation failed: ${validation.error}`);
        // Warnung, aber kein Fehler - User kann trotzdem erstellt werden
        // Admin muss dann Ordner auf NAS erstellen
      } else {
        console.log(`✅ Validated NAS home directory: ${validation.path}`);
      }
      // Lege den Standard-Unterordner "Notizen" an, falls möglich.
      const notesPath = path.join(privatePath, 'Notizen');
      const notesResult = createPathIfNotExists(notesPath);
      if (notesResult.created) {
        console.log(`✅ Created default notes directory: ${notesPath}`);
      } else if (notesResult.error) {
        console.warn(`⚠️ Could not create default notes directory: ${notesResult.error}`);
      }
    } else {
      // Standalone-Mode: Erstelle Ordner lokal
      const result = createPathIfNotExists(privatePath);
      if (result.created) {
        console.log(`✅ Created user directory: ${privatePath}`);
      } else if (result.error) {
        console.warn(`⚠️ Could not create user directory: ${result.error}`);
      }

      const notesPath = path.join(privatePath, 'Notizen');
      const notesResult = createPathIfNotExists(notesPath);
      if (notesResult.created) {
        console.log(`✅ Created default notes directory: ${notesPath}`);
      } else if (notesResult.error) {
        console.warn(`⚠️ Could not create default notes directory: ${notesResult.error}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Path validation/creation error:`, error);
  }
  
  const user = findUserById(userId);
  if (!user) {
    throw new Error('Failed to create user');
  }
  
  return user;
}

/**
 * Authentifiziert einen Benutzer (lokale Auth)
 */
export async function authenticateUser(data: LoginRequest): Promise<User | null> {
  const user = findUserByUsername(data.username);
  
  if (!user) {
    return null;
  }
  
  // Nur lokale Benutzer haben password_hash
  if (user.auth_type !== 'local' || !user.password_hash) {
    return null;
  }
  
  const isValid = await verifyPassword(user.password_hash, data.password);
  if (!isValid) {
    return null;
  }
  
  return user;
}

/**
 * Speichert einen Refresh Token in der Datenbank
 */
export function saveRefreshToken(userId: number, tokenId: string, expiresAt: Date): void {
  db.prepare(`
    INSERT INTO sessions (user_id, token_id, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, tokenId, expiresAt.toISOString());
}

/**
 * Prüft, ob ein Refresh Token gültig ist
 */
export function isValidRefreshToken(tokenId: string): boolean {
  const session = db.prepare(`
    SELECT * FROM sessions 
    WHERE token_id = ? AND expires_at > CURRENT_TIMESTAMP
  `).get(tokenId);
  
  return !!session;
}

/**
 * Löscht einen Refresh Token (Logout)
 */
export function deleteRefreshToken(tokenId: string): void {
  db.prepare('DELETE FROM sessions WHERE token_id = ?').run(tokenId);
}

/**
 * Löscht alle Refresh Tokens eines Benutzers
 */
export function deleteAllUserTokens(userId: number): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * Bereinigt abgelaufene Sessions
 */
export function cleanupExpiredSessions(): void {
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}

