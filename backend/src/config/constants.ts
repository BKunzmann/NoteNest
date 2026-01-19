/**
 * Konstanten für die Anwendung
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FOLDER_DEPTH = 10;
export const JWT_ACCESS_TOKEN_EXPIRY = '15m';
export const JWT_REFRESH_TOKEN_EXPIRY = '7d';
export const BIBLE_CACHE_TTL = 3600; // 1 Stunde in Sekunden

/**
 * Deployment-Modus
 * - standalone: Lokale Benutzer-Verwaltung, Selbstregistrierung erlaubt
 * - nas: NAS-Integration, nur Admin erstellt Benutzer, NAS-Pfade
 */
export const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'standalone';
export const IS_STANDALONE_MODE = DEPLOYMENT_MODE === 'standalone';
export const IS_NAS_MODE = DEPLOYMENT_MODE === 'nas';

/**
 * Registrierung aktiviert/deaktiviert
 * In NAS-Mode standardmäßig deaktiviert, kann aber überschrieben werden
 */
export const REGISTRATION_ENABLED = process.env.REGISTRATION_ENABLED === 'true' 
  ? true 
  : process.env.REGISTRATION_ENABLED === 'false'
  ? false
  : IS_STANDALONE_MODE; // Default: true in standalone, false in nas

