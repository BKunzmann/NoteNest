/**
 * Script zum Erstellen eines Test-Benutzers
 * 
 * Verwendung:
 *   node scripts/create-test-user.js [username] [password]
 * 
 * Beispiel:
 *   node scripts/create-test-user.js tester test123
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const argon2 = require('argon2');

// Pfad zur Datenbank
const DB_PATH = process.env.DB_PATH || (
  process.env.NODE_ENV === 'production'
    ? '/data/database/notenest.db'
    : path.join(__dirname, '../data/database/notenest.db')
);

// Argumente
const username = process.argv[2] || 'tester';
const password = process.argv[3] || 'test123';

async function createTestUser() {
  console.log('📝 Erstelle Test-Benutzer...');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   DB-Pfad: ${DB_PATH}`);

  try {
    // Öffne Datenbank
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    // Prüfe, ob Benutzer bereits existiert
    const existingUser = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
    if (existingUser) {
      console.log(`⚠️  Benutzer "${username}" existiert bereits (ID: ${existingUser.id})`);
      console.log('   Überspringe Erstellung...');
      db.close();
      return;
    }

    // Hash Passwort
    console.log('   Hashe Passwort...');
    const passwordHash = await argon2.hash(password);

    // Erstelle Benutzer
    console.log('   Erstelle Benutzer in Datenbank...');
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, email, auth_type)
      VALUES (?, ?, ?, 'local')
    `).run(username, passwordHash, `${username}@test.local`);

    const userId = result.lastInsertRowid;
    console.log(`   ✅ Benutzer erstellt (ID: ${userId})`);

    // Erstelle Standard-Einstellungen
    const privatePath = process.env.NAS_HOMES_PATH
      ? `${process.env.NAS_HOMES_PATH}/${username}`
      : process.env.NODE_ENV === 'production'
      ? `/data/users/${username}`
      : `/app/data/users/${username}`;

    const sharedPath = process.env.NAS_SHARED_PATH || (
      process.env.NODE_ENV === 'production'
        ? '/data/shared'
        : '/app/data/shared'
    );

    console.log('   Erstelle Benutzer-Einstellungen...');
    console.log(`      Private Pfad: ${privatePath}`);
    console.log(`      Shared Pfad: ${sharedPath}`);

    db.prepare(`
      INSERT INTO user_settings (user_id, private_folder_path, shared_folder_path)
      VALUES (?, ?, ?)
    `).run(userId, privatePath, sharedPath);

    console.log('   ✅ Einstellungen erstellt');

    // Erstelle Benutzer-Ordner (falls nicht vorhanden)
    const fs = require('fs');
    try {
      if (!fs.existsSync(privatePath)) {
        fs.mkdirSync(privatePath, { recursive: true });
        console.log(`   ✅ Ordner erstellt: ${privatePath}`);
      } else {
        console.log(`   ℹ️  Ordner existiert bereits: ${privatePath}`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Konnte Ordner nicht erstellen: ${error.message}`);
    }

    db.close();
    console.log('\n✅ Test-Benutzer erfolgreich erstellt!');
    console.log(`\n📋 Login-Daten:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`\n🔗 Login-URL: http://localhost:5173/login`);

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Test-Benutzers:', error);
    process.exit(1);
  }
}

// Führe Script aus
createTestUser();

