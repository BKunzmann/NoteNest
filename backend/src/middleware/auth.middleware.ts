/**
 * Authentifizierungs-Middleware
 * 
 * Verifiziert JWT-Tokens und fügt Benutzer-Informationen zum Request hinzu
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../services/auth.service';
import { findUserById } from '../services/auth.service';
import { JWTPayload } from '../types/auth';

// Erweitere Express Request um user-Property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        jti: string;
      };
    }
  }
}

/**
 * Middleware: Verifiziert JWT Access Token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token) as JWTPayload;
    
    // Prüfe, ob Benutzer noch existiert und aktiv ist
    const user = findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Füge Benutzer-Informationen zum Request hinzu
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      jti: decoded.jti
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    
    res.status(500).json({ error: 'Token verification failed' });
  }
}

