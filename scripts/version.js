#!/usr/bin/env node

/**
 * Version Management Script
 * 
 * Hilft bei der Versionsverwaltung:
 * - Liest aktuelle Version aus package.json
 * - Aktualisiert Version in allen package.json Dateien
 * - Erstellt Git-Tag
 * - Aktualisiert CHANGELOG.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const ROOT_PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');
const BACKEND_PACKAGE_JSON = path.join(ROOT_DIR, 'backend', 'package.json');
const FRONTEND_PACKAGE_JSON = path.join(ROOT_DIR, 'frontend', 'package.json');
const BACKEND_VERSION_TS = path.join(ROOT_DIR, 'backend', 'src', 'config', 'version.ts');
const FRONTEND_VERSION_TS = path.join(ROOT_DIR, 'frontend', 'src', 'config', 'version.ts');
const CHANGELOG = path.join(ROOT_DIR, 'CHANGELOG.md');

/**
 * Liest Version aus package.json
 */
function getVersion(packageJsonPath) {
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  const json = JSON.parse(content);
  return json.version;
}

/**
 * Setzt Version in package.json
 */
function setVersion(packageJsonPath, version) {
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  const json = JSON.parse(content);
  json.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✅ Updated ${path.relative(ROOT_DIR, packageJsonPath)} to ${version}`);
}

/**
 * Setzt Version in TypeScript-Version-Datei
 */
function setVersionInTS(tsPath, version) {
  let content = fs.readFileSync(tsPath, 'utf-8');
  content = content.replace(/export const VERSION = ['"](.*?)['"];/, `export const VERSION = '${version}';`);
  fs.writeFileSync(tsPath, content);
  console.log(`✅ Updated ${path.relative(ROOT_DIR, tsPath)} to ${version}`);
}

/**
 * Aktualisiert CHANGELOG.md mit Release-Datum
 */
function updateChangelog(version) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let content = fs.readFileSync(CHANGELOG, 'utf-8');
  
  // Ersetze [Unreleased] mit [version] - date
  content = content.replace(
    /## \[Unreleased\]/,
    `## [${version}] - ${date}\n\n## [Unreleased]`
  );
  
  fs.writeFileSync(CHANGELOG, content);
  console.log(`✅ Updated CHANGELOG.md with release ${version}`);
}

/**
 * Erstellt Git-Tag
 */
function createGitTag(version, message) {
  try {
    execSync(`git tag -a v${version} -m "${message}"`, { stdio: 'inherit' });
    console.log(`✅ Created git tag v${version}`);
  } catch (error) {
    console.error(`❌ Failed to create git tag: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Hauptfunktion
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'get') {
    // Zeige aktuelle Version
    const version = getVersion(ROOT_PACKAGE_JSON);
    console.log(`Current version: ${version}`);
    return;
  }
  
  if (command === 'set') {
    // Setze neue Version
    const newVersion = args[1];
    if (!newVersion) {
      console.error('❌ Please provide a version number (e.g., 1.0.0)');
      process.exit(1);
    }
    
    // Validiere Version-Format (Semantic Versioning)
    if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
      console.error('❌ Invalid version format. Use Semantic Versioning (e.g., 1.0.0)');
      process.exit(1);
    }
    
    console.log(`📦 Setting version to ${newVersion}...`);
    
    // Aktualisiere alle package.json Dateien
    setVersion(ROOT_PACKAGE_JSON, newVersion);
    setVersion(BACKEND_PACKAGE_JSON, newVersion);
    setVersion(FRONTEND_PACKAGE_JSON, newVersion);
    
    // Aktualisiere TypeScript-Version-Dateien
    setVersionInTS(BACKEND_VERSION_TS, newVersion);
    setVersionInTS(FRONTEND_VERSION_TS, newVersion);
    
    console.log(`\n✅ Version updated to ${newVersion} in all files`);
    return;
  }
  
  if (command === 'release') {
    // Erstelle Release
    const version = args[1];
    if (!version) {
      console.error('❌ Please provide a version number (e.g., 1.0.0)');
      process.exit(1);
    }
    
    const message = args[2] || `Release v${version}`;
    
    console.log(`🚀 Creating release v${version}...`);
    
    // Setze Version
    setVersion(ROOT_PACKAGE_JSON, version);
    setVersion(BACKEND_PACKAGE_JSON, version);
    setVersion(FRONTEND_PACKAGE_JSON, version);
    setVersionInTS(BACKEND_VERSION_TS, version);
    setVersionInTS(FRONTEND_VERSION_TS, version);
    
    // Aktualisiere CHANGELOG
    updateChangelog(version);
    
    // Erstelle Git-Tag
    createGitTag(version, message);
    
    console.log(`\n✅ Release v${version} created!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review CHANGELOG.md`);
    console.log(`   2. Commit changes: git add . && git commit -m "Release v${version}"`);
    console.log(`   3. Push tag: git push origin v${version}`);
    console.log(`   4. Push commits: git push`);
    return;
  }
  
  if (command === 'bump') {
    // Erhöhe Version (patch, minor, major)
    const type = args[1] || 'patch';
    if (!['patch', 'minor', 'major'].includes(type)) {
      console.error('❌ Invalid bump type. Use: patch, minor, or major');
      process.exit(1);
    }
    
    const currentVersion = getVersion(ROOT_PACKAGE_JSON);
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    let newVersion;
    if (type === 'major') {
      newVersion = `${major + 1}.0.0`;
    } else if (type === 'minor') {
      newVersion = `${major}.${minor + 1}.0`;
    } else {
      newVersion = `${major}.${minor}.${patch + 1}`;
    }
    
    console.log(`📦 Bumping ${type} version: ${currentVersion} → ${newVersion}`);
    
    // Setze neue Version
    setVersion(ROOT_PACKAGE_JSON, newVersion);
    setVersion(BACKEND_PACKAGE_JSON, newVersion);
    setVersion(FRONTEND_PACKAGE_JSON, newVersion);
    setVersionInTS(BACKEND_VERSION_TS, newVersion);
    setVersionInTS(FRONTEND_VERSION_TS, newVersion);
    
    console.log(`\n✅ Version bumped to ${newVersion}`);
    return;
  }
  
  // Hilfe anzeigen
  console.log(`
Version Management Script

Usage:
  node scripts/version.js <command> [options]

Commands:
  get                    Show current version
  set <version>          Set version (e.g., 1.0.0)
  bump [patch|minor|major]  Bump version (default: patch)
  release <version> [message]  Create release (sets version, updates CHANGELOG, creates git tag)

Examples:
  node scripts/version.js get
  node scripts/version.js set 1.0.0
  node scripts/version.js bump patch
  node scripts/version.js release 1.0.0 "Initial release"
`);
}

main();

