# Setup-Anleitung

## Voraussetzungen

- ✅ Node.js 18+ installiert
- ✅ Docker Desktop installiert und läuft
- ✅ Git installiert
- ✅ YouVersion API Key vorhanden
- ✅ Lokale Bibel-JSON-Dateien vorhanden (`lokale bibeln/`)

## Schritt 1: Umgebungsvariablen konfigurieren

**Wichtig:** JWT-Secrets werden automatisch generiert:
- ✅ Beim ersten Docker-Start (Entrypoint-Script)
- ✅ Beim Ausführen des Setup-Scripts
- ✅ Beim Pull & Deploy auf der NAS

Du musst sie **nicht manuell** generieren, es sei denn, du entwickelst ohne Docker.

### Option A: Automatisch (empfohlen)

**Windows (PowerShell):**
```powershell
.\scripts\setup-env.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

Das Script:
- ✅ Erstellt `.env` aus `.env.example` (falls nicht vorhanden)
- ✅ Generiert automatisch `JWT_SECRET` und `JWT_REFRESH_SECRET`
- ✅ Überschreibt keine vorhandenen Werte

### Option B: Manuell

```bash
# .env.example kopieren
cp .env.example .env

# .env bearbeiten und folgende Werte eintragen:
# - JWT_SECRET (generiere mit: openssl rand -base64 32)
# - JWT_REFRESH_SECRET (generiere mit: openssl rand -base64 32)
# - BIBLE_API_KEY (dein YouVersion API Key)
```

**PowerShell (Windows) - JWT-Secrets generieren:**
```powershell
# JWT_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# JWT_REFRESH_SECRET (anderer Wert!)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Schritt 2: Entwicklung starten

### Option A: Docker-Entwicklung (Empfohlen) ✅

**Vorteile:**
- ✅ Keine lokale Installation von Build Tools nötig
- ✅ Konsistente Entwicklungsumgebung
- ✅ Einfacher für Deployment

**Start:**
```powershell
# Windows
docker-compose -f docker-compose.dev.yml up --build

# Oder im Hintergrund:
docker-compose -f docker-compose.dev.yml up -d --build
```

**Hinweis:** Die IDE kann TypeScript-Fehler anzeigen (z.B. `Cannot find module 'better-sqlite3'`). Das ist normal und kann ignoriert werden, da der Code im Container läuft und dort alle Dependencies installiert sind.

**Zugriff:**
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

**Logs anzeigen:**
```powershell
docker-compose -f docker-compose.dev.yml logs -f
```

**Container stoppen:**
```powershell
docker-compose -f docker-compose.dev.yml down
```

---

### Option B: Lokale Entwicklung (ohne Docker)

**Voraussetzung:** Visual Studio Build Tools mit "Desktop development with C++" installiert (für `better-sqlite3`)

**Dependencies installieren:**
```powershell
# Root (Workspace-Management)
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

**Entwicklung starten:**

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

## Schritt 4: Bibel-Datenbank importieren

```bash
cd backend
npm run import-bibles
```

Dies importiert die JSON-Dateien aus `lokale bibeln/` in die SQLite-Datenbank.

## Nächste Schritte

1. Datenbank-Schemas implementieren
2. Authentifizierung implementieren
3. Dateiverwaltung implementieren
4. Bibelstellen-Referenzen implementieren

## Troubleshooting

**Port bereits belegt:**
- Backend: Ändere `PORT` in `.env`
- Frontend: Ändere Port in `vite.config.ts`

**Docker-Problem:**
- Stelle sicher, dass Docker Desktop läuft
- Prüfe: `docker --version`

**Node-Module-Probleme:**
- Lösche `node_modules` und `package-lock.json`
- Führe `npm install` erneut aus

