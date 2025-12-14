# Versionsverwaltung - NoteNest

## 📋 Übersicht

NoteNest verwendet [Semantic Versioning](https://semver.org/lang/de/) (SemVer) für die Versionsverwaltung.

**Format**: `MAJOR.MINOR.PATCH`

- **MAJOR** (X.0.0): Breaking Changes - Inkompatible API-Änderungen
- **MINOR** (0.X.0): Neue Features - Rückwärtskompatibel
- **PATCH** (0.0.X): Bugfixes - Rückwärtskompatibel

## 🚀 Version-Management Script

Wir haben ein Script für die Versionsverwaltung erstellt:

```bash
# Aktuelle Version anzeigen
npm run version:get

# Version manuell setzen
npm run version:set 1.0.0

# Version automatisch erhöhen
npm run version:bump patch    # 1.0.0 → 1.0.1
npm run version:bump minor    # 1.0.0 → 1.1.0
npm run version:bump major     # 1.0.0 → 2.0.0

# Release erstellen (setzt Version, aktualisiert CHANGELOG, erstellt Git-Tag)
npm run version:release 1.0.0 "Initial release"
```

## 📝 CHANGELOG.md

Alle Änderungen werden in `CHANGELOG.md` dokumentiert.

### Format

```markdown
## [1.0.0] - 2024-01-15

### ✨ Features
- Neue Funktionalität X

### 🐛 Bugfixes
- Behobener Fehler Y

### 🔒 Sicherheit
- Sicherheits-Update Z
```

### Kategorien

- **✨ Features**: Neue Funktionalitäten
- **🐛 Bugfixes**: Fehlerbehebungen
- **🔒 Sicherheit**: Sicherheitsrelevante Änderungen
- **🔧 Technische Details**: Technische Verbesserungen
- **📚 Dokumentation**: Dokumentations-Updates
- **🎨 UI/UX**: UI/UX-Verbesserungen
- **♻️ Refactoring**: Code-Verbesserungen
- **⚡ Performance**: Performance-Verbesserungen
- **🗑️ Deprecated**: Veraltete Features

## 🔖 Git-Tags

Jedes Release erhält einen Git-Tag:

```bash
# Tag erstellen
git tag -a v1.0.0 -m "Release v1.0.0"

# Tag pushen
git push origin v1.0.0
```

Das Version-Script erstellt Tags automatisch beim `release`-Befehl.

## 📦 Version in Code

Die Version wird an mehreren Stellen gespeichert:

1. **package.json** (Root, Backend, Frontend)
2. **version.ts** (Backend: `backend/src/config/version.ts`)
3. **version.ts** (Frontend: `frontend/src/config/version.ts`)
4. **CHANGELOG.md**

Das Version-Script aktualisiert alle diese Dateien automatisch.

## 🎯 Release-Prozess

### Vor einem Release

1. **CHANGELOG.md aktualisieren**
   ```bash
   # Alle Änderungen seit letztem Release dokumentieren
   # Kategorien korrekt zuordnen
   ```

2. **Tests ausführen**
   ```bash
   npm test
   ```

3. **Build testen**
   ```bash
   npm run build
   ```

4. **Release erstellen**
   ```bash
   npm run version:release 1.0.0 "Release v1.0.0"
   ```

5. **Änderungen committen und pushen**
   ```bash
   git add .
   git commit -m "Release v1.0.0"
   git push
   git push origin v1.0.0
   ```

### Nach einem Release

1. **Neue "Unreleased" Sektion in CHANGELOG.md** (wird automatisch erstellt)
2. **Version für nächste Entwicklung erhöhen**
   ```bash
   npm run version:bump patch  # Für Patch-Release
   npm run version:bump minor  # Für Feature-Release
   ```

## 🔍 Version im Health-Check

Die Version wird automatisch im Health-Check Endpoint angezeigt:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "versionInfo": {
    "version": "1.0.0",
    "buildDate": "2024-01-15T10:30:00.000Z",
    "gitCommit": "abc1234",
    "gitBranch": "main",
    "environment": "production"
  },
  ...
}
```

## 🐳 Docker Build

Beim Docker Build können Build-Informationen über Umgebungsvariablen übergeben werden:

```dockerfile
ARG BUILD_DATE
ARG GIT_COMMIT
ARG GIT_BRANCH

ENV BUILD_DATE=${BUILD_DATE}
ENV GIT_COMMIT=${GIT_COMMIT}
ENV GIT_BRANCH=${GIT_BRANCH}
```

Build:
```bash
docker build \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --build-arg GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD) \
  -t notenest:latest .
```

## 📊 Version-Historie

Aktuelle Version: **1.0.0**

Siehe `CHANGELOG.md` für vollständige Versionshistorie.

## 🎓 Best Practices

1. **Semantic Versioning befolgen**
   - Breaking Changes = Major
   - Neue Features = Minor
   - Bugfixes = Patch

2. **CHANGELOG.md aktuell halten**
   - Jede Änderung dokumentieren
   - Kategorien korrekt verwenden

3. **Git-Tags für Releases**
   - Jedes Release taggen
   - Tag-Message beschreibend

4. **Version-Script verwenden**
   - Automatische Synchronisation
   - Weniger Fehler

5. **Tests vor Release**
   - Alle Tests müssen bestehen
   - Build muss funktionieren

