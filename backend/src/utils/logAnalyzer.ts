/**
 * Log Analyzer Utilities
 * 
 * Hilfsfunktionen für Log-Analyse
 */

import fs from 'fs';
import path from 'path';
import { logError } from '../config/logger';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: any;
}

/**
 * Analysiert Log-Dateien und extrahiert Statistiken
 */
export function analyzeLogs(logDir: string = './logs', days: number = 7): {
  totalEntries: number;
  errors: number;
  warnings: number;
  byLevel: Record<string, number>;
  byEndpoint: Record<string, number>;
  errorTypes: Record<string, number>;
  topErrors: Array<{ message: string; count: number }>;
} {
  const logFiles = getLogFiles(logDir, days);
  const entries: LogEntry[] = [];

  // Lese alle Log-Dateien
  for (const file of logFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          entries.push(entry);
        } catch (e) {
          // Ignoriere ungültige JSON-Zeilen
        }
      }
    } catch (error) {
      logError(`Failed to read log file: ${file}`, error);
    }
  }

  // Analysiere Einträge
  const stats = {
    totalEntries: entries.length,
    errors: 0,
    warnings: 0,
    byLevel: {} as Record<string, number>,
    byEndpoint: {} as Record<string, number>,
    errorTypes: {} as Record<string, number>,
    topErrors: [] as Array<{ message: string; count: number }>,
  };

  const errorMessages: Record<string, number> = {};

  for (const entry of entries) {
    // Level-Statistiken
    const level = entry.level || 'unknown';
    stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
    
    if (level === 'error') {
      stats.errors++;
      
      // Error-Typen
      const errorType = entry.error?.name || entry.type || 'unknown';
      stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + 1;
      
      // Top Errors
      const errorMsg = entry.message || entry.error?.message || 'Unknown error';
      errorMessages[errorMsg] = (errorMessages[errorMsg] || 0) + 1;
    }
    
    if (level === 'warn') {
      stats.warnings++;
    }
    
    // Endpoint-Statistiken
    if (entry.path) {
      stats.byEndpoint[entry.path] = (stats.byEndpoint[entry.path] || 0) + 1;
    }
  }

  // Top 10 Errors
  stats.topErrors = Object.entries(errorMessages)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return stats;
}

/**
 * Gibt alle Log-Dateien der letzten N Tage zurück
 */
function getLogFiles(logDir: string, days: number): string[] {
  const files: string[] = [];
  const now = new Date();
  
  try {
    if (!fs.existsSync(logDir)) {
      return files;
    }
    
    const allFiles = fs.readdirSync(logDir);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Suche nach Log-Dateien mit diesem Datum
      const matchingFiles = allFiles.filter(file => 
        file.includes(dateStr) && file.endsWith('.log')
      );
      
      for (const file of matchingFiles) {
        const filePath = path.join(logDir, file);
        if (fs.existsSync(filePath)) {
          files.push(filePath);
        }
      }
    }
  } catch (error) {
    logError(`Failed to read log directory: ${logDir}`, error);
  }
  
  return files;
}

/**
 * Erstellt einen Log-Analyse-Report
 */
export function generateLogReport(logDir: string = './logs', days: number = 7): string {
  const stats = analyzeLogs(logDir, days);
  
  let report = `\n📊 Log-Analyse Report (letzte ${days} Tage)\n`;
  report += '='.repeat(50) + '\n\n';
  
  report += `Gesamt-Einträge: ${stats.totalEntries}\n`;
  report += `Fehler: ${stats.errors}\n`;
  report += `Warnungen: ${stats.warnings}\n\n`;
  
  report += 'Nach Level:\n';
  for (const [level, count] of Object.entries(stats.byLevel)) {
    report += `  ${level}: ${count}\n`;
  }
  report += '\n';
  
  report += 'Top 10 Fehler:\n';
  for (const error of stats.topErrors) {
    report += `  ${error.count}x: ${error.message.substring(0, 60)}...\n`;
  }
  report += '\n';
  
  report += 'Nach Endpoint:\n';
  const sortedEndpoints = Object.entries(stats.byEndpoint)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [endpoint, count] of sortedEndpoints) {
    report += `  ${endpoint}: ${count}\n`;
  }
  
  return report;
}

