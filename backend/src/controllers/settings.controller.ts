/**
 * Settings Controller
 * 
 * Handles HTTP-Requests für Benutzer-Einstellungen
 */

import { Request, Response } from 'express';
import { getUserSettings, updateUserSettings } from '../services/settings.service';
import fs from 'fs/promises';
import path from 'path';

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

    // Validiere Pfade, falls angegeben
    if (private_folder_path !== undefined && private_folder_path !== null) {
      try {
        // Prüfe, ob Pfad existiert oder erstellt werden kann
        const dir = path.dirname(private_folder_path);
        await fs.mkdir(dir, { recursive: true });
        await fs.access(dir);
      } catch (error: any) {
        res.status(400).json({ error: `Invalid private folder path: ${error.message}` });
        return;
      }
    }

    if (shared_folder_path !== undefined && shared_folder_path !== null) {
      try {
        const dir = path.dirname(shared_folder_path);
        await fs.mkdir(dir, { recursive: true });
        await fs.access(dir);
      } catch (error: any) {
        res.status(400).json({ error: `Invalid shared folder path: ${error.message}` });
        return;
      }
    }

    const updated = updateUserSettings(req.user.id, {
      private_folder_path,
      shared_folder_path,
      theme,
      default_export_size,
      default_bible_translation
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
}

