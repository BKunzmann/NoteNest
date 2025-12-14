# Reverse Proxy Konfiguration

## Übersicht

NoteNest läuft intern auf **Port 3000**. Um es von außen über HTTPS erreichbar zu machen, benötigst du einen **Reverse Proxy**.

## Deine Überlegung ist korrekt! ✅

**Flow:**
```
Internet (HTTPS)
    ↓
DynDNS (notenest.dyndnsNAS.de)
    ↓
NAS (HTTPS → Reverse Proxy)
    ↓
NoteNest Container (localhost:3000)
```

---

## Option 1: Synology Reverse Proxy (Empfohlen)

Synology DSM hat einen eingebauten Reverse Proxy, der sehr einfach zu konfigurieren ist.

### Konfiguration in Synology DSM

1. **DSM öffnen** → **Control Panel** → **Application Portal** → **Reverse Proxy**

2. **Neue Regel erstellen:**
   - **Beschreibung**: `NoteNest`
   - **Source:**
     - **Protocol**: `HTTPS`
     - **Hostname**: `notenest.dyndnsNAS.de` (deine DynDNS-Adresse)
     - **Port**: `443`
   - **Destination:**
     - **Protocol**: `HTTP`
     - **Hostname**: `localhost` (oder `127.0.0.1`)
     - **Port**: `3000`

3. **Speichern**

### SSL-Zertifikat

1. **Control Panel** → **Security** → **Certificate**
2. Zertifikat für `notenest.dyndnsNAS.de` erstellen oder importieren
3. In der Reverse Proxy Regel das Zertifikat zuweisen

### Beispiel-Konfiguration (DSM 7.x)

```
Source:
  Protocol: HTTPS
  Hostname: notenest.dyndnsNAS.de
  Port: 443

Destination:
  Protocol: HTTP
  Hostname: localhost
  Port: 3000

Custom Header (optional):
  X-Forwarded-Proto: https
  X-Forwarded-Host: notenest.dyndnsNAS.de
```

---

## Option 2: Nginx (Manuell)

Falls du Nginx manuell konfigurieren möchtest:

### nginx.conf

```nginx
server {
    listen 443 ssl http2;
    server_name notenest.dyndnsNAS.de;

    # SSL-Zertifikat
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # SSL-Konfiguration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy-Einstellungen
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

# HTTP → HTTPS Redirect
server {
    listen 80;
    server_name notenest.dyndnsNAS.de;
    return 301 https://$server_name$request_uri;
}
```

---

## Option 3: Traefik (Docker)

Traefik kann als Docker-Container laufen und automatisch Reverse Proxy Regeln erstellen.

### docker-compose.yml (mit Traefik)

```yaml
version: '3.8'

services:
  notenest:
    # ... deine bestehende Konfiguration ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.notenest.rule=Host(`notenest.dyndnsNAS.de`)"
      - "traefik.http.routers.notenest.entrypoints=websecure"
      - "traefik.http.routers.notenest.tls.certresolver=letsencrypt"
      - "traefik.http.services.notenest.loadbalancer.server.port=3000"

  traefik:
    image: traefik:v2.10
    container_name: traefik
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/traefik.yml:ro
      - ./traefik/certs:/certs:ro
    networks:
      - notenest-network
```

---

## Wichtige Hinweise

### 1. Port-Exposition

**Wichtig:** In `docker-compose.yml` ist Port 3000 exponiert:
```yaml
ports:
  - "3000:3000"
```

**Für Production mit Reverse Proxy:**
- Du kannst Port 3000 **nur intern** belassen (nicht nach außen exponiert)
- Oder: Port nur auf `127.0.0.1:3000:3000` binden (nur localhost)

**Empfehlung für Production:**
```yaml
ports:
  - "127.0.0.1:3000:3000"  # Nur localhost, nicht von außen erreichbar
```

### 2. CORS-Konfiguration

Das Backend muss wissen, dass es hinter einem Reverse Proxy läuft:

```env
# .env
FRONTEND_URL=https://notenest.dyndnsNAS.de
```

### 3. WebSocket-Support

Falls du WebSockets verwendest (z.B. für Live-Updates), muss der Reverse Proxy diese unterstützen:

**Synology Reverse Proxy:** Unterstützt WebSockets standardmäßig ✅

**Nginx:** Siehe Konfiguration oben (Upgrade-Header)

**Traefik:** Unterstützt WebSockets automatisch ✅

---

## Checkliste für Production

- [ ] DynDNS konfiguriert und funktioniert
- [ ] SSL-Zertifikat für Domain erstellt/importiert
- [ ] Reverse Proxy Regel erstellt
- [ ] Port 3000 nur intern erreichbar (oder localhost-only)
- [ ] Backend weiß über `FRONTEND_URL` Bescheid
- [ ] Firewall-Regeln angepasst (Port 443 offen, Port 3000 geschlossen)
- [ ] Test: `https://notenest.dyndnsNAS.de` funktioniert

---

## Troubleshooting

### "Connection refused" oder "502 Bad Gateway"

**Problem:** Reverse Proxy kann NoteNest nicht erreichen

**Lösung:**
1. Prüfe, ob NoteNest läuft: `docker ps`
2. Prüfe, ob Port 3000 erreichbar ist: `curl http://localhost:3000`
3. Prüfe Reverse Proxy Logs (Synology: Application Portal → Logs)

### "SSL Certificate Error"

**Problem:** Zertifikat ist nicht gültig

**Lösung:**
1. Prüfe, ob Zertifikat für die richtige Domain ist
2. Prüfe, ob Zertifikat nicht abgelaufen ist
3. Erstelle neues Zertifikat (Let's Encrypt oder selbst-signiert)

### "Mixed Content" Warnung

**Problem:** Frontend lädt Ressourcen über HTTP statt HTTPS

**Lösung:**
1. Stelle sicher, dass `FRONTEND_URL` in `.env` auf HTTPS zeigt
2. Prüfe, ob alle API-Calls über HTTPS gehen

---

## Beispiel: Komplette Konfiguration

### 1. docker-compose.yml (Production)

```yaml
version: '3.8'

services:
  notenest:
    build: .
    container_name: notenest
    ports:
      - "127.0.0.1:3000:3000"  # Nur localhost
    # ... rest der Konfiguration ...
```

### 2. .env

```env
FRONTEND_URL=https://notenest.dyndnsNAS.de
NODE_ENV=production
PORT=3000
# ... rest der Konfiguration ...
```

### 3. Synology Reverse Proxy

```
Source: HTTPS, notenest.dyndnsNAS.de, Port 443
Destination: HTTP, localhost, Port 3000
```

**Fertig!** 🎉

