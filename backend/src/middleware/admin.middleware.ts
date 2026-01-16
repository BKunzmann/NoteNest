/**
 * Admin-Middleware
 * 
 * Prüft, ob der eingeloggte Benutzer Admin-Rechte hat
 */

import { Request, Response, NextFunction } from 'express';
import { findUserById } from '../services/auth.service';

/**
 * Middleware: Prüft, ob der Benutzer Admin ist
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = findUserById(req.user.id);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (!user.is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

