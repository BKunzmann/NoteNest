/**
 * Authentifizierungs-Controller
 * 
 * Handles HTTP-Requests für Login, Register, Refresh, Logout
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  createUser,
  authenticateUser,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  deleteRefreshToken,
  findUserById
} from '../services/auth.service';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';

/**
 * POST /api/auth/register
 * Registriert einen neuen Benutzer (nur für lokale Auth)
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const AUTH_MODE = process.env.AUTH_MODE || 'local';
    
    // Prüfe, ob Registrierung erlaubt ist
    if (AUTH_MODE === 'ldap' || AUTH_MODE === 'synology') {
      res.status(403).json({ 
        error: 'Registration is not available in LDAP/Synology mode' 
      });
      return;
    }

    const data: RegisterRequest = req.body;

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
    const existingUser = await import('../services/auth.service').then(m => 
      m.findUserByUsername(data.username)
    );
    
    if (existingUser) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    // Erstelle Benutzer
    const user = await createUser(data);

    // Generiere Tokens
    const accessToken = generateAccessToken(user.id, user.username);
    const refreshToken = generateRefreshToken(user.id, user.username);

    // Speichere Refresh Token
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.jti) {
      const expiresAt = new Date(decoded.exp! * 1000);
      saveRefreshToken(user.id, decoded.jti, expiresAt);
    }

    const response: AuthResponse = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        auth_type: user.auth_type,
        is_admin: user.is_admin
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * POST /api/auth/login
 * Authentifiziert einen Benutzer
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const data: LoginRequest = req.body;

    // Validierung
    if (!data.username || !data.password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Authentifiziere Benutzer (lokale Auth)
    const user = await authenticateUser(data);

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Prüfe, ob Benutzer aktiv ist
    if (!user.is_active) {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    // Generiere Tokens
    const accessToken = generateAccessToken(user.id, user.username);
    const refreshToken = generateRefreshToken(user.id, user.username);

    // Speichere Refresh Token
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.jti) {
      const expiresAt = new Date(decoded.exp! * 1000);
      saveRefreshToken(user.id, decoded.jti, expiresAt);
    }

    const response: AuthResponse = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        auth_type: user.auth_type,
        is_admin: user.is_admin
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * POST /api/auth/refresh
 * Erneuert Access Token mit Refresh Token
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // Verifiziere Refresh Token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Prüfe, ob Token in Datenbank existiert
    if (!decoded.jti) {
      res.status(403).json({ error: 'Invalid refresh token' });
      return;
    }
    
    const { isValidRefreshToken } = await import('../services/auth.service');
    if (!isValidRefreshToken(decoded.jti)) {
      res.status(403).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Prüfe, ob Benutzer noch existiert
    const user = findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Generiere neuen Access Token
    const accessToken = generateAccessToken(user.id, user.username);

    res.json({ accessToken });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid refresh token' });
      return;
    }
    
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
}

/**
 * POST /api/auth/logout
 * Meldet einen Benutzer ab (löscht Refresh Token)
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded.jti) {
        deleteRefreshToken(decoded.jti);
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Auch bei Fehler als erfolgreich behandeln
    res.json({ message: 'Logged out successfully' });
  }
}

/**
 * GET /api/auth/me
 * Gibt aktuelle Benutzer-Informationen zurück
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      auth_type: user.auth_type,
      is_admin: user.is_admin
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
}

/**
 * GET /api/auth/mode
 * Gibt aktiven Authentifizierungs-Modus zurück
 */
export function getAuthMode(_req: Request, res: Response): void {
  const AUTH_MODE = process.env.AUTH_MODE || 'local';
  const LDAP_ENABLED = process.env.LDAP_ENABLED === 'true';
  
  res.json({
    mode: AUTH_MODE,
    ldapEnabled: LDAP_ENABLED,
    registrationEnabled: AUTH_MODE === 'local' || AUTH_MODE === 'hybrid'
  });
}

