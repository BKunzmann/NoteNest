# Deployment-Anleitung

## Automatische JWT-Secret-Generierung

JWT-Secrets werden **automatisch generiert** bei:
- ✅ Erstem Docker-Start (Entrypoint-Script)
- ✅ Pull & Deploy auf der NAS
- ✅ Lokaler Entwicklung (Setup-Script)

**Du musst sie nicht manuell generieren!**

---

## Entwicklung (Windows)

### Erste Einrichtung

```powershell
# 1. Repository klonen
git clone <repository-url>
cd NotizenApp

# 2. Umgebungsvariablen einrichten (generiert automatisch JWT-Secrets)
powershell -ExecutionPolicy Bypass -File .\scripts\setup-env.ps1

# 3. .env bearbeiten (nur BIBLE_API_KEY eintragen, falls nötig)
# JWT-Secrets sind bereits generiert!

# 4. Docker-Entwicklung starten
docker-compose -f docker-compose.dev.yml up
```

### Weitere Entwicklung

```powershell
# Einfach starten - JWT-Secrets bleiben erhalten
docker-compose -f docker-compose.dev.yml up
```

---

## Production Deployment auf NAS

### Erste Installation

1. **Repository auf NAS klonen:**
```bash
cd /volume1/docker/notenest  # oder dein gewünschter Pfad
git clone <repository-url> .
```

2. **docker-compose.yml anpassen:**
   - NAS-Pfade anpassen (`/volume1/homes`, `/volume1/shared`)
   - User-ID anpassen (falls nötig)

3. **Deploy:**
```bash
./scripts/deploy-nas.sh
```

**Das war's!** JWT-Secrets werden beim ersten Start automatisch generiert.

### Updates (Pull & Deploy)

```bash
# Auf der NAS ausführen
./scripts/deploy-nas.sh
```

Das Script:
- ✅ Pullt neueste Version (Git)
- ✅ Baut Docker Image neu
- ✅ Startet Container neu
- ✅ **JWT-Secrets bleiben erhalten** (werden nicht überschrieben)

---

## Wie funktioniert die automatische Generierung?

### Docker Entrypoint

Beim Start des Containers läuft automatisch:
1. `scripts/docker-entrypoint.js` wird ausgeführt
2. Prüft, ob `.env` existiert (erstellt aus `.env.example` falls nicht)
3. Prüft, ob `JWT_SECRET` und `JWT_REFRESH_SECRET` vorhanden sind
4. Generiert sie automatisch, falls sie fehlen oder Platzhalter sind
5. Startet dann die eigentliche Anwendung

### Lokales Setup-Script

Für lokale Entwicklung ohne Docker:
```powershell
.\scripts\setup-env.ps1
```

---

## Wichtige Hinweise

### ✅ Was automatisch passiert:
- JWT-Secrets werden generiert, wenn sie fehlen
- `.env` wird aus `.env.example` erstellt, falls nicht vorhanden
- Vorhandene Secrets werden **nie überschrieben**

### ⚠️ Was du manuell machen musst:
- `BIBLE_API_KEY` in `.env` eintragen (falls API verwendet wird)
- NAS-Pfade in `docker-compose.yml` anpassen
- LDAP-Konfiguration (falls verwendet)

### 🔒 Sicherheit:
- `.env` ist in `.gitignore` (wird nicht committet)
- JWT-Secrets sind stark und zufällig (32 Bytes, Base64)
- Jeder Container/Installation hat eigene Secrets

---

## Troubleshooting

### JWT-Secrets werden nicht generiert

**Problem:** Entrypoint-Script läuft nicht

**Lösung:**
1. Prüfe Docker-Logs: `docker-compose logs`
2. Prüfe, ob `.env.example` existiert
3. Prüfe, ob Entrypoint-Script im Container vorhanden ist:
   ```bash
   docker exec notenest ls -la /app/scripts/
   ```

### .env wird nicht gefunden

**Problem:** `.env` Datei fehlt im Container

**Lösung:**
1. Stelle sicher, dass `.env` als Volume gemountet ist (siehe `docker-compose.yml`)
2. Oder: Entrypoint erstellt sie automatisch aus `.env.example`

### Secrets werden bei jedem Start neu generiert

**Problem:** `.env` wird nicht persistent gespeichert

**Lösung:**
1. Stelle sicher, dass `.env` als Volume gemountet ist:
   ```yaml
   volumes:
     - ./.env:/app/.env
   ```

---

## Manuelle Generierung (falls nötig)

Falls du die Secrets manuell generieren möchtest:

**PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

Dann in `.env` eintragen:
```env
JWT_SECRET=<generierter Wert>
JWT_REFRESH_SECRET=<anderer generierter Wert>
```

