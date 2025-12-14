/**
 * Metrics Routes
 * 
 * Endpunkte für Monitoring und Metriken
 */

import { Router } from 'express';
import { getMetrics } from '../config/metrics';
import { generateLogReport } from '../utils/logAnalyzer';
import { logError } from '../config/logger';

const router = Router();

/**
 * GET /api/metrics
 * Gibt Prometheus-Metriken zurück
 */
router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logError('Failed to get metrics', error);
    res.status(500).send('Error generating metrics');
  }
});

/**
 * GET /api/metrics/log-report
 * Gibt Log-Analyse-Report zurück
 */
router.get('/log-report', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const logDir = process.env.LOG_DIR || './logs';
    const report = generateLogReport(logDir, days);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(report);
  } catch (error) {
    logError('Failed to generate log report', error);
    res.status(500).json({ error: 'Failed to generate log report' });
  }
});

export default router;

