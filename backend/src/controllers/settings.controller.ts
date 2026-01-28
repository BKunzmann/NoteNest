/**
 * Settings Controller
 * 
 * Handles HTTP-Requests für Benutzer-Einstellungen
 */

import { Request, Response } from 'express';
import { getUserSettings, updateUserSettings } from '../services/settings.service';
import fs from 'fs/promises';
import { IS_NAS_MODE } from '../config/constants';
import { 
  getDefaultPrivateRoot,
  getDefaultSharedRoot,
  resolvePathWithinRoot
} from '../utils/pathAccess';

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

    const { private_folder_path, shared_folder_path, theme, default_export_size, default_bible_translation } = req.body;
    let normalizedPrivatePath = private_folder_path;
    let normalizedSharedPath = shared_folder_path;

    const privateRoot = getDefaultPrivateRoot(req.user.username);
    const sharedRoot = getDefaultSharedRoot();

    // Validiere Pfade, falls angegeben
    if (private_folder_path !== undefined && private_folder_path !== null && typeof private_folder_path !== 'string') {
      res.status(400).json({ error: 'private_folder_path must be a string' });
      return;
    }
    if (shared_folder_path !== undefined && shared_folder_path !== null && typeof shared_folder_path !== 'string') {
      res.status(400).json({ error: 'shared_folder_path must be a string' });
      return;
    }

    if (private_folder_path === '') {
      normalizedPrivatePath = null;
    }
    if (shared_folder_path === '') {
      normalizedSharedPath = null;
    }

    if (private_folder_path !== undefined && private_folder_path !== null && private_folder_path !== '') {
      try {
        normalizedPrivatePath = resolvePathWithinRoot(private_folder_path, privateRoot);

        if (!IS_NAS_MODE) {
          await fs.mkdir(normalizedPrivatePath, { recursive: true });
          await fs.access(normalizedPrivatePath);
        } else {
          await fs.access(privateRoot);
        }
      } catch (error: any) {
        res.status(400).json({ error: `Invalid private folder path: ${error.message}` });
        return;
      }
    }

    if (shared_folder_path !== undefined && shared_folder_path !== null && shared_folder_path !== '') {
      try {
        normalizedSharedPath = resolvePathWithinRoot(shared_folder_path, sharedRoot);

        if (!IS_NAS_MODE) {
          await fs.mkdir(normalizedSharedPath, { recursive: true });
          await fs.access(normalizedSharedPath);
        } else {
          await fs.access(sharedRoot);
        }
      } catch (error: any) {
        res.status(400).json({ error: `Invalid shared folder path: ${error.message}` });
        return;
      }
    }

    const updates: Record<string, any> = {
      theme,
      default_export_size,
      default_bible_translation
    };

    if (private_folder_path !== undefined) {
      updates.private_folder_path = normalizedPrivatePath === '' ? null : normalizedPrivatePath;
    }
    if (shared_folder_path !== undefined) {
      updates.shared_folder_path = normalizedSharedPath === '' ? null : normalizedSharedPath;
    }

    const updated = updateUserSettings(req.user.id, updates);

    res.json(updated);
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
}

