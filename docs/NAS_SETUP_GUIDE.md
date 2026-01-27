# NAS-Setup Guide - Schritt für Schritt

## 🎯 Ziel

NoteNest auf Synology NAS installieren mit:
- Private Ordner = User's Home-Verzeichnis (`/volume1/homes/Username/`)
- Mehrere Shared-Ordner (Familie, Projekte, etc.)
- Admin verwaltet, welcher User welche Shared-Ordner sieht

**Hinweis:** Dieses Dokument beschreibt den NAS-Mode (`DEPLOYMENT_MODE=nas`).
Für Standalone siehe [README.md](../README.md) und [ENV_EXAMPLES.md](./ENV_EXAMPLES.md).

---

## 📋 Voraussetzungen

- Synology NAS mit Docker-Unterstützung
- SSH-Zugriff auf die NAS
- Mindestens 1 GB freier Speicher
- Benutzer bereits auf NAS angelegt

---

## 🔧 Schritt 1: Ordnerstruktur auf NAS vorbereiten

### 1.1 Home-Verzeichnisse (automatisch vorhanden)

```bash
/volume1/homes/
├── admin/          # Admin's private Notizen
├── alice/          # Alice's private Notizen
├── bob/            # Bob's private Notizen
└── ... (weitere User)
```

**Keine Aktion nötig** - Home-Verzeichnisse existieren bereits!

### 1.2 Shared-Ordner erstellen

**In Synology DSM:**
1. **Control Panel** → **Shared Folder**
2. Erstelle folgende Shared Folders:

| Name | Pfad | Berechtigungen |
|------|------|----------------|
| `shared` | `/volume1/shared` | Alle User: Read/Write |
| `Familie` | `/volume1/Familie` | Nur Familie: Read/Write |
| `Projekte` | `/volume1/Projekte` | Projektteam: Read/Write |
| `Arbeit` | `/volume1/Arbeit` | Nur Arbeitsteam: Read/Write |

**Wichtig:** NAS-Berechtigungen gelten auch in NoteNest!

---

## 🐳 Schritt 2: Docker-Container einrichten

### 2.1 NoteNest-Dateien auf NAS kopieren

**Via SSH oder File Station:**

```bash
# Zielverzeichnis auf NAS
/volume1/docker/notenest/
├── docker-compose.yml
├── .env
├── Dockerfile (falls lokal bauen)
├── data/
│   ├── database/     # Wird automatisch erstellt
│   └── bibles/       # Optional: Bibel-JSON-Dateien
└── logs/             # Wird automatisch erstellt
```

### 2.2 docker-compose.yml konfigurieren

**Datei:** `/volume1/docker/notenest/docker-compose.yml`

```yaml
services:
  notenest:
    image: notenest:latest
    container_name: notenest
    restart: unless-stopped
    
    ports:
      - "3100:3000"  # Passe Port an (falls 3100 belegt)
    
    volumes:
      # Datenbank
      - ./data/database:/data/database
      
      # Home-Verzeichnisse (Private Ordner)
      - /volume1/homes:/data/homes:ro
      
      # ALLE Shared-Ordner mounten:
      - /volume1/shared:/data/shared/Allgemein:rw
      - /volume1/Familie:/data/shared/Familie:rw
      - /volume1/Projekte:/data/shared/Projekte:rw
      - /volume1/Arbeit:/data/shared/Arbeit:rw
      # Weitere Ordner hier hinzufügen...
      
      # Logs
      - ./logs:/app/logs
      
    # .env
      - ./.env:/app/.env
    
    env_file:
      - .env  # .env ist die einzige Quelle fuer Umgebungsvariablen
    
    # WICHTIG: UID/GID des admin-Users
    user: "1024:100"  # Prüfen mit: id admin
    
    networks:
      - notenest-network

networks:
  notenest-network:
    driver: bridge
```

**Wichtig:** Jeden Shared-Ordner einzeln mounten!
**Hinweis:** Umgebungsvariablen bitte nur in `.env` pflegen (keine Duplikate in `environment:`).

### 2.3 .env konfigurieren

**Datei:** `/volume1/docker/notenest/.env`

```bash
# Deployment-Modus
DEPLOYMENT_MODE=nas

# JWT-Secrets generieren!
# openssl rand -base64 64
JWT_SECRET=DEIN-GENERIERTES-SECRET-HIER
JWT_REFRESH_SECRET=DEIN-ANDERES-SECRET-HIER

# Authentifizierung
AUTH_MODE=hybrid
REGISTRATION_ENABLED=false

# NAS-Integration
NAS_TYPE=synology
NAS_HOMES_PATH=/data/homes        # Container-Pfad!
NAS_SHARED_PATH=/data/shared      # Container-Pfad!
USER_MAPPING_MODE=same

# Datenbank
DB_PATH=/data/database/notenest.db

# Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
```

**Wichtig:** Pfade sind Container-Pfade, nicht NAS-Pfade!

### 2.4 UID/GID prüfen und setzen

```bash
# Via SSH auf NAS einloggen
ssh admin@nas-ip

# UID und GID prüfen
id admin
# Ausgabe: uid=1024(admin) gid=100(users) ...

# In docker-compose.yml eintragen:
user: "1024:100"
```

---

## 🚀 Schritt 3: Container starten

```bash
# Via SSH auf NAS
cd /volume1/docker/notenest

# Container bauen (falls lokal)
docker-compose build

# Container starten
docker-compose up -d

# Logs prüfen
docker logs notenest

# Bei Erfolg:
# ✅ Database initialized
# ✅ Admin-Benutzer erstellt (admin / admin123)
# 🚀 NoteNest Backend running on port 3000
```

---

## 🌐 HTTPS / Reverse Proxy (Kurz)

Wenn du NoteNest von außen erreichbar machen willst, nutze einen Reverse Proxy
(z.B. Synology DSM). Kurzfassung:

- **Reverse Proxy**: HTTPS → `http://localhost:3000`
- **Empfehlung**: Port in `docker-compose.yml` nur lokal binden:
  `127.0.0.1:3000:3000`
- **.env**: `FRONTEND_URL=https://<deine-domain>`

---

## 👤 Schritt 4: Benutzer einrichten

### 4.1 Als Admin einloggen

1. Browser öffnen: `http://nas-ip:3100`
2. Login mit: `admin` / `admin123`
3. **Wichtig:** Passwort sofort ändern!

### 4.2 Neue Benutzer erstellen

**Im Admin-Panel:**

1. Klick auf **Admin-Panel** (oben rechts)
2. Klick auf **Benutzer erstellen**
3. Eingeben:
   - **Username:** `alice` (MUSS mit NAS-Username übereinstimmen!)
   - **Password:** `EinSicheresPasswort`
   - **Email:** `alice@example.com` (optional)
   - **Admin:** Nein (nur für Admins)

**Was passiert:**
- User wird in NoteNest-DB angelegt
- NoteNest prüft: Existiert `/volume1/homes/alice/`?
  - ✅ Ja: User kann sich anmelden
  - ❌ Nein: Warnung, User muss erst auf NAS angelegt werden

### 4.3 Shared-Ordner für User freigeben

**WICHTIG:** Standardmäßig sieht ein User:
- ✅ Seine privaten Dateien (`/volume1/homes/alice/`)
- ❌ KEINE Shared-Ordner (auch wenn NAS-Berechtigung vorhanden)

**Admin muss Shared-Ordner explizit freigeben:**

#### Via Admin-Panel (UI - noch nicht implementiert)

*Wird noch implementiert - siehe TODO*

#### Via API (aktuell)

```bash
# Shared-Ordner "Familie" für User alice freigeben
curl -X POST http://nas-ip:3100/api/admin/users/2/shared-folders \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folderPath": "Familie"}'

# Weitere Ordner freigeben
curl -X POST http://nas-ip:3100/api/admin/users/2/shared-folders \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folderPath": "Projekte"}'
```

**Alice sieht dann:**
- Private: `/volume1/homes/alice/` (ihre Dateien)
- Shared: `Familie/` und `Projekte/` (nur die freigegebenen)

---

## 🎨 Schritt 5: Benutzer-Erfahrung

### Als Benutzer Alice (Beispiel)

**Nach Login sieht Alice:**

```
┌─────────────────────────────────┐
│ Privat (alice)                  │
├─────────────────────────────────┤
│ 📄 Meine_Notizen.md            │
│ 📄 Tagebuch.md                 │
│ 📁 Persönlich/                 │
│   └── 📄 Privat.md             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Shared                          │
├─────────────────────────────────┤
│ 📁 Familie/                     │
│   ├── 📄 Einkaufsliste.md      │
│   └── 📄 Urlaub_2026.md        │
│                                 │
│ 📁 Projekte/                    │
│   └── 📄 Hausrenovierung.md    │
└─────────────────────────────────┘
```

**Alice sieht NICHT:**
- `Allgemein/` (nicht freigegeben)
- `Arbeit/` (nicht freigegeben)

**Warum das Sinn macht:**
- Admin kann gezielt steuern, wer was sieht
- Auch wenn Alice NAS-Berechtigung für "Arbeit" hat, sieht sie es nicht in NoteNest
- Verhindert Übersichtlichkeit bei vielen Shared-Ordnern

---

## 🔧 Schritt 6: Weitere Shared-Ordner hinzufügen

### 6.1 Neuen Ordner auf NAS erstellen

**In Synology DSM:**
1. Control Panel → Shared Folder
2. Erstelle z.B. "Rezepte"
3. Setze Berechtigungen (wer Zugriff hat)

### 6.2 In docker-compose.yml mounten

```yaml
volumes:
  # ... bestehende Mounts ...
  
  # Neuer Ordner
  - /volume1/Rezepte:/data/shared/Rezepte:rw
```

### 6.3 Container neu starten

```bash
docker-compose down
docker-compose up -d
```

### 6.4 Ordner für User freigeben

```bash
# Via API für User alice
curl -X POST http://nas-ip:3100/api/admin/users/2/shared-folders \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{"folderPath": "Rezepte"}'
```

---

## 📊 Übersicht: Pfad-Mapping

| Ort | NAS-Pfad | Container-Pfad | NoteNest zeigt |
|-----|----------|----------------|----------------|
| **Private** | `/volume1/homes/alice/` | `/data/homes/alice/` | "Privat (alice)" |
| **Shared 1** | `/volume1/Familie/` | `/data/shared/Familie/` | "Familie" (wenn freigegeben) |
| **Shared 2** | `/volume1/Projekte/` | `/data/shared/Projekte/` | "Projekte" (wenn freigegeben) |
| **Shared 3** | `/volume1/Arbeit/` | `/data/shared/Arbeit/` | "Arbeit" (wenn freigegeben) |

---

## 🔐 Sicherheit & Berechtigungen

### NAS-Permissions werden respektiert!

**Beispiel:**
- Alice hat auf NAS KEIN Zugriff auf `/volume1/Arbeit/`
- Admin gibt "Arbeit" in NoteNest für Alice frei
- **Ergebnis:** Alice sieht Ordner in NoteNest, aber NAS blockiert Zugriff (Fehler beim Öffnen)

**Best Practice:**
- NAS-Permissions = Basis-Sicherheit
- NoteNest-Freigabe = Zusätzliche Kontrollebene (was User sieht)

### Empfohlene Permission-Strategie:

1. **NAS-Level:** Grobe Zugriffsrechte (Team-basiert)
2. **NoteNest-Level:** Feine Kontrolle (pro User)

---

## 🛠️ Troubleshooting

Allgemeine Probleme findest du gesammelt in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

### Problem: User sieht seine privaten Dateien nicht

**Ursache:** Home-Verzeichnis existiert nicht oder Permissions falsch

**Lösung:**
```bash
# Via SSH auf NAS
ls -la /volume1/homes/alice/

# Falls nicht vorhanden: User auf NAS existiert nicht!
# Falls Permissions falsch:
sudo chown -R alice:users /volume1/homes/alice/
```

### Problem: Shared-Ordner leer oder nicht sichtbar

**Prüfe:**
1. **Ist Ordner gemountet?**
   ```bash
   docker exec notenest ls -la /data/shared/
   ```

2. **Ist Ordner für User freigegeben?**
   ```bash
   docker exec notenest sqlite3 /data/database/notenest.db \
     "SELECT * FROM user_shared_folders WHERE user_id=2;"
   ```

3. **Hat User NAS-Berechtigung?**
   ```bash
   # Via SSH als user alice
   su - alice
   ls -la /volume1/Familie/
   ```

### Problem: "Permission denied" beim Schreiben

**Ursache:** Container läuft mit falscher UID/GID

**Lösung:**
```bash
# Prüfe UID/GID
id alice
# uid=1025(alice) gid=100(users)

# Passe docker-compose.yml an:
user: "1025:100"

# Oder: Verwende admin-UID (hat Zugriff auf alle User-Homes)
user: "1024:100"
```

---

## 📚 Siehe auch

- [ENV_EXAMPLES.md](./ENV_EXAMPLES.md) - Environment-Variablen Beispiele
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Auth-System
- [README.md](../README.md) - Hauptdokumentation

