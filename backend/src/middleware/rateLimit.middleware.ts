/**
 * Rate Limiting Middleware
 * 
 * Verhindert Brute-Force-Angriffe und schützt vor übermäßigen API-Calls
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter für Login-Versuche
 * 5 Versuche pro 15 Minuten pro IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 5, // 5 Versuche
  message: {
    error: 'Too many login attempts',
    message: 'Zu viele Login-Versuche. Bitte versuchen Sie es in 15 Minuten erneut.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Zähle auch erfolgreiche Requests
  skipFailedRequests: false, // Zähle auch fehlgeschlagene Requests
});

/**
 * Rate Limiter für allgemeine API-Calls
 * 100 Requests pro Minute pro IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 Minute
  max: 100, // 100 Requests
  message: {
    error: 'Too many requests',
    message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Zähle nur fehlgeschlagene Requests nicht
  skipFailedRequests: false,
});

/**
 * Rate Limiter für PDF-Export
 * 10 Exports pro Stunde pro User
 * 
 * WICHTIG: Dieser Limiter benötigt User-ID, daher wird er in den Routes angewendet
 */
export const pdfExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 10, // 10 Exports
  message: {
    error: 'Too many PDF exports',
    message: 'Zu viele PDF-Exports. Bitte versuchen Sie es in einer Stunde erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  // Key-Generator: Verwende User-ID statt IP (wenn verfügbar)
  keyGenerator: (req) => {
    // Wenn User authentifiziert ist, verwende User-ID
    if ((req as any).user?.id) {
      return `pdf-export-${(req as any).user.id}`;
    }
    // Fallback: IP-Adresse
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Rate Limiter für Registrierung
 * 3 Registrierungen pro Stunde pro IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 3, // 3 Registrierungen
  message: {
    error: 'Too many registrations',
    message: 'Zu viele Registrierungsversuche. Bitte versuchen Sie es in einer Stunde erneut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

