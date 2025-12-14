# Docker-Entwicklung

Diese Anleitung erklärt, wie du NoteNest in Docker entwickelst.

## Voraussetzungen

- ✅ Docker Desktop installiert und läuft
- ✅ `.env.example` vorhanden (wird automatisch zu `.env` kopiert)

## Schnellstart

```powershell
# 1. Stelle sicher, dass Docker läuft
docker ps

# 2. Starte die Entwicklungsumgebung
docker-compose -f docker-compose.dev.yml up --build

# 3. Öffne im Browser:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3000
```

## Was passiert beim Start?

1. **Docker baut das Image** (`Dockerfile.dev`):
   - Installiert Node.js 18
   - Installiert Build-Dependencies (Python, Make, GCC für `better-sqlite3`)
   - Kopiert `package.json`-Dateien
   - Installiert alle Dependencies (inkl. Workspaces)

2. **Entrypoint-Script läuft** (`docker-entrypoint.js`):
   - Prüft, ob `.env` existiert (erstellt aus `.env.example` falls nicht)
   - Generiert automatisch `JWT_SECRET` und `JWT_REFRESH_SECRET` (falls fehlend)
   - Speichert `.env` (wird als Volume gemountet)

3. **Entwicklungsserver startet**:
   - Backend: `npm run dev` (tsx watch)
   - Frontend: `npm run dev` (Vite)
   - Live-Reload aktiv (Code-Änderungen werden sofort übernommen)

## Volumes (Live-Reload)

Die folgenden Verzeichnisse werden als Volumes gemountet, sodass Code-Änderungen sofort im Container sichtbar sind:

- `./backend` → `/app/backend`
- `./frontend` → `/app/frontend`
- `./data/bibles` → `/app/data/bibles` (read-only)
- `./data/database` → `/app/data/database`
- `./logs` → `/app/logs`
- `./.env` → `/app/.env`

## Nützliche Befehle

### Container im Hintergrund starten
```powershell
docker-compose -f docker-compose.dev.yml up -d --build
```

### Logs anzeigen
```powershell
# Alle Logs
docker-compose -f docker-compose.dev.yml logs -f

# Nur Backend
docker-compose -f docker-compose.dev.yml logs -f notenest-dev | Select-String "backend"

# Nur Frontend
docker-compose -f docker-compose.dev.yml logs -f notenest-dev | Select-String "frontend"
```

### Container stoppen
```powershell
docker-compose -f docker-compose.dev.yml down
```

### Container neu bauen (nach Dependency-Änderungen)
```powershell
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up
```

### In Container einsteigen
```powershell
docker exec -it notenest-dev sh
```

### Dependencies im Container installieren
```powershell
# Im Container
docker exec -it notenest-dev sh
cd /app
npm install
```

## IDE-Fehler ignorieren

Die IDE kann TypeScript-Fehler anzeigen wie:
- `Cannot find module 'better-sqlite3'`
- `Cannot find name 'process'`
- `Cannot find type definition file for 'node'`

**Das ist normal!** Diese Fehler können ignoriert werden, da:
- ✅ Der Code im Container läuft (nicht lokal)
- ✅ Alle Dependencies im Container installiert sind
- ✅ Der TypeScript-Compiler im Container funktioniert

**Falls du die IDE-Fehler beheben möchtest:**
Siehe `docs/TROUBLESHOOTING.md` → "Alternative: Lokale Installation"

## Troubleshooting

### Port bereits belegt
```powershell
# Prüfe, welcher Prozess Port 3000 oder 5173 verwendet
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Beende den Prozess (ersetze <PID>)
taskkill /PID <PID> /F
```

### Container startet nicht
```powershell
# Prüfe Logs
docker-compose -f docker-compose.dev.yml logs

# Prüfe, ob Docker läuft
docker ps

# Prüfe, ob Ports frei sind
netstat -ano | findstr :3000
netstat -ano | findstr :5173
```

### Dependencies werden nicht aktualisiert
```powershell
# Baue Container neu (ohne Cache)
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up
```

### .env wird nicht erkannt
```powershell
# Prüfe, ob .env existiert
Test-Path .env

# Prüfe Inhalt
Get-Content .env

# Erstelle manuell (falls nötig)
Copy-Item .env.example .env
```

## Nächste Schritte

Nach erfolgreichem Start:
1. ✅ Prüfe Backend: http://localhost:3000/api/health
2. ✅ Prüfe Frontend: http://localhost:5173
3. ✅ Beginne mit der Implementierung (siehe `SETUP.md` → "Nächste Schritte")

