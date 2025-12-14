# Testing Guide

## ✅ Implementierte Tests

### Unit-Tests

#### 1. `auth.service.test.ts`
**Tests**:
- `hashPassword`: Prüft, ob Passwörter korrekt gehasht werden
- `verifyPassword`: Prüft Passwort-Verifizierung

**Ausführen**:
```bash
npm test -- auth.service.test.ts
```

#### 2. `rateLimit.middleware.test.ts`
**Tests**:
- `loginLimiter`: Prüft Login-Rate-Limiting (5 Versuche / 15 Min)
- `apiLimiter`: Prüft API-Rate-Limiting (100 Requests / Min)
- `pdfExportLimiter`: Prüft PDF-Export-Rate-Limiting (10 / Stunde)
- `registerLimiter`: Prüft Registrierungs-Rate-Limiting (3 / Stunde)

**Ausführen**:
```bash
npm test -- rateLimit.middleware.test.ts
```

#### 3. `logger.test.ts`
**Tests**:
- `logInfo`: Prüft Info-Logging
- `logError`: Prüft Error-Logging mit Error-Objekten
- `logWarn`: Prüft Warning-Logging
- `logDebug`: Prüft Debug-Logging

**Ausführen**:
```bash
npm test -- logger.test.ts
```

### Integration-Tests

#### 1. `health.integration.test.ts`
**Tests**:
- Health-Check Endpoint: Prüft `/api/health` Response
- Datenbank-Status: Prüft DB-Verbindung
- System-Informationen: Prüft Uptime, Memory
- Version: Prüft Version-String

**Ausführen**:
```bash
npm test -- health.integration.test.ts
```

#### 2. `auth.integration.test.ts`
**Tests**:
- Vollständiger Auth-Flow (Register → Login → Refresh)
- Duplicate Username: Prüft, ob doppelte Usernames abgelehnt werden
- Login mit korrekten/inkorrekten Credentials

**Ausführen**:
```bash
npm test -- auth.integration.test.ts
```

## 📝 Test-Struktur

```
backend/src/tests/
├── setup.ts                    # Globale Test-Konfiguration
├── unit/                       # Unit-Tests
│   ├── auth.service.test.ts
│   ├── rateLimit.middleware.test.ts
│   └── logger.test.ts
└── integration/                # Integration-Tests
    ├── health.integration.test.ts
    └── auth.integration.test.ts
```

## 🚀 Test-Ausführung

### Alle Tests
```bash
npm test
```

### Nur Unit-Tests
```bash
npm test -- --testPathPattern=unit
```

### Nur Integration-Tests
```bash
npm test -- --testPathPattern=integration
```

### Watch-Modus
```bash
npm run test:watch
```

### Mit Coverage
```bash
npm test -- --coverage
```

### Spezifischer Test
```bash
npm test -- auth.service.test.ts
```

## 📊 Coverage-Report

Nach Ausführung mit `--coverage`:
- **Text-Report**: In der Konsole
- **HTML-Report**: `backend/coverage/lcov-report/index.html`
- **LCOV-Report**: `backend/coverage/lcov.info`

## 🎯 Test-Best Practices

### 1. Test-Isolation
- Jeder Test sollte unabhängig sein
- Keine Abhängigkeiten zwischen Tests
- Cleanup nach jedem Test

### 2. Mocking
- Externe Dependencies mocken
- Datenbank: In-Memory für Tests
- Logger: Mock für saubere Test-Logs

### 3. Test-Namen
- Beschreibend: `should hash a password`
- Klar: `should reject an incorrect password`
- Strukturiert: `describe` → `it`

### 4. Test-Daten
- Realistische Test-Daten
- Edge Cases testen
- Fehlerfälle testen

## 🔧 Test-Setup

### Umgebungsvariablen
Tests verwenden automatisch:
- `NODE_ENV=test`
- `DB_PATH=:memory:` (In-Memory-Datenbank)
- `LOG_LEVEL=error` (Reduziertes Logging)

### Mock-Konfiguration
- Winston Logger wird gemockt
- Keine echten Datei-Operationen
- Keine echten API-Calls

## 📈 Coverage-Ziele

- **Backend**: > 80% Coverage
- **Kritische Funktionen**: 100% Coverage
  - Pfadvalidierung
  - Authentifizierung
  - Rate Limiting

## 🐛 Debugging

### Test-Debugging
```bash
# Mit Node Debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Mit VS Code
# Launch-Konfiguration in .vscode/launch.json
```

### Verbose Output
```bash
npm test -- --verbose
```

### Einzelnen Test ausführen
```bash
npm test -- -t "should hash a password"
```

## 🔄 Continuous Integration

### GitHub Actions Beispiel
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

## 📚 Weitere Ressourcen

- [Jest Dokumentation](https://jestjs.io/docs/getting-started)
- [Supertest Dokumentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

