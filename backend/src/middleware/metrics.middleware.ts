/**
 * Metrics Middleware
 * 
 * Erfasst Metriken für Rate Limiting und andere Events
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimitHits, bibleApiCalls, fileOperations, exportOperations } from '../config/metrics';
import { logWarn } from '../config/logger';

/**
 * Middleware zum Erfassen von Rate-Limit-Hits
 */
export function trackRateLimitHit(limiterName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Rate-Limit-Fehler werden von express-rate-limit behandelt
    // Diese Middleware wird nur aufgerufen, wenn Rate-Limit überschritten wurde
    if (res.statusCode === 429) {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      rateLimitHits.inc({ limiter: limiterName, ip });
      logWarn('Rate limit exceeded', {
        limiter: limiterName,
        ip,
        path: req.path,
        method: req.method,
      });
    }
    next();
  };
}

/**
 * Helper-Funktion zum Erfassen von Bible API Calls
 */
export function trackBibleApiCall(api: string, translation: string, status: 'success' | 'error') {
  bibleApiCalls.inc({ api, translation, status });
}

/**
 * Helper-Funktion zum Erfassen von File Operations
 */
export function trackFileOperation(operation: 'create' | 'read' | 'update' | 'delete', type: 'private' | 'shared') {
  fileOperations.inc({ operation, type });
}

/**
 * Helper-Funktion zum Erfassen von Export Operations
 */
export function trackExportOperation(format: 'pdf' | 'word' | 'markdown') {
  exportOperations.inc({ format });
}

