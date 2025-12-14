/**
 * Search Controller
 * 
 * Handles HTTP-Requests für Volltextsuche
 */

import { Request, Response } from 'express';
import { searchNotes } from '../services/search.service';

/**
 * GET /api/search
 * Sucht nach einem Begriff in allen Notizen
 * Query: ?q=suchbegriff&type=private|shared (optional)
 */
export async function search(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { q: searchTerm, type } = req.query;

    if (!searchTerm || typeof searchTerm !== 'string') {
      res.status(400).json({ error: 'Search term is required' });
      return;
    }

    if (searchTerm.trim().length < 2) {
      res.status(400).json({ error: 'Search term must be at least 2 characters' });
      return;
    }

    const folderType = type === 'private' || type === 'shared' 
      ? (type as 'private' | 'shared')
      : undefined;

    const results = await searchNotes(req.user.id, searchTerm, folderType);

    res.json({
      query: searchTerm,
      results,
      count: results.length
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message || 'Failed to search' });
  }
}

