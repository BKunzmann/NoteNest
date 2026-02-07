/**
 * Version Configuration
 * 
 * Zentrale Versions-Informationen fuer das Frontend
 */

// Versionsnummer (wird automatisch aus package.json gelesen)
export const VERSION = '1.0.0';

// Build-Datum (wird beim Build gesetzt)
export const BUILD_DATE = import.meta.env.VITE_BUILD_DATE || new Date().toISOString();

// Git-Commit-Hash (wird beim Build gesetzt, optional)
export const GIT_COMMIT = import.meta.env.VITE_GIT_COMMIT || 'unknown';

/**
 * Gibt vollstaendige Versions-Informationen zurueck
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
 * Gibt Versions-String fuer Anzeige zurueck
 */
export function getVersionString(): string {
  const info = getVersionInfo();
  return `v${info.version}`;
}
