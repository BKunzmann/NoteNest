/**
 * Export Controller
 * 
 * HTTP-Handler für Export-Endpunkte
 */

import { Request, Response } from 'express';
import { exportFileAsPDF, exportFileAsWord } from '../services/export.service';
import { getUserSettings } from '../services/settings.service';
import { trackExportOperation } from '../middleware/metrics.middleware';
import path from 'path';

/**
 * POST /api/export/pdf
 * Exportiert eine Datei als PDF
 * Body: { filePath: "/notes/test.md", fileType: "private", size?: "A4" | "A5" }
 */
export async function exportPDF(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { filePath, fileType, size } = req.body;
    
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({ error: 'filePath is required' });
      return;
    }
    
    if (!fileType || (fileType !== 'private' && fileType !== 'shared')) {
      res.status(400).json({ error: 'fileType must be "private" or "shared"' });
      return;
    }
    
    // Verwende Standard-Größe aus Settings, falls nicht angegeben
    let finalSize: 'A4' | 'A5' = size || 'A4';
    
    if (!size) {
      try {
        const settings = getUserSettings(req.user.id);
        if (settings?.default_export_size) {
          finalSize = settings.default_export_size as 'A4' | 'A5';
        }
      } catch (error) {
        // Ignoriere Fehler, verwende Standard
      }
    }
    
    // Validiere size
    if (finalSize !== 'A4' && finalSize !== 'A5') {
      finalSize = 'A4';
    }
    
    console.log(`Exporting PDF: ${filePath} (${fileType}, ${finalSize})`);
    
    // PDF generieren
    const pdfBuffer = await exportFileAsPDF(
      req.user.id,
      filePath,
      fileType,
      finalSize
    );
    
    // Dateiname für Download
    const fileName = path.basename(filePath, path.extname(filePath)) + '.pdf';
    
    // Metrics-Tracking
    trackExportOperation('pdf');
    
    // Response senden
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(pdfBuffer);
    
  } catch (error: any) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ 
      error: 'Failed to export PDF',
      details: error.message 
    });
  }
}

/**
 * POST /api/export/word
 * Exportiert eine Datei als Word-Dokument
 * Body: { filePath: "/notes/test.md", fileType: "private" }
 */
export async function exportWord(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { filePath, fileType } = req.body;
    
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({ error: 'filePath is required' });
      return;
    }
    
    if (!fileType || (fileType !== 'private' && fileType !== 'shared')) {
      res.status(400).json({ error: 'fileType must be "private" or "shared"' });
      return;
    }
    
    console.log(`Exporting Word: ${filePath} (${fileType})`);
    
    // Word-Dokument generieren
    const docxBuffer = await exportFileAsWord(
      req.user.id,
      filePath,
      fileType
    );
    
    // Dateiname für Download
    const fileName = path.basename(filePath, path.extname(filePath)) + '.docx';
    
    // Metrics-Tracking
    trackExportOperation('word');
    
    // Response senden
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(docxBuffer);
    
  } catch (error: any) {
    console.error('Error exporting Word:', error);
    res.status(500).json({ 
      error: 'Failed to export Word document',
      details: error.message 
    });
  }
}

