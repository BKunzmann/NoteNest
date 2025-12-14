/**
 * Datenbank-Konfiguration
 * 
 * Initialisiert die SQLite-Datenbank und erstellt Tabellen
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Für Development: Relativer Pfad zum Projekt-Root
// Für Production: Absoluter Pfad aus Umgebungsvariable
const getDbPath = (): string => {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return '/data/database/notenest.db';
  }
  
  // Development: Relativer Pfad
  return path.join(__dirname, '../../data/database/notenest.db');
};

const DB_PATH = getDbPath();

// Stelle sicher, dass Datenbank-Verzeichnis existiert
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = new Database(DB_PATH);

// Aktiviere Foreign Keys
db.pragma('foreign_keys = ON');

/**
 * Initialisiert die Datenbank-Schemas
 * Erstellt alle Tabellen, falls sie nicht existieren
 */
export function initializeDatabase(): void {
  // Tabelle: users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255),  -- NULL wenn NAS-Auth
      email VARCHAR(255),
      auth_type VARCHAR(20) DEFAULT 'local' NOT NULL,  -- 'local' | 'ldap' | 'synology'
      auth_source VARCHAR(255),  -- LDAP-DN oder Synology-User-ID
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1 NOT NULL,
      CHECK (auth_type IN ('local', 'ldap', 'synology'))
    )
  `);

  // Tabelle: user_settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      private_folder_path VARCHAR(500),
      shared_folder_path VARCHAR(500),
      theme VARCHAR(20) DEFAULT 'light' NOT NULL,
      default_export_size VARCHAR(10) DEFAULT 'A4' NOT NULL,
      default_bible_translation VARCHAR(20) DEFAULT 'LUT' NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    )
  `);

  // Tabelle: user_bible_favorites
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_bible_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      translation VARCHAR(20) NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, translation)
    )
  `);

  // Index für user_bible_favorites (für Sortierung)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_order 
    ON user_bible_favorites(user_id, display_order)
  `);

  // Tabelle: sessions (für JWT-Blacklist oder Session-Tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_id VARCHAR(255) NOT NULL UNIQUE,  -- JWT jti (JWT ID)
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Index für sessions (für schnelle Abfragen)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token 
    ON sessions(token_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires 
    ON sessions(expires_at)
  `);

  // Tabelle: bible_verses (Lokale Public-Domain-Übersetzungen)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bible_verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation VARCHAR(20) NOT NULL,
      book VARCHAR(50) NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(translation, book, chapter, verse)
    )
  `);

  // Index für bible_verses (für schnelle Lookups)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bible_lookup 
    ON bible_verses(translation, book, chapter, verse)
  `);

  // Tabelle: bible_cache (API-Ergebnisse)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bible_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference VARCHAR(50) NOT NULL,  -- 'PSA.23.3', 'GEN.1.1'
      translation VARCHAR(20) NOT NULL,
      text TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reference, translation)
    )
  `);

  // Index für bible_cache
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cache_lookup 
    ON bible_cache(reference, translation)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cache_expires 
    ON bible_cache(expires_at)
  `);

  // Tabelle: file_metadata (Optional: für schnelle Suche/Indexierung)
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      parent_folder VARCHAR(500),
      file_size INTEGER,
      last_modified DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, file_path)
    )
  `);

  // Index für file_metadata
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_file_user_path 
    ON file_metadata(user_id, file_path)
  `);

  console.log('✅ Database initialized');
}

// Export database instance
// @ts-ignore - better-sqlite3 type export issue (known TypeScript limitation)
export default db;

