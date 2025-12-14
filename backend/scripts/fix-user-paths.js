/**
 * Script zum Korrigieren der Benutzer-Pfade
 * 
 * Setzt alle Benutzer-Pfade auf Development-Pfade
 */

const Database = require('better-sqlite3');
const path = require('path');

// Pfad zur Datenbank
const DB_PATH = process.env.DB_PATH || (
  process.env.NODE_ENV === 'production'
    ? '/data/database/notenest.db'
    : path.join(__dirname, '../../data/database/notenest.db')
);

async function fixUserPaths() {
  console.log('🔧 Korrigiere Benutzer-Pfade...');
  console.log(`   DB-Pfad: ${DB_PATH}`);

  try {
    // Öffne Datenbank
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    // Hole alle Benutzer
    const users = db.prepare('SELECT id, username FROM users').all();
    console.log(`   Gefundene Benutzer: ${users.length}`);

    for (const user of users) {
      console.log(`\n   Bearbeite Benutzer: ${user.username} (ID: ${user.id})`);

      // Development-Pfade
      const privatePath = `/app/data/users/${user.username}`;
      const sharedPath = `/app/data/shared`;

      // Aktualisiere Settings
      const result = db.prepare(`
        UPDATE user_settings
        SET private_folder_path = ?,
            shared_folder_path = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(privatePath, sharedPath, user.id);

      console.log(`      ✅ Pfade aktualisiert:`);
      console.log(`         Private: ${privatePath}`);
      console.log(`         Shared: ${sharedPath}`);

      // Erstelle Ordner, falls nicht vorhanden
      const fs = require('fs');
      try {
        if (!fs.existsSync(privatePath)) {
          fs.mkdirSync(privatePath, { recursive: true });
          console.log(`      ✅ Ordner erstellt: ${privatePath}`);
        } else {
          console.log(`      ℹ️  Ordner existiert bereits: ${privatePath}`);
        }
      } catch (error) {
        console.warn(`      ⚠️  Konnte Ordner nicht erstellen: ${error.message}`);
      }
    }

    db.close();
    console.log('\n✅ Alle Benutzer-Pfade korrigiert!');

  } catch (error) {
    console.error('❌ Fehler beim Korrigieren der Pfade:', error);
    process.exit(1);
  }
}

// Führe Script aus
fixUserPaths();

