/**
 * Search Controller
 * 
 * Handles HTTP-Requests für Volltextsuche
 */

import { Request, Response } from 'express';
import { searchNotes } from '../services/search.service';
import db from '../config/database';
import { indexAllFiles } from '../services/index.service';

interface UserReindexState {
  isRunning: boolean;
  startedAt?: string;
  finishedAt?: string;
  current: number;
  total: number;
  indexed: number;
  errors: number;
  scope: 'private' | 'shared' | 'all';
  lastError?: string;
}

const userReindexState = new Map<number, UserReindexState>();

function getCurrentReindexState(userId: number): UserReindexState {
  return userReindexState.get(userId) || {
    isRunning: false,
    current: 0,
    total: 0,
    indexed: 0,
    errors: 0,
    scope: 'all'
  };
}

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

/**
 * GET /api/search/index-status
 * Liefert benutzerbezogenen Status des Volltextindex.
 */
export async function getUserIndexStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const indexedFiles = db.prepare(`
      SELECT COUNT(*) as count
      FROM search_index
      WHERE user_id = ?
    `).get(req.user.id) as { count: number };

    const tokenCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM search_tokens
      WHERE file_id IN (
        SELECT id FROM search_index WHERE user_id = ?
      )
    `).get(req.user.id) as { count: number };

    const metadataFiles = db.prepare(`
      SELECT COUNT(*) as count
      FROM file_metadata
      WHERE user_id = ?
    `).get(req.user.id) as { count: number };

    const latestIndexedAt = db.prepare(`
      SELECT MAX(indexed_at) as indexed_at
      FROM search_index
      WHERE user_id = ?
    `).get(req.user.id) as { indexed_at: string | null };

    const state = getCurrentReindexState(req.user.id);

    res.json({
      indexedFiles: indexedFiles.count,
      tokenCount: tokenCount.count,
      metadataFiles: metadataFiles.count,
      latestIndexedAt: latestIndexedAt.indexed_at,
      reindex: state
    });
  } catch (error: any) {
    console.error('Get user index status error:', error);
    res.status(500).json({ error: error.message || 'Failed to load index status' });
  }
}

/**
 * POST /api/search/reindex
 * Startet eine benutzerbezogene Re-Indexierung.
 * Optional Body: { type: 'private' | 'shared' }
 */
export async function triggerUserReindex(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.user.id;

    const requestedType = req.body?.type as 'private' | 'shared' | undefined;
    if (requestedType && requestedType !== 'private' && requestedType !== 'shared') {
      res.status(400).json({ error: 'Invalid type (allowed: private, shared)' });
      return;
    }

    const previousState = getCurrentReindexState(userId);
    if (previousState.isRunning) {
      res.status(409).json({
        error: 'Re-indexing already running',
        reindex: previousState
      });
      return;
    }

    const scope: 'private' | 'shared' | 'all' = requestedType || 'all';
    const startedState: UserReindexState = {
      isRunning: true,
      startedAt: new Date().toISOString(),
      finishedAt: undefined,
      current: 0,
      total: 0,
      indexed: 0,
      errors: 0,
      scope
    };
    userReindexState.set(userId, startedState);

    res.status(202).json({
      message: 'Re-indexing started',
      reindex: startedState
    });

    indexAllFiles(userId, requestedType, (current, total) => {
      const state = getCurrentReindexState(userId);
      userReindexState.set(userId, {
        ...state,
        isRunning: true,
        current,
        total
      });
    })
      .then((result) => {
        const currentState = getCurrentReindexState(userId);
        userReindexState.set(userId, {
          ...currentState,
          isRunning: false,
          finishedAt: new Date().toISOString(),
          indexed: result.indexed,
          errors: result.errors,
          current: currentState.total || currentState.current
        });
      })
      .catch((error) => {
        const currentState = getCurrentReindexState(userId);
        userReindexState.set(userId, {
          ...currentState,
          isRunning: false,
          finishedAt: new Date().toISOString(),
          lastError: error instanceof Error ? error.message : String(error),
          errors: currentState.errors + 1
        });
      });
  } catch (error: any) {
    console.error('Trigger user reindex error:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger reindex' });
  }
}

