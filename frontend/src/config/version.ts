/**
 * Version Configuration
 * 
 * Zentrale Versions-Informationen für das Frontend
 */

// Versionsnummer (wird automatisch aus package.json gelesen)
export const VERSION = '1.0.0';

// Build-Datum (wird beim Build gesetzt)
export const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString();

// Git-Commit-Hash (wird beim Build gesetzt, optional)
export const GIT_COMMIT = process.env.GIT_COMMIT || 'unknown';

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
