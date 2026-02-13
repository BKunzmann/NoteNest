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
      is_admin BOOLEAN DEFAULT 0 NOT NULL,
      CHECK (auth_type IN ('local', 'ldap', 'synology'))
    )
  `);

  // Migration: Füge is_admin Spalte hinzu, falls sie nicht existiert
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0 NOT NULL`);
  } catch (error: any) {
    // Spalte existiert bereits, ignoriere Fehler
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning:', error.message);
    }
  }

  // Tabelle: user_settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      private_folder_path VARCHAR(500),
      shared_folder_path VARCHAR(500),
      default_note_type VARCHAR(10) DEFAULT 'private' NOT NULL,
      default_note_folder_path VARCHAR(500) DEFAULT '/' NOT NULL,
      sidebar_view_mode VARCHAR(20) DEFAULT 'folders' NOT NULL,
      theme VARCHAR(20) DEFAULT 'light' NOT NULL,
      default_export_size VARCHAR(10) DEFAULT 'A4' NOT NULL,
      default_bible_translation VARCHAR(20) DEFAULT 'LUT' NOT NULL,
      show_only_notes BOOLEAN DEFAULT 0 NOT NULL,
      non_editable_files_mode VARCHAR(10) DEFAULT 'gray' NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    )
  `);

  // Migration: Füge show_only_notes Spalte hinzu, falls sie nicht existiert
  try {
    db.exec(`ALTER TABLE user_settings ADD COLUMN show_only_notes BOOLEAN DEFAULT 0 NOT NULL`);
  } catch (error: any) {
    // Spalte existiert bereits, ignoriere Fehler
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning:', error.message);
    }
  }

  // Migration: Füge default_note_type Spalte hinzu, falls sie nicht existiert
  try {
    db.exec(`ALTER TABLE user_settings ADD COLUMN default_note_type VARCHAR(10) DEFAULT 'private' NOT NULL`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning:', error.message);
    }
  }

  // Migration: Füge default_note_folder_path Spalte hinzu, falls sie nicht existiert
  try {
    db.exec(`ALTER TABLE user_settings ADD COLUMN default_note_folder_path VARCHAR(500) DEFAULT '/' NOT NULL`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning:', error.message);
    }
  }

  // Migration: Füge sidebar_view_mode Spalte hinzu, falls sie nicht existiert
  try {
    db.exec(`ALTER TABLE user_settings ADD COLUMN sidebar_view_mode VARCHAR(20) DEFAULT 'folders' NOT NULL`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning:', error.message);
    }
  }

  // Migration: Verlauf in der Sidebar standardmäßig deaktivieren
  db.exec(`
    UPDATE user_settings
    SET sidebar_view_mode = 'folders'
    WHERE sidebar_view_mode IS NULL OR sidebar_view_mode = 'recent'
  `);

  // Migration: Füge non_editable_files_mode Spalte hinzu, falls sie nicht existiert
  try {
    db.exec(`ALTER TABLE user_settings ADD COLUMN non_editable_files_mode VARCHAR(10) DEFAULT 'gray' NOT NULL`);
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('Migration warning:', error.message);
    }
  }

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

  // Tabelle: user_shared_folders (Mehrere Shared-Ordner pro User, NAS-Mode)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_shared_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      folder_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, folder_path)
    )
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

  // Tabelle: app_config (globale App-Konfiguration, u.a. Suchindex-Einstellungen)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);

  // Standard-Konfigurationseinträge für den Suchindex
  db.exec(`
    INSERT OR IGNORE INTO app_config (key, value, description) VALUES
      ('index_notes_only', 'true', 'Nur Notizdateien (Markdown/TXT) indexieren'),
      ('index_parallel_workers', '4', 'Anzahl paralleler Worker für Indexierung'),
      ('index_max_file_size_mb', '50', 'Maximale Dateigröße für Indexierung in MB')
  `);

  // Standard-Konfiguration für ausgeblendete Ordner
  const defaultHiddenFolders = JSON.stringify([
    '._DAV',
    '.Trashes',
    '@eaDir',
    '#recycle',
    '.DS_Store',
    'Thumbs.db',
    '.git',
    '.svn',
    '.idea',
    '.vscode',
    'node_modules'
  ]);
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO app_config (key, value, description) VALUES
      (?, ?, 'Liste der Ordner, die in der Dateiansicht ausgeblendet werden (JSON-Array)')
  `);
  stmt.run('hidden_folders', defaultHiddenFolders);

  // Tabelle: search_index (Metadaten pro indexierter Datei)
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(10) NOT NULL, -- 'private' | 'shared'
      file_name VARCHAR(255) NOT NULL,
      file_extension VARCHAR(10) NOT NULL,
      content_hash VARCHAR(64) NOT NULL,
      file_size INTEGER NOT NULL,
      word_count INTEGER,
      indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_modified DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, file_path, file_type)
    )
  `);

  // Indexe für search_index
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_index_user_path
    ON search_index(user_id, file_path, file_type)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_index_extension
    ON search_index(file_extension)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_index_modified
    ON search_index(last_modified)
  `);

  // Tabelle: search_tokens (invertierter Index für Textsuche)
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token VARCHAR(255) NOT NULL,
      file_id INTEGER NOT NULL,
      line_number INTEGER,
      position INTEGER,
      context TEXT,
      FOREIGN KEY (file_id) REFERENCES search_index(id) ON DELETE CASCADE
    )
  `);

  // Indexe für search_tokens
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_tokens_token
    ON search_tokens(token)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_tokens_file
    ON search_tokens(file_id)
  `);

  console.log('✅ Database initialized');
}

/**
 * Initialisiert einen Standard-Admin-Benutzer, falls keiner existiert
 */
export async function initializeDefaultAdmin(): Promise<void> {
  try {
    // Prüfe, ob bereits ein Admin existiert
    const adminExists = db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1').get();
    if (adminExists) {
      console.log('✅ Admin-Benutzer existiert bereits');
      return;
    }

    // Hole Admin-Credentials aus Umgebungsvariablen oder verwende Defaults
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@notenest.local';

    // Prüfe, ob Benutzer mit diesem Username bereits existiert
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
    if (existingUser) {
      // Benutzer existiert, mache ihn zum Admin
      db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?').run(adminUsername);
      console.log(`✅ Benutzer "${adminUsername}" wurde zum Admin gemacht`);
      return;
    }

    // Importiere hashPassword asynchron
    const { hashPassword } = await import('../services/auth.service');
    const passwordHash = await hashPassword(adminPassword);

    // Erstelle Admin-Benutzer
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, email, auth_type, is_admin)
      VALUES (?, ?, ?, 'local', 1)
    `).run(adminUsername, passwordHash, adminEmail);

    const userId = result.lastInsertRowid as number;

    // Erstelle Standard-Einstellungen
    const privatePath = process.env.NAS_HOMES_PATH 
      ? `${process.env.NAS_HOMES_PATH}/${adminUsername}`
      : process.env.NODE_ENV === 'production'
      ? `/data/users/${adminUsername}`
      : `/app/data/users/${adminUsername}`;
    
    const sharedPath = process.env.NAS_SHARED_PATH || (
      process.env.NODE_ENV === 'production'
        ? '/data/shared'
        : '/app/data/shared'
    );
    
    db.prepare(`
      INSERT INTO user_settings (
        user_id,
        private_folder_path,
        shared_folder_path,
        default_note_type,
        default_note_folder_path,
        sidebar_view_mode
      )
      VALUES (?, ?, ?, 'private', '/', 'folders')
    `).run(userId, privatePath, sharedPath);

    // Erstelle Benutzer-Ordner, falls nicht vorhanden
    try {
      const fs = await import('fs');
      if (!fs.existsSync(privatePath)) {
        fs.mkdirSync(privatePath, { recursive: true });
        console.log(`✅ Created admin user directory: ${privatePath}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not create admin user directory: ${privatePath}`, error);
    }

    console.log('✅ Standard-Admin-Benutzer erstellt');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ⚠️  Bitte ändern Sie das Passwort nach dem ersten Login!`);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Standard-Admin-Benutzers:', error);
    // Nicht beenden, da die App auch ohne Admin funktionieren sollte
  }
}

// Export database instance
// @ts-ignore - better-sqlite3 type export issue (known TypeScript limitation)
export default db;
