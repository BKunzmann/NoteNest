#!/usr/bin/env node
/**
 * Docker Entrypoint Script
 * Generiert automatisch JWT-Secrets, wenn sie fehlen
 * Läuft vor dem eigentlichen Start der Anwendung
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_FILE = process.env.ENV_FILE || '/app/.env';
const ENV_EXAMPLE = process.env.ENV_EXAMPLE || '/app/.env.example';

console.log('🔧 NoteNest Docker Entrypoint');
console.log('');

/**
 * Generiert ein sicheres Secret (Base64, 32 Bytes)
 */
function generateSecret() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Liest eine .env Datei und gibt sie als Objekt zurück
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    }
  });
  
  return env;
}

/**
 * Schreibt eine .env Datei
 */
function writeEnvFile(filePath, env) {
  const lines = [];
  
  // Lese Original-Datei für Kommentare und Formatierung
  let originalContent = '';
  if (fs.existsSync(filePath)) {
    originalContent = fs.readFileSync(filePath, 'utf8');
  } else if (fs.existsSync(ENV_EXAMPLE)) {
    originalContent = fs.readFileSync(ENV_EXAMPLE, 'utf8');
  }
  
  const originalLines = originalContent.split('\n');
  const updatedEnv = { ...env };
  
  // Behalte Formatierung und Kommentare bei
  originalLines.forEach(line => {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      // Kommentar oder Leerzeile
      lines.push(line);
    } else {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = updatedEnv[key] !== undefined ? updatedEnv[key] : match[2].trim();
        lines.push(`${key}=${value}`);
        delete updatedEnv[key];
      } else {
        lines.push(line);
      }
    }
  });
  
  // Füge neue Variablen hinzu
  Object.keys(updatedEnv).forEach(key => {
    lines.push(`${key}=${updatedEnv[key]}`);
  });
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

/**
 * Hauptfunktion
 */
function main() {
  let env = {};
  let needsUpdate = false;
  
  // Prüfe ob .env existiert
  if (fs.existsSync(ENV_FILE)) {
    env = parseEnvFile(ENV_FILE);
    console.log('✅ .env Datei gefunden');
  } else {
    console.log('⚠️  .env Datei nicht gefunden');
    
    if (fs.existsSync(ENV_EXAMPLE)) {
      console.log('📋 Kopiere .env.example zu .env...');
      fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
      env = parseEnvFile(ENV_FILE);
      console.log('✅ .env erstellt');
    } else {
      console.log('⚠️  .env.example nicht gefunden, erstelle leere .env');
      env = {};
    }
    needsUpdate = true;
  }
  
  // Prüfe JWT_SECRET
  if (!env.JWT_SECRET || 
      env.JWT_SECRET === '' || 
      env.JWT_SECRET === 'your-super-secret-jwt-key-here') {
    console.log('🔑 Generiere JWT_SECRET...');
    env.JWT_SECRET = generateSecret();
    needsUpdate = true;
    console.log('✅ JWT_SECRET generiert');
  } else {
    console.log('✅ JWT_SECRET bereits vorhanden');
  }
  
  // Prüfe JWT_REFRESH_SECRET
  if (!env.JWT_REFRESH_SECRET || 
      env.JWT_REFRESH_SECRET === '' || 
      env.JWT_REFRESH_SECRET === 'your-super-secret-refresh-key-here') {
    console.log('🔑 Generiere JWT_REFRESH_SECRET...');
    env.JWT_REFRESH_SECRET = generateSecret();
    needsUpdate = true;
    console.log('✅ JWT_REFRESH_SECRET generiert');
  } else {
    console.log('✅ JWT_REFRESH_SECRET bereits vorhanden');
  }
  
  // Speichere .env wenn Änderungen vorgenommen wurden
  if (needsUpdate) {
    console.log('');
    console.log('💾 Speichere .env...');
    writeEnvFile(ENV_FILE, env);
    console.log('✅ .env aktualisiert');
  } else {
    console.log('');
    console.log('✅ Alle Secrets vorhanden, keine Änderungen nötig');
  }
  
  // Setze Umgebungsvariablen für den aktuellen Prozess
  Object.keys(env).forEach(key => {
    if (process.env[key] === undefined) {
      process.env[key] = env[key];
    }
  });
  
  console.log('');
  console.log('🚀 Starte Anwendung...');
  console.log('');
}

// Führe Entrypoint aus
main();

// Starte den eigentlichen Befehl (wird von Docker als CMD übergeben)
// Das Entrypoint-Script wird mit dem CMD als Argumente aufgerufen
const args = process.argv.slice(2);
if (args.length > 0) {
  // Ersetze den aktuellen Prozess mit dem Befehl
  const { spawn } = require('child_process');
  const child = spawn(args[0], args.slice(1), {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code || 0);
    }
  });
  
  child.on('error', (error) => {
    console.error('❌ Fehler beim Starten der Anwendung:', error);
    process.exit(1);
  });
  
  // Weiterleite Signale
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  process.on('SIGINT', () => child.kill('SIGINT'));
} else {
  console.log('⚠️  Kein Befehl angegeben, nur Entrypoint ausgeführt');
  process.exit(0);
}

