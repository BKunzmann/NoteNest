/**
 * Version Configuration
 * 
 * Zentrale Versions-Informationen für die Anwendung
 */

// Versionsnummer (wird automatisch aus package.json gelesen)
export const VERSION = '1.3.1';

// Build-Datum (wird beim Build gesetzt)
export const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString();

// Git-Commit-Hash (wird beim Build gesetzt, optional)
export const GIT_COMMIT = process.env.GIT_COMMIT || 'unknown';

// Git-Branch (wird beim Build gesetzt, optional)
export const GIT_BRANCH = process.env.GIT_BRANCH || 'unknown';

/**
 * Gibt vollständige Versions-Informationen zurück
 */
export function getVersionInfo() {
  return {
    version: VERSION,
    buildDate: BUILD_DATE,
    gitCommit: GIT_COMMIT.substring(0, 7), // Kurzer Hash (7 Zeichen)
    gitBranch: GIT_BRANCH,
    environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Gibt Versions-String für Logging zurück
 */
export function getVersionString(): string {
  const info = getVersionInfo();
  return `v${info.version} (${info.buildDate}) [${info.gitCommit}]`;
}

