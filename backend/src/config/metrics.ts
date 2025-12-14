/**
 * Prometheus Metrics Configuration
 * 
 * Erstellt Metriken für Monitoring
 */

import client from 'prom-client';

// Erstelle Registry
const register = new client.Registry();

// Standard-Metriken (CPU, Memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'notenest_',
});

// Custom Metriken

/**
 * HTTP Request Duration Histogram
 * Misst die Dauer von HTTP-Requests
 */
export const httpRequestDuration = new client.Histogram({
  name: 'notenest_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // Buckets in Sekunden
  registers: [register],
});

/**
 * HTTP Request Counter
 * Zählt alle HTTP-Requests
 */
export const httpRequestTotal = new client.Counter({
  name: 'notenest_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Active Users Gauge
 * Anzahl aktiver Benutzer
 */
export const activeUsers = new client.Gauge({
  name: 'notenest_active_users',
  help: 'Number of active users',
  registers: [register],
});

/**
 * Database Query Duration Histogram
 * Misst die Dauer von Datenbank-Queries
 */
export const dbQueryDuration = new client.Histogram({
  name: 'notenest_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

/**
 * Bible API Calls Counter
 * Zählt API-Calls zu externen Bibel-APIs
 */
export const bibleApiCalls = new client.Counter({
  name: 'notenest_bible_api_calls_total',
  help: 'Total number of Bible API calls',
  labelNames: ['api', 'translation', 'status'],
  registers: [register],
});

/**
 * File Operations Counter
 * Zählt Dateioperationen
 */
export const fileOperations = new client.Counter({
  name: 'notenest_file_operations_total',
  help: 'Total number of file operations',
  labelNames: ['operation', 'type'], // operation: create, read, update, delete; type: private, shared
  registers: [register],
});

/**
 * Rate Limit Hits Counter
 * Zählt Rate-Limit-Überschreitungen
 */
export const rateLimitHits = new client.Counter({
  name: 'notenest_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['limiter', 'ip'],
  registers: [register],
});

/**
 * Export Operations Counter
 * Zählt Export-Operationen
 */
export const exportOperations = new client.Counter({
  name: 'notenest_export_operations_total',
  help: 'Total number of export operations',
  labelNames: ['format'], // format: pdf, word, markdown
  registers: [register],
});

/**
 * Error Counter
 * Zählt Fehler nach Typ
 */
export const errorCounter = new client.Counter({
  name: 'notenest_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'endpoint'], // type: database, api, file, auth
  registers: [register],
});

/**
 * Gibt alle Metriken als Prometheus-Format zurück
 */
export function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Gibt Metriken-Registry zurück
 */
export function getRegistry(): client.Registry {
  return register;
}

export default register;

