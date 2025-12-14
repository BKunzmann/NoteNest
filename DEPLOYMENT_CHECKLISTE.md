# Deployment-Checkliste

## ✅ Pre-Deployment Checkliste

### 1. Code-Qualität ✅
- [x] Alle Tests bestehen
- [x] Linter-Fehler behoben
- [x] TypeScript-Kompilierung erfolgreich
- [x] Keine Console-Logs in Production-Code (nur Logger verwenden)

### 2. Umgebungsvariablen
- [ ] `.env` Datei für Production erstellt
- [ ] Alle Secrets generiert (JWT_SECRET, JWT_REFRESH_SECRET)
- [ ] API-Keys konfiguriert (BIBLE_API_KEY)
- [ ] Datenbank-Pfad konfiguriert
- [ ] Log-Verzeichnis konfiguriert
- [ ] Port konfiguriert

### 3. Sicherheit
- [ ] `.env` in `.gitignore` (bereits vorhanden)
- [ ] Keine Secrets im Code
- [ ] Rate Limiting aktiviert
- [ ] CORS korrekt konfiguriert
- [ ] HTTPS konfiguriert (Reverse Proxy)

### 4. Datenbank
- [ ] Datenbank-Verzeichnis erstellt
- [ ] Datenbank-Berechtigungen gesetzt
- [ ] Bibel-Datenbank importiert (optional)
- [ ] Backup-Strategie definiert

### 5. Docker
- [ ] Dockerfile getestet
- [ ] docker-compose.yml für Production erstellt
- [ ] Volumes korrekt gemountet
- [ ] Netzwerk konfiguriert

### 6. Monitoring
- [ ] Health-Check getestet
- [ ] Metrics-Endpoint getestet
- [ ] Log-Verzeichnis erstellt
- [ ] Log-Rotation funktioniert

## 📋 Deployment-Schritte

### Schritt 1: Umgebungsvariablen vorbereiten

**Erstelle `.env` Datei**:
```env
# JWT Secrets (generiere mit: openssl rand -base64 32)
JWT_SECRET=<generierter-secret>
JWT_REFRESH_SECRET=<generierter-secret>

# Datenbank
DB_PATH=/data/database/notenest.db

# Server
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info
LOG_DIR=/app/logs

# Bible API (optional)
BIBLE_API_KEY=<dein-api-key>
BIBLE_API_URL=https://rest.api.bible

# Dateisystem
# Werden über Docker Volumes gemountet
```

**Secrets generieren**:
```bash
# JWT Secrets
openssl rand -base64 32
openssl rand -base64 32
```

### Schritt 2: Docker Build

**Production Dockerfile prüfen**:
```bash
# Im Root-Verzeichnis
docker build -t notenest:latest .
```

**Test lokal**:
```bash
docker run -p 3000:3000 \
  -v $(pwd)/data/database:/data/database \
  -v $(pwd)/data/users:/data/users \
  -v $(pwd)/data/shared:/data/shared \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  notenest:latest
```

### Schritt 3: Docker Compose für Production

**Erstelle `docker-compose.prod.yml`**:
```yaml
version: '3.8'

services:
  notenest:
    image: notenest:latest
    # Oder: build: .
    container_name: notenest-prod
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # Datenbank
      - ./data/database:/data/database
      # User-Daten (NAS-Mounts)
      - /volume1/homes:/data/homes:ro
      - /volume1/shared:/data/shared:rw
      # Logs
      - ./logs:/app/logs
      # Bibel-Daten (optional)
      - ./data/bibles:/app/data/bibles:ro
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    networks:
      - notenest-network
    # Health-Check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  notenest-network:
    driver: bridge
```

### Schritt 4: Reverse Proxy (HTTPS)

**Nginx-Konfiguration** (`nginx.conf`):
```nginx
server {
    listen 80;
    server_name notenest.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name notenest.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Traefik-Konfiguration** (empfohlen):
Siehe `ARCHITEKTUR_PLANUNG.md` für Traefik-Setup

### Schritt 5: Datenbank initialisieren

**Erste Ausführung**:
```bash
# Datenbank-Verzeichnis erstellen
mkdir -p ./data/database

# Container starten (erstellt automatisch DB)
docker-compose -f docker-compose.prod.yml up -d

# Bibel-Datenbank importieren (optional)
docker-compose -f docker-compose.prod.yml exec notenest npm run import-bibles
```

### Schritt 6: Backup-Strategie

**Datenbank-Backup**:
```bash
# Backup-Script erstellen
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp ./data/database/notenest.db ./backups/notenest_${DATE}.db
```

**Cron-Job** (täglich um 2 Uhr):
```bash
0 2 * * * /path/to/backup-script.sh
```

### Schritt 7: Monitoring einrichten

**Prometheus konfigurieren**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'notenest'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

**Grafana Dashboard**:
- Importiere vordefinierte Dashboards
- Konfiguriere Alerts

## 🚀 Deployment-Befehle

### Initiales Deployment

```bash
# 1. Secrets generieren
openssl rand -base64 32 > jwt_secret.txt
openssl rand -base64 32 > jwt_refresh_secret.txt

# 2. .env Datei erstellen
cp .env.example .env
# Bearbeite .env und füge Secrets ein

# 3. Verzeichnisse erstellen
mkdir -p data/database data/users data/shared logs backups

# 4. Docker Build
docker build -t notenest:latest .

# 5. Container starten
docker-compose -f docker-compose.prod.yml up -d

# 6. Logs prüfen
docker-compose -f docker-compose.prod.yml logs -f
```

### Update Deployment

```bash
# 1. Neues Image bauen
docker build -t notenest:latest .

# 2. Container neu starten
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# 3. Alte Images aufräumen
docker image prune -f
```

## ✅ Post-Deployment Checkliste

### Funktionstests
- [ ] Health-Check funktioniert: `curl http://localhost:3000/api/health`
- [ ] Registrierung funktioniert
- [ ] Login funktioniert
- [ ] Dateiverwaltung funktioniert
- [ ] Bibelstellen funktionieren
- [ ] Export funktioniert
- [ ] Suche funktioniert

### Monitoring
- [ ] Metrics-Endpoint erreichbar: `curl http://localhost:3000/api/metrics`
- [ ] Logs werden geschrieben
- [ ] Health-Check zeigt "ok"
- [ ] Prometheus sammelt Metriken

### Sicherheit
- [ ] HTTPS funktioniert
- [ ] Rate Limiting aktiv
- [ ] Keine Fehler in Logs
- [ ] Firewall-Regeln gesetzt

## 🔧 Troubleshooting

### Container startet nicht
```bash
# Logs prüfen
docker-compose -f docker-compose.prod.yml logs

# Container-Status prüfen
docker-compose -f docker-compose.prod.yml ps
```

### Datenbank-Fehler
```bash
# Datenbank-Berechtigungen prüfen
ls -la ./data/database/

# Datenbank-Verbindung testen
docker-compose -f docker-compose.prod.yml exec notenest node -e "const db = require('./dist/config/database').default; console.log(db.prepare('SELECT 1').get());"
```

### Port bereits belegt
```bash
# Prüfe, welcher Prozess Port 3000 verwendet
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac
```

## 📝 Wichtige Dateien

### Production-Konfiguration
- `.env` - Umgebungsvariablen (NIEMALS committen!)
- `docker-compose.prod.yml` - Production Docker Compose
- `nginx.conf` oder Traefik-Konfiguration

### Backup
- `backups/` - Datenbank-Backups
- Backup-Script für automatische Backups

### Monitoring
- Prometheus-Konfiguration
- Grafana-Dashboards
- Alert-Rules

## 🎯 Nächste Schritte nach Deployment

1. **Ersten Benutzer registrieren**
2. **Bibel-Datenbank importieren** (optional)
3. **Monitoring-Dashboards einrichten**
4. **Backup-Script testen**
5. **Dokumentation für Benutzer erstellen**

