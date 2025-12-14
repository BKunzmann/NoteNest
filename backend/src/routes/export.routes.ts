/**
 * Export Routes
 * 
 * Endpunkte für Export-Funktionen
 */

import { Router } from 'express';
import { exportPDF, exportWord } from '../controllers/export.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { pdfExportLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Alle Export-Endpunkte erfordern Authentifizierung und Rate Limiting
router.post('/pdf', authenticateToken, pdfExportLimiter, exportPDF);
router.post('/word', authenticateToken, pdfExportLimiter, exportWord);

export default router;

