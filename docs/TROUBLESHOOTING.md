# Troubleshooting

## TypeScript-Fehler: "Cannot find module" oder "Cannot find name 'process'"

### Problem

Die IDE zeigt Fehler wie:
- `Cannot find module 'better-sqlite3'`
- `Cannot find module 'path'`
- `Cannot find name 'process'`
- `Cannot find name '__dirname'`
- `Cannot find type definition file for 'node'`

### Ursache

Die Dependencies sind noch nicht installiert. `node_modules` fehlt.

### Lösung: Entwicklung in Docker (Empfohlen)

**Option 1: Entwicklung komplett in Docker** ✅

Da `better-sqlite3` native Kompilierung benötigt (Visual Studio Build Tools), ist die Entwicklung in Docker die einfachste Lösung:

1. **Stelle sicher, dass Docker läuft:**
   ```powershell
   docker --version
   docker ps
   ```

2. **Starte die Entwicklungsumgebung:**
   ```powershell
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Die IDE-Fehler können ignoriert werden**, da der Code im Container läuft und dort alle Dependencies installiert sind.

**Vorteile:**
- ✅ Keine lokale Installation von Build Tools nötig
- ✅ Konsistente Entwicklungsumgebung
- ✅ Einfacher für Deployment

**Nachteile:**
- ⚠️ IDE zeigt weiterhin TypeScript-Fehler (Code läuft aber im Container)

---

### Alternative: Lokale Installation

**Option 2: Visual Studio Build Tools installieren**

Falls du die IDE-Fehler beheben möchtest:

1. **Installiere Visual Studio Build Tools:**
   - Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Wähle "Desktop development with C++" Workload
   - Installiere Windows SDK (wird automatisch angeboten)

2. **Installiere Dependencies:**
   ```powershell
   cd backend
   npm install
   ```

3. **Starte IDE neu**

**Vorteile:**
- ✅ IDE-Fehler verschwinden
- ✅ Vollständige TypeScript-Unterstützung

**Nachteile:**
- ⚠️ ~6 GB Download
- ⚠️ Längere Installationszeit

---

## Weitere häufige Probleme

### npm nicht gefunden

**Problem:** `npm : Die Benennung "npm" wurde nicht als Name eines Cmdlet... erkannt`

**Lösung:**
1. Node.js installieren (siehe oben)
2. PowerShell/CMD neu starten
3. PATH prüfen: `$env:PATH` sollte Node.js enthalten

### Port bereits belegt

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Lösung:**
1. Port ändern in `.env`: `PORT=3001`
2. Oder Prozess beenden, der Port 3000 verwendet:
   ```powershell
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

### Docker-Probleme

**Problem:** Container startet nicht oder Fehler beim Build

**Lösung:**
1. Docker Desktop läuft? Prüfe: `docker ps`
2. Docker neu starten
3. Build-Cache löschen: `docker-compose build --no-cache`

---

## Hilfe

Falls Probleme weiterhin bestehen:
1. Prüfe Logs: `docker-compose logs`
2. Prüfe `.env` Datei (korrekte Werte?)
3. Prüfe `package.json` (Dependencies vorhanden?)
4. Prüfe `tsconfig.json` (korrekt konfiguriert?)

