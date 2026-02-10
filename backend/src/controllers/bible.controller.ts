/**
 * Bible Controller
 * 
 * HTTP-Handler für Bibelverse-Endpunkte
 */

import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import db from '../config/database';
import { getBibleVerse, getBibleChapter, parseBibleReference } from '../services/bible.service';
import { getUserSettings } from '../services/settings.service';

/**
 * GET /api/bible/verse
 * Ruft einen Bibelvers ab
 * Query: ?reference=Psalm+23,3&translation=LUT
 */
export async function getVerse(req: Request, res: Response): Promise<void> {
  try {
    const { reference, translation } = req.query;
    
    console.log('getVerse called with:', { reference, translation, query: req.query });
    
    if (!reference || typeof reference !== 'string') {
      console.log('Missing reference parameter');
      res.status(400).json({ error: 'Reference parameter is required' });
      return;
    }
    
    // Decodiere URL-encoded Referenz
    const decodedReference = decodeURIComponent(reference);
    console.log('Decoded reference:', decodedReference);
    
    // Verwende angegebene Übersetzung, ansonsten User-Default oder Fallback
    let finalTranslation = (translation as string) || 'LUT';
    if (!translation && req.user) {
      try {
        const settings = getUserSettings(req.user.id);
        if (settings?.default_bible_translation) {
          finalTranslation = settings.default_bible_translation;
        }
      } catch (error) {
        // Ignoriere Fehler, verwende angegebene oder Standard-Übersetzung
      }
    }
    
    console.log('Using translation:', finalTranslation);
    
    let verse;
    try {
      verse = await getBibleVerse(decodedReference, finalTranslation);
    } catch (error: any) {
      // Spezifische Fehlermeldung für nicht verfügbare Übersetzungen
      if (error.message && error.message.includes('ist nicht verfügbar')) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error; // Andere Fehler weiterwerfen
    }
    
    if (!verse) {
      console.log('Verse not found in database');
      res.status(404).json({ error: 'Verse not found. Möglicherweise ist die Bibel-Datenbank noch nicht importiert.' });
      return;
    }
    
    console.log('Verse found:', verse);
    res.json(verse);
  } catch (error: any) {
    console.error('Error getting bible verse:', error);
    res.status(500).json({ error: 'Failed to get bible verse', details: error.message });
  }
}

/**
 * GET /api/bible/chapter
 * Ruft ein ganzes Kapitel ab
 * Query: ?book=Ps&chapter=23&translation=LUT
 */
export async function getChapter(req: Request, res: Response): Promise<void> {
  try {
    const { book, chapter, translation } = req.query;
    
    if (!book || typeof book !== 'string') {
      res.status(400).json({ error: 'Book parameter is required' });
      return;
    }
    
    if (!chapter || typeof chapter !== 'string') {
      res.status(400).json({ error: 'Chapter parameter is required' });
      return;
    }
    
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum)) {
      res.status(400).json({ error: 'Invalid chapter number' });
      return;
    }
    
    // Verwende angegebene Übersetzung, ansonsten User-Default oder Fallback
    let finalTranslation = (translation as string) || 'LUT';
    if (!translation && req.user) {
      try {
        const settings = getUserSettings(req.user.id);
        if (settings?.default_bible_translation) {
          finalTranslation = settings.default_bible_translation;
        }
      } catch (error) {
        // Ignoriere Fehler
      }
    }
    
    const verses = await getBibleChapter(book, chapterNum, finalTranslation);
    
    if (!verses) {
      res.status(404).json({ error: 'Chapter not found' });
      return;
    }
    
    res.json({
      book,
      chapter: chapterNum,
      translation: finalTranslation,
      verses
    });
  } catch (error: any) {
    console.error('Error getting bible chapter:', error);
    res.status(500).json({ error: 'Failed to get bible chapter' });
  }
}

/**
 * POST /api/bible/parse
 * Parst eine Bibelstellen-Referenz
 * Body: { reference: "Psalm 23,3" }
 */
export async function parseReference(req: Request, res: Response): Promise<void> {
  try {
    const { reference } = req.body;
    
    if (!reference || typeof reference !== 'string') {
      res.status(400).json({ error: 'Reference is required' });
      return;
    }
    
    const parsed = parseBibleReference(reference);
    
    if (!parsed) {
      res.status(400).json({ error: 'Invalid bible reference format' });
      return;
    }
    
    res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing bible reference:', error);
    res.status(500).json({ error: 'Failed to parse bible reference' });
  }
}

/**
 * GET /api/bible/translations
 * Gibt alle verfügbaren Übersetzungen zurück (lokal + API)
 */
export async function getTranslations(_req: Request, res: Response): Promise<void> {
  try {
    const { getAPITranslations } = await import('../services/bibleApi.service');
    
    // Lokale Übersetzungen (tatsächlich in der Datenbank vorhanden)
    const localTranslations = ['LUT1912', 'LUT1545', 'ELB1905', 'SCH1951'];
    
    // API-Übersetzungen (wenn API aktiviert)
    const apiTranslations = getAPITranslations();
    
    res.json({
      local: localTranslations,
      api: apiTranslations,
      all: [...localTranslations, ...apiTranslations]
    });
  } catch (error: any) {
    console.error('Error getting translations:', error);
    res.status(500).json({ error: 'Failed to get translations' });
  }
}

/**
 * GET /api/bible/diagnostics
 * Liefert Diagnoseinformationen für Produktiv-Fehleranalyse.
 * Nur für Admins verfügbar.
 */
export async function getDiagnostics(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!req.user.is_admin) {
      res.status(403).json({ error: 'Forbidden: admin access required' });
      return;
    }

    const verseStats = db.prepare(`
      SELECT translation, COUNT(*) AS count
      FROM bible_verses
      GROUP BY translation
      ORDER BY translation
    `).all() as Array<{ translation: string; count: number }>;
    const totalVerseCount = verseStats.reduce((sum, row) => sum + row.count, 0);
    const cacheRow = db.prepare(`SELECT COUNT(*) AS count FROM bible_cache`).get() as { count: number } | undefined;

    const configuredPath = process.env.BIBLE_LOCAL_PATH?.trim();
    const pathCandidates = Array.from(new Set([
      configuredPath || '',
      '/data/bibles',
      '/app/data/bibles'
    ].filter(Boolean)));

    const paths = await Promise.all(pathCandidates.map(async (candidatePath) => {
      const normalized = path.resolve(candidatePath).replace(/\\/g, '/');
      try {
        await fs.access(normalized);
        const entries = await fs.readdir(normalized, { withFileTypes: true });
        const jsonFiles = entries
          .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
          .map((entry) => entry.name)
          .sort();
        return {
          path: normalized,
          exists: true,
          jsonFiles,
          jsonFileCount: jsonFiles.length
        };
      } catch {
        return {
          path: normalized,
          exists: false,
          jsonFiles: [] as string[],
          jsonFileCount: 0
        };
      }
    }));

    res.json({
      database: {
        totalVerseCount,
        translations: verseStats,
        cacheEntries: cacheRow?.count ?? 0
      },
      config: {
        bibleApiEnabled: process.env.BIBLE_API_ENABLED === 'true',
        bibleApiUrl: process.env.BIBLE_API_URL || null,
        bibleSupersearchEnabled: process.env.BIBLE_SUPERSEARCH_ENABLED === 'true',
        bibleSupersearchUrl: process.env.BIBLE_SUPERSEARCH_URL || null,
        configuredBibleLocalPath: configuredPath || null
      },
      paths,
      checks: [
        'Wenn totalVerseCount = 0, dann Import aus JSON mit npm run bible:import ausführen.',
        'Wenn gewünschte JSON-Datei nicht in paths[].jsonFiles auftaucht, Volume-Mount in Docker prüfen.',
        'Wenn bibleApiEnabled=true, aber verseStats leer ist, sollte wenigstens API-Fallback Treffer liefern (Netzwerk/API-Key prüfen).',
        'Bei Übersetzungsproblemen Standardübersetzung in den Benutzereinstellungen auf LUT1912/ELB1905/SCH1951 setzen und erneut testen.'
      ]
    });
  } catch (error: any) {
    console.error('Error getting bible diagnostics:', error);
    res.status(500).json({ error: 'Failed to get bible diagnostics' });
  }
}

/**
 * GET /api/bible/favorites
 * Holt alle Favoriten des eingeloggten Benutzers
 */
export async function getFavorites(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { getUserFavorites } = await import('../services/bibleFavorites.service');
    const favorites = getUserFavorites(req.user.id);
    
    res.json({ favorites });
  } catch (error: any) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
}

/**
 * POST /api/bible/favorites
 * Fügt eine Übersetzung zu den Favoriten hinzu
 * Body: { translation: "LUT", isDefault?: boolean }
 */
export async function addFavorite(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { translation, isDefault } = req.body;
    
    if (!translation || typeof translation !== 'string') {
      res.status(400).json({ error: 'Translation is required' });
      return;
    }
    
    // Prüfe, ob es die Standard-Übersetzung ist
    let isDefaultTranslation = isDefault || false;
    if (!isDefaultTranslation) {
      try {
        const settings = getUserSettings(req.user.id);
        if (settings?.default_bible_translation === translation) {
          isDefaultTranslation = true;
        }
      } catch (error) {
        // Ignoriere Fehler
      }
    }
    
    const { addFavorite: addFavoriteService } = await import('../services/bibleFavorites.service');
    const favorite = addFavoriteService(req.user.id, translation, isDefaultTranslation);
    
    res.json({ success: true, favorite });
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
}

/**
 * DELETE /api/bible/favorites/:translation
 * Entfernt eine Übersetzung aus den Favoriten
 */
export async function deleteFavorite(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { translation } = req.params;
    
    if (!translation) {
      res.status(400).json({ error: 'Translation parameter is required' });
      return;
    }
    
    const { removeFavorite } = await import('../services/bibleFavorites.service');
    const success = removeFavorite(req.user.id, translation);
    
    if (!success) {
      res.status(404).json({ error: 'Favorite not found' });
      return;
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting favorite:', error);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
}

/**
 * PUT /api/bible/favorites/order
 * Aktualisiert die Reihenfolge der Favoriten
 * Body: { favorites: [{ translation: "LUT", order: 1 }, { translation: "ELB", order: 2 }] }
 */
export async function updateFavoritesOrder(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { favorites } = req.body;
    
    if (!Array.isArray(favorites)) {
      res.status(400).json({ error: 'Favorites must be an array' });
      return;
    }
    
    // Validiere Format
    for (const fav of favorites) {
      if (!fav.translation || typeof fav.translation !== 'string') {
        res.status(400).json({ error: 'Each favorite must have a translation string' });
        return;
      }
      if (typeof fav.order !== 'number') {
        res.status(400).json({ error: 'Each favorite must have an order number' });
        return;
      }
    }
    
    // Hole Standard-Übersetzung aus Settings
    let defaultTranslation: string | undefined;
    try {
      const settings = getUserSettings(req.user.id);
      defaultTranslation = settings?.default_bible_translation;
    } catch (error) {
      // Ignoriere Fehler
    }
    
    const { updateFavoritesOrder: updateOrderService } = await import('../services/bibleFavorites.service');
    updateOrderService(req.user.id, favorites, defaultTranslation);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating favorites order:', error);
    res.status(500).json({ error: 'Failed to update favorites order' });
  }
}

