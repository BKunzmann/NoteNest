# NAS Deployment - Schnellstart

Kurze Anleitung für das Deployment von NoteNest auf einem NAS (Synology, QNAP, etc.).

## 📋 Voraussetzungen

- Docker und Docker Compose installiert auf dem NAS
- SSH-Zugriff auf das NAS (oder Terminal via DSM/QTS)
- Mindestens 2 GB RAM verfügbar
- Mindestens 10 GB freier Speicherplatz

## 🚀 Schnellstart (5 Schritte)

### Schritt 1: Projekt-Verzeichnis erstellen

```bash
# Auf dem NAS (via SSH oder Terminal)
mkdir -p /volume1/docker/notenest
cd /volume1/docker/notenest
```

**Hinweis**: Passe den Pfad an dein NAS-System an:
- **Synology**: `/volume1/docker/notenest` oder `/docker/notenest`
- **QNAP**: `/share/Container/notenest`
- **Andere**: Wähle einen persistenten Pfad

### Schritt 2: Code klonen

```bash
# Klone das Repository
git clone https://github.com/BKunzmann/NoteNest.git .

# Oder: Lade die neueste Release-Version
# wget https://github.com/BKunzmann/NoteNest/archive/refs/tags/v1.0.0.zip
# unzip v1.0.0.zip
# mv NoteNest-1.0.0/* .
```

### Schritt 3: Umgebungsvariablen konfigurieren

```bash
# Kopiere .env.example zu .env
cp .env.example .env

# Bearbeite .env und trage deinen BIBLE_API_KEY ein (optional)
# JWT-Secrets werden automatisch generiert beim ersten Start
nano .env  # oder vi .env
```

**Wichtig**: Die JWT-Secrets (`JWT_SECRET` und `JWT_REFRESH_SECRET`) werden automatisch vom Docker-Entrypoint generiert, wenn sie fehlen. Du musst sie nicht manuell setzen.

### Schritt 4: docker-compose.prod.yml anpassen

Öffne `docker-compose.prod.yml` und passe die Volume-Mounts an:

**Für Synology NAS**:
```yaml
volumes:
  # Datenbank (persistent)
  - ./data/database:/data/database
  
  # User-Daten (NAS-Mounts)
  - /volume1/homes:/data/homes:ro      # Private Ordner (read-only)
  - /volume1/shared:/data/shared:rw    # Geteilte Ordner (read-write)
  
  # Logs (persistent)
  - ./logs:/app/logs
  
  # Bibel-Daten (optional, read-only)
  - ./data/bibles:/app/data/bibles:ro
```

**Für lokale Installation** (ohne NAS-Mounts):
```yaml
volumes:
  - ./data/database:/data/database
  - ./data/users:/data/users
  - ./data/shared:/data/shared
  - ./logs:/app/logs
  - ./data/bibles:/app/data/bibles:ro
```

**Port anpassen** (falls Port 3000 bereits belegt):
```yaml
ports:
  - "3001:3000"  # Externer Port:Interner Port
```

### Schritt 5: Container starten

```bash
# Baue Docker Image (beim ersten Mal)
docker-compose -f docker-compose.prod.yml build

# Starte Container
docker-compose -f docker-compose.prod.yml up -d

# Prüfe Logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Erwartete Ausgabe beim ersten Start**:
```
🔧 NoteNest Docker Entrypoint
✅ .env Datei gefunden
🔑 Generiere JWT_SECRET...
✅ JWT_SECRET generiert
🔑 Generiere JWT_REFRESH_SECRET...
✅ JWT_REFRESH_SECRET generiert
💾 Speichere .env...
✅ .env aktualisiert
```

## ✅ Verifizierung

### Health-Check

```bash
# Prüfe ob die Anwendung läuft
curl http://localhost:3000/api/health

# Erwartete Antwort:
# {
#   "status": "ok",
#   "version": "1.0.0",
#   "database": "ok",
#   "uptime": 123,
#   ...
# }
```

### Im Browser öffnen

- **Lokal**: `http://NAS-IP:3000`
- **Mit Reverse Proxy**: `https://notenest.example.com` (siehe Schritt 6)

## 🔄 Updates

### Automatisches Update (mit Git)

```bash
cd /volume1/docker/notenest

# Pull neueste Version
git pull

# Baue neues Image
docker-compose -f docker-compose.prod.yml build

# Starte Container neu
docker-compose -f docker-compose.prod.yml up -d
```

### Oder: Verwende das Deployment-Script

```bash
# Linux/Mac
./scripts/deploy-nas.sh

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-nas.ps1
```

## 🔒 Reverse Proxy (HTTPS) - Optional

Für externe Erreichbarkeit mit HTTPS:

### Synology DSM Reverse Proxy

1. **DSM → Control Panel → Application Portal → Reverse Proxy**
2. **Neue Regel erstellen**:
   - **Source**: `notenest.example.com` (deine Domain)
   - **Destination**: `localhost:3000`
   - **Protocol**: HTTP
   - **Port**: 3000

3. **SSL-Zertifikat** (Let's Encrypt):
   - **DSM → Control Panel → Security → Certificate**
   - Zertifikat erstellen/importieren

### Nginx Reverse Proxy

Siehe `REVERSE_PROXY.md` für detaillierte Anleitung.

## 📊 Monitoring

### Container-Status prüfen

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Logs anzeigen

```bash
# Alle Logs
docker-compose -f docker-compose.prod.yml logs

# Live-Logs (follow)
docker-compose -f docker-compose.prod.yml logs -f

# Nur Backend-Logs
docker-compose -f docker-compose.prod.yml logs notenest
```

### Metriken abrufen

```bash
# Prometheus-Metriken
curl http://localhost:3000/api/metrics

# Log-Report
curl http://localhost:3000/api/metrics/log-report
```

## 🛠️ Troubleshooting

### Container startet nicht

```bash
# Prüfe Logs
docker-compose -f docker-compose.prod.yml logs

# Prüfe Container-Status
docker-compose -f docker-compose.prod.yml ps

# Prüfe ob Port belegt ist
netstat -tuln | grep 3000
```

### Datenbank-Fehler

```bash
# Prüfe Datenbank-Berechtigungen
ls -la data/database/

# Setze Berechtigungen
chmod 755 data/database
chmod 644 data/database/*.db
```

### JWT-Secrets werden nicht generiert

Der Entrypoint-Script generiert automatisch Secrets beim ersten Start. Falls Probleme auftreten:

```bash
# Prüfe .env Datei
cat .env | grep JWT

# Manuell generieren (falls nötig)
openssl rand -base64 32  # Für JWT_SECRET
openssl rand -base64 32  # Für JWT_REFRESH_SECRET
```

### Port bereits belegt

```bash
# Finde Prozess auf Port 3000
lsof -i :3000

# Oder ändere Port in docker-compose.prod.yml
ports:
  - "3001:3000"  # Verwende Port 3001 statt 3000
```

## 📚 Weitere Dokumentation

- **Vollständige Deployment-Anleitung**: [DEPLOYMENT_ANLEITUNG.md](./DEPLOYMENT_ANLEITUNG.md)
- **Reverse Proxy Setup**: [REVERSE_PROXY.md](./REVERSE_PROXY.md)
- **Architektur-Dokumentation**: [ARCHITEKTUR_PLANUNG.md](./ARCHITEKTUR_PLANUNG.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## 🆘 Support

Bei Problemen:
1. Prüfe die Logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Prüfe den Health-Check: `curl http://localhost:3000/api/health`
3. Öffne ein Issue auf GitHub: https://github.com/BKunzmann/NoteNest/issues

