# Deployment-Anleitung - NoteNest

## 📋 Übersicht

Diese Anleitung führt dich Schritt für Schritt durch das Deployment von NoteNest auf einem Server/NAS.

## 🎯 Voraussetzungen

- Docker und Docker Compose installiert
- Mindestens 2 GB RAM verfügbar
- Mindestens 10 GB freier Speicherplatz
- Root- oder sudo-Zugriff auf den Server

## 🚀 Schritt-für-Schritt Deployment

### Schritt 1: Projekt vorbereiten

```bash
# 1. Projekt-Verzeichnis erstellen
mkdir -p /opt/notenest
cd /opt/notenest

# 2. Code klonen oder kopieren
# (Falls Git-Repository vorhanden)
git clone https://github.com/BKunzmann/NoteNest.git .

# Oder: Code manuell kopieren
```

### Schritt 2: Secrets generieren

```bash
# JWT Secrets generieren
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

echo "JWT_SECRET=$JWT_SECRET" >> .env
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env
```

### Schritt 3: .env Datei erstellen

**Erstelle `.env` Datei** (basierend auf `.env.example`):

```env
# JWT Secrets (aus Schritt 2)
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

# Dateisystem (wird über Docker Volumes gemountet)
# Keine Konfiguration nötig
```

### Schritt 4: Verzeichnisse erstellen

```bash
# Erstelle notwendige Verzeichnisse
mkdir -p data/database
mkdir -p data/users
mkdir -p data/shared
mkdir -p logs
mkdir -p backups
mkdir -p data/bibles

# Setze Berechtigungen
chmod 755 data database logs backups
chmod 644 .env
```

### Schritt 5: Docker Image bauen

```bash
# Im Projekt-Root-Verzeichnis
docker build -t notenest:latest .
```

**Oder**: Verwende vorgebautes Image aus Registry:
```bash
docker pull <registry>/notenest:latest
docker tag <registry>/notenest:latest notenest:latest
```

### Schritt 6: docker-compose.prod.yml anpassen

**Für Synology NAS**:
```yaml
volumes:
  - /volume1/homes:/data/homes:ro
  - /volume1/shared:/data/shared:rw
```

**Für lokale Installation**:
```yaml
volumes:
  - ./data/users:/data/users
  - ./data/shared:/data/shared
```

### Schritt 7: Container starten

```bash
# Starte Container
docker-compose -f docker-compose.prod.yml up -d

# Prüfe Logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Schritt 8: Health-Check

```bash
# Prüfe Health-Check
curl http://localhost:3000/api/health

# Erwartete Antwort:
# {
#   "status": "ok",
#   "version": "1.0.0",
#   "database": "ok",
#   ...
# }
```

### Schritt 9: Bibel-Datenbank importieren (optional)

```bash
# Importiere lokale Bibel-Übersetzungen
docker-compose -f docker-compose.prod.yml exec notenest npm run import-bibles
```

### Schritt 10: Reverse Proxy einrichten (HTTPS)

**Nginx**:
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

**Traefik** (empfohlen für Docker):
Siehe `ARCHITEKTUR_PLANUNG.md`

## 🔄 Update-Prozess

### Automatisches Update (empfohlen)

```bash
# 1. Neues Image pullen
docker-compose -f docker-compose.prod.yml pull

# 2. Container neu starten
docker-compose -f docker-compose.prod.yml up -d

# 3. Alte Images aufräumen
docker image prune -f
```

### Manuelles Update

```bash
# 1. Code aktualisieren
git pull  # Falls Git verwendet wird

# 2. Neues Image bauen
docker build -t notenest:latest .

# 3. Container neu starten
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

## 💾 Backup-Strategie

### Datenbank-Backup

**Manuelles Backup**:
```bash
# Backup erstellen
cp ./data/database/notenest.db ./backups/notenest_$(date +%Y%m%d_%H%M%S).db

# Backup wiederherstellen
cp ./backups/notenest_YYYYMMDD_HHMMSS.db ./data/database/notenest.db
```

**Automatisches Backup** (Cron-Job):
```bash
# Erstelle Backup-Script
cat > /opt/notenest/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/notenest/backups"
DB_PATH="/opt/notenest/data/database/notenest.db"

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/notenest_${DATE}.db"

# Lösche Backups älter als 30 Tage
find "$BACKUP_DIR" -name "notenest_*.db" -mtime +30 -delete
EOF

chmod +x /opt/notenest/backup.sh

# Cron-Job (täglich um 2 Uhr)
crontab -e
# Füge hinzu:
0 2 * * * /opt/notenest/backup.sh
```

## 📊 Monitoring einrichten

### Prometheus

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'notenest'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

**Starte Prometheus**:
```bash
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### Grafana

**Starte Grafana**:
```bash
docker run -d \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana
```

**Dashboard importieren**:
1. Öffne http://localhost:3001
2. Login: admin / admin
3. Data Source: Prometheus (http://prometheus:9090)
4. Importiere Dashboard (JSON)

## 🔒 Sicherheits-Checkliste

- [ ] `.env` Datei hat korrekte Berechtigungen (644)
- [ ] Secrets sind stark genug (32+ Zeichen)
- [ ] HTTPS ist aktiviert (Reverse Proxy)
- [ ] Firewall-Regeln gesetzt
- [ ] Rate Limiting ist aktiv
- [ ] Logs werden regelmäßig überprüft
- [ ] Backups werden regelmäßig erstellt
- [ ] Container läuft nicht als root (wenn möglich)

## 🐛 Troubleshooting

### Container startet nicht

```bash
# Logs prüfen
docker-compose -f docker-compose.prod.yml logs

# Container-Status
docker-compose -f docker-compose.prod.yml ps

# Container-Shell öffnen
docker-compose -f docker-compose.prod.yml exec notenest sh
```

### Datenbank-Fehler

```bash
# Datenbank-Berechtigungen prüfen
ls -la ./data/database/

# Datenbank-Verbindung testen
docker-compose -f docker-compose.prod.yml exec notenest \
  node -e "const db = require('./dist/config/database').default; console.log(db.prepare('SELECT 1').get());"
```

### Port bereits belegt

```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Container auf anderem Port starten
# Ändere PORT in .env und docker-compose.prod.yml
```

### Logs prüfen

```bash
# Container-Logs
docker-compose -f docker-compose.prod.yml logs -f

# Log-Dateien
tail -f ./logs/notenest-$(date +%Y-%m-%d).log

# Error-Logs
tail -f ./logs/notenest-error-$(date +%Y-%m-%d).log
```

## 📝 Wichtige Befehle

```bash
# Container starten
docker-compose -f docker-compose.prod.yml up -d

# Container stoppen
docker-compose -f docker-compose.prod.yml down

# Container neu starten
docker-compose -f docker-compose.prod.yml restart

# Logs anzeigen
docker-compose -f docker-compose.prod.yml logs -f

# Container-Shell öffnen
docker-compose -f docker-compose.prod.yml exec notenest sh

# Health-Check
curl http://localhost:3000/api/health

# Metrics abrufen
curl http://localhost:3000/api/metrics
```

## 🎯 Post-Deployment

1. **Ersten Benutzer registrieren**
2. **Bibel-Datenbank importieren** (optional)
3. **Monitoring-Dashboards einrichten**
4. **Backup-Script testen**
5. **Dokumentation für Benutzer erstellen**

## 📚 Weitere Ressourcen

- `ARCHITEKTUR_PLANUNG.md` - Vollständige Architektur-Dokumentation
- `PRODUCTION_FEATURES_COMPLETE.md` - Production-Features Übersicht
- `MONITORING_SETUP.md` - Monitoring-Setup-Anleitung

