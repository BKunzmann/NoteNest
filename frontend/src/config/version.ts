/**
 * Version Configuration
 * 
 * Zentrale Versions-Informationen für das Frontend
 */

// Versionsnummer (wird automatisch aus package.json gelesen)
export const VERSION = '1.0.0';

// Build-Datum (wird beim Build gesetzt)
// Vite verwendet import.meta.env, aber nur Variablen mit VITE_ Prefix sind verfügbar
// Für Build-Zeit-Variablen verwenden wir import.meta.env oder Fallback
export const BUILD_DATE = (import.meta.env.VITE_BUILD_DATE as string | undefined) || new Date().toISOString();

// Git-Commit-Hash (wird beim Build gesetzt, optional)
export const GIT_COMMIT = (import.meta.env.VITE_GIT_COMMIT as string | undefined) || 'unknown';

/**
 * Gibt vollständige Versions-Informationen zurück
 */
export function getVersionInfo() {
  return {
    version: VERSION,
    buildDate: BUILD_DATE,
    gitCommit: GIT_COMMIT.substring(0, 7), // Kurzer Hash (7 Zeichen)
    environment: import.meta.env.MODE || 'development',
  };
}

/**
 * Gibt Versions-String für Anzeige zurück
 */
export function getVersionString(): string {
  const info = getVersionInfo();
  return `v${info.version}`;
}

