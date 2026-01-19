/**
 * NoteNest Backend - Entry Point
 * 
 * Startet den Express-Server und initialisiert alle Services
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './config/database';
import logger, { logInfo, logError, logWarn } from './config/logger';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { VERSION, getVersionInfo } from './config/version';
import { 
  httpRequestDuration, 
  httpRequestTotal, 
  getMetrics,
  errorCounter 
} from './config/metrics';

// Lade Umgebungsvariablen
// Suche .env im Root-Verzeichnis (wenn aus backend/ gestartet wird)
// In Development: __dirname = backend/src, in Production: __dirname = backend/dist
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
// Fallback: Versuche auch .env im aktuellen Verzeichnis
if (!process.env.AUTH_MODE) {
  dotenv.config();
}

// Initialisiere Datenbank
try {
  initializeDatabase();
  logInfo('Database initialized');
  
  // Initialisiere Standard-Admin-Benutzer (asynchron, blockiert nicht)
  import('./config/database').then(({ initializeDefaultAdmin }) => {
    initializeDefaultAdmin().catch((error) => {
      logError('Failed to initialize default admin', error);
    });
  });
} catch (error) {
  logError('Failed to initialize database', error);
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting für alle API-Routes (außer Health Check und Auth, die eigene Limiter haben)
// Auth-Routes haben spezifische Limiter (loginLimiter, registerLimiter)
app.use('/api', (req, res, next) => {
  // Überspringe Rate Limiting für Auth-Routes (haben eigene Limiter)
  if (req.path.startsWith('/auth')) {
    return next();
  }
  // Überspringe Rate Limiting für Health Check und Metrics
  if (req.path === '/health' || req.path.startsWith('/metrics')) {
    return next();
  }
  // Wende API Limiter für alle anderen Routes an
  apiLimiter(req, res, next);
});

// Request Logging & Metrics Middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log Request
  logInfo('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  });
  
  // Log Response nach Abschluss
  res.on('finish', () => {
    const duration = Date.now() - start;
    const durationSeconds = duration / 1000;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    // Metriken aktualisieren
    httpRequestDuration.observe(
      { method: req.method, route: req.path, status_code: res.statusCode },
      durationSeconds
    );
    httpRequestTotal.inc({
      method: req.method,
      route: req.path,
      status_code: res.statusCode,
    });
    
    // Error-Metriken
    if (res.statusCode >= 400) {
      errorCounter.inc({
        type: res.statusCode >= 500 ? 'server' : 'client',
        endpoint: req.path,
      });
    }
    
    logger[logLevel]('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
    });
  });
  
  next();
});

// Metrics Endpoint (Prometheus)
app.get('/api/metrics', async (_req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logError('Failed to get metrics', error);
    res.status(500).send('Error generating metrics');
  }
});

// Health Check (ohne Rate Limiting)
app.get('/api/health', async (_req, res) => {
  try {
    const db = (await import('./config/database')).default;
    
    // Prüfe Datenbank-Verbindung
    let dbStatus = 'ok';
    try {
      db.prepare('SELECT 1').get();
    } catch (error) {
      dbStatus = 'error';
      logError('Database health check failed', error);
    }
    
    // System-Informationen
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({ 
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      version: VERSION,
      versionInfo: getVersionInfo(),
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      database: dbStatus,
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    logError('Health check failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Routes
import authRoutes from './routes/auth.routes';
import fileRoutes from './routes/file.routes';
import settingsRoutes from './routes/settings.routes';
import bibleRoutes from './routes/bible.routes';
import exportRoutes from './routes/export.routes';
import searchRoutes from './routes/search.routes';
import metricsRoutes from './routes/metrics.routes';
import adminRoutes from './routes/admin.routes';
import sharedFoldersRoutes from './routes/sharedFolders.routes';

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bible', bibleRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', metricsRoutes); // Metrics (ohne Rate Limiting für Monitoring)
app.use('/api/admin', adminRoutes);
app.use('/api/admin', sharedFoldersRoutes);

// Static Frontend (React-Build) ausliefern
// Im Docker-Image liegt der Build unter /app/frontend/build
// __dirname zeigt in Production auf /app/backend/dist → zwei Ebenen nach oben
const frontendBuildPath = path.join(__dirname, '../../frontend/build');

// Optional per ENV deaktivierbar (z.B. für reine API-Deployments)
if (process.env.SERVE_FRONTEND !== 'false') {
  // Statische Assets (JS, CSS, Bilder, etc.)
  app.use(express.static(frontendBuildPath));

  // Catch-all: alle Nicht-/api-Routen an das React-Frontend weiterleiten (SPA-Routing)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Error Handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logError('Unhandled error', err, {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message,
  });
});

// 404 Handler
app.use((req: express.Request, res: express.Response) => {
  logWarn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
  });
  
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Start Server
// Wichtig: 0.0.0.0 erlaubt Zugriff von außen (nicht nur localhost)
app.listen(PORT, '0.0.0.0', () => {
  const versionInfo = getVersionInfo();
  
  logInfo('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    version: VERSION,
  });
  
  console.log(`🚀 NoteNest Backend v${VERSION} running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server accessible from network: http://0.0.0.0:${PORT}`);
  console.log(`📊 Logs: ${process.env.LOG_DIR || path.join(__dirname, '../logs')}`);
  console.log(`🔖 Build: ${versionInfo.buildDate} [${versionInfo.gitCommit}]`);
});

