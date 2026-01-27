# Environment-Variablen Beispiele

Diese Datei enthält Beispiel-Konfigurationen für `.env`-Dateien für verschiedene Deployment-Szenarien.

## 📋 Quick Start

1. Wähle dein Deployment-Szenario (NAS oder Standalone)
2. Kopiere die entsprechende Konfiguration in eine neue `.env`-Datei im Root-Verzeichnis
3. Passe `JWT_SECRET` und `JWT_REFRESH_SECRET` an (siehe unten)
4. Passe weitere Werte nach Bedarf an

## 🔐 JWT Secrets generieren

**Auf Linux/Mac/NAS (via SSH):**
```bash
openssl rand -base64 64
```

**Auf Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 🏠 Synology NAS (NAS-Mode)

### .env für Synology

```bash
# =============================================================================
# NoteNest - .env für Synology NAS (NAS-Mode)
# =============================================================================

# -----------------------------------------------------------------------------
# 🚀 Deployment-Modus
# -----------------------------------------------------------------------------
DEPLOYMENT_MODE=nas

# -----------------------------------------------------------------------------
# 🔐 JWT Secrets (WICHTIG: Generiere eigene Secrets!)
# -----------------------------------------------------------------------------
JWT_SECRET=GENERATE-YOUR-OWN-SECRET-HERE-MIN-64-CHARS
JWT_REFRESH_SECRET=GENERATE-YOUR-OWN-SECRET-HERE-MIN-64-CHARS

# -----------------------------------------------------------------------------
# 👤 Authentifizierung
# -----------------------------------------------------------------------------
# Auth-Modus: hybrid = Lokale Admins + LDAP-User
AUTH_MODE=hybrid

# Registrierung deaktiviert (nur Admin erstellt User)
REGISTRATION_ENABLED=false

# LDAP-Integration (optional, für automatische User-Erkennung)
LDAP_ENABLED=false
# Falls LDAP aktiviert:
# LDAP_URL=ldap://localhost:389
# LDAP_BASE_DN=dc=synology,dc=local
# LDAP_BIND_DN=cn=notenest,dc=synology,dc=local
# LDAP_BIND_PASSWORD=your-password
# LDAP_USER_SEARCH_BASE=ou=users,dc=synology,dc=local
# LDAP_USER_SEARCH_FILTER=(uid={username})

# -----------------------------------------------------------------------------
# 💾 Datenbank
# -----------------------------------------------------------------------------
DB_PATH=/data/database/notenest.db

# -----------------------------------------------------------------------------
# 🖥️ Server
# -----------------------------------------------------------------------------
PORT=3000
NODE_ENV=production

# -----------------------------------------------------------------------------
# 🏠 NAS-Integration (WICHTIG!)
# -----------------------------------------------------------------------------
# NAS-Typ
NAS_TYPE=synology

# =============================================================================
# WICHTIG: Diese Pfade sind INNERHALB des Docker-Containers!
# Sie entsprechen den Volume-Mounts aus docker-compose.yml
# =============================================================================

# --- Home-Verzeichnisse (Private Ordner) ---
# Container-Pfad, wo /volume1/homes gemountet ist
NAS_HOMES_PATH=/data/homes

# --- Shared-Ordner Root ---
# Container-Pfad, wo alle Shared-Ordner gemountet sind
NAS_SHARED_PATH=/data/shared

# User-Mapping: same = NoteNest-Username = NAS-Username (Standard)
USER_MAPPING_MODE=same

# -----------------------------------------------------------------------------
# 📖 Bibelstellen-API (optional)
# -----------------------------------------------------------------------------
BIBLE_API_ENABLED=false
# BIBLE_API_KEY=your-api-key

# -----------------------------------------------------------------------------
# 📝 Logging
# -----------------------------------------------------------------------------
LOG_LEVEL=info
LOG_DIR=/app/logs

# -----------------------------------------------------------------------------
# 🔒 Sicherheit
# -----------------------------------------------------------------------------
# Rate Limiting (Production-Einstellungen werden automatisch verwendet)
```

### Pfad-Erklärung (Synology)

| Zweck | NAS-Pfad | Container-Pfad (.env) | docker-compose Volume |
|-------|----------|----------------------|----------------------|
| Private Ordner | `/volume1/homes/` | `/data/homes` | `- /volume1/homes:/data/homes:ro` |
| Shared Root | `/volume1/shared/` | `/data/shared/Allgemein` | `- /volume1/shared:/data/shared/Allgemein:rw` |
| Weitere Shared | `/volume1/Familie/` | `/data/shared/Familie` | `- /volume1/Familie:/data/shared/Familie:rw` |

**Wichtig:**
- `.env` enthält **Container-Pfade** (`/data/...`)
- `docker-compose.yml` mappt **NAS-Pfade** zu **Container-Pfaden**

---

## 🖥️ Standalone Server

### .env für Standalone

```bash
# =============================================================================
# NoteNest - .env für Standalone-Deployment
# =============================================================================

# -----------------------------------------------------------------------------
# 🚀 Deployment-Modus
# -----------------------------------------------------------------------------
DEPLOYMENT_MODE=standalone

# -----------------------------------------------------------------------------
# 🔐 JWT Secrets (WICHTIG: Generiere eigene Secrets!)
# -----------------------------------------------------------------------------
JWT_SECRET=GENERATE-YOUR-OWN-SECRET-HERE-MIN-64-CHARS
JWT_REFRESH_SECRET=GENERATE-YOUR-OWN-SECRET-HERE-MIN-64-CHARS

# -----------------------------------------------------------------------------
# 👤 Authentifizierung
# -----------------------------------------------------------------------------
# Auth-Modus: local = Nur lokale User
AUTH_MODE=local

# Registrierung aktiviert (User können sich selbst registrieren)
REGISTRATION_ENABLED=true

# LDAP-Integration (optional)
LDAP_ENABLED=false

# -----------------------------------------------------------------------------
# 💾 Datenbank
# -----------------------------------------------------------------------------
DB_PATH=/data/database/notenest.db

# -----------------------------------------------------------------------------
# 🖥️ Server
# -----------------------------------------------------------------------------
PORT=3000
NODE_ENV=production

# -----------------------------------------------------------------------------
# 📂 Datenspeicherung (Standalone)
# -----------------------------------------------------------------------------
# Im Standalone-Modus werden Dateien im Container gespeichert
# Kein NAS_HOMES_PATH oder NAS_SHARED_PATH nötig

# -----------------------------------------------------------------------------
# 📖 Bibelstellen-API (optional)
# -----------------------------------------------------------------------------
BIBLE_API_ENABLED=false
# BIBLE_API_KEY=your-api-key

# -----------------------------------------------------------------------------
# 📝 Logging
# -----------------------------------------------------------------------------
LOG_LEVEL=info
LOG_DIR=/app/logs

# -----------------------------------------------------------------------------
# 🔒 Sicherheit
# -----------------------------------------------------------------------------
# Rate Limiting (Production-Einstellungen werden automatisch verwendet)
```

---

## 🧪 Development

### .env für Entwicklung

```bash
# =============================================================================
# NoteNest - .env für Entwicklung
# =============================================================================

# -----------------------------------------------------------------------------
# 🚀 Deployment-Modus
# -----------------------------------------------------------------------------
DEPLOYMENT_MODE=standalone

# -----------------------------------------------------------------------------
# 🔐 JWT Secrets (Entwicklung - NICHT in Produktion verwenden!)
# -----------------------------------------------------------------------------
JWT_SECRET=dev-secret-not-for-production-use-only
JWT_REFRESH_SECRET=dev-refresh-secret-not-for-production-use-only

# -----------------------------------------------------------------------------
# 👤 Authentifizierung
# -----------------------------------------------------------------------------
AUTH_MODE=local
REGISTRATION_ENABLED=true
LDAP_ENABLED=false

# -----------------------------------------------------------------------------
# 💾 Datenbank
# -----------------------------------------------------------------------------
DB_PATH=/data/database/notenest.db

# -----------------------------------------------------------------------------
# 🖥️ Server
# -----------------------------------------------------------------------------
PORT=3000
NODE_ENV=development

# -----------------------------------------------------------------------------
# 📝 Logging
# -----------------------------------------------------------------------------
LOG_LEVEL=debug
LOG_DIR=/app/logs

# -----------------------------------------------------------------------------
# 🔒 Sicherheit (Lockere Limits für Dev)
# -----------------------------------------------------------------------------
# Rate Limiting ist automatisch gelockert im development-Modus
```

---

## 🌐 Weitere NAS-Systeme

### QNAP

```bash
# NAS-Integration
NAS_TYPE=qnap
NAS_HOMES_PATH=/data/homes       # Container-Pfad
NAS_SHARED_PATH=/data/shared     # Container-Pfad
```

**docker-compose.yml Volume-Mounts:**
```yaml
volumes:
  # QNAP: /share/homes statt /volume1/homes
  - /share/homes:/data/homes:ro
  - /share/Public:/data/shared/Public:rw
```

### TrueNAS / FreeNAS

```bash
# NAS-Integration
NAS_TYPE=truenas
NAS_HOMES_PATH=/data/homes
NAS_SHARED_PATH=/data/shared
```

**docker-compose.yml Volume-Mounts:**
```yaml
volumes:
  # TrueNAS: /mnt/pool/homes
  - /mnt/tank/homes:/data/homes:ro
  - /mnt/tank/shared:/data/shared/Shared:rw
```

### OpenMediaVault (OMV)

```bash
# NAS-Integration
NAS_TYPE=omv
NAS_HOMES_PATH=/data/homes
NAS_SHARED_PATH=/data/shared
```

**docker-compose.yml Volume-Mounts:**
```yaml
volumes:
  # OMV: /srv/dev-disk-by-uuid-xxx/homes
  - /srv/dev-disk-by-uuid-xxx/homes:/data/homes:ro
  - /srv/dev-disk-by-uuid-xxx/shared:/data/shared/Shared:rw
```

---

## 🔧 Wichtige Hinweise

### 1. Container-Pfade vs. Host-Pfade

**IMMER beachten:**
- `.env` verwendet **Container-Pfade** (z.B. `/data/homes`)
- `docker-compose.yml` mappt **Host-Pfade** zu **Container-Pfaden**

**Beispiel:**
```yaml
# docker-compose.yml
volumes:
  - /volume1/homes:/data/homes:ro  # Host : Container
```

```bash
# .env
NAS_HOMES_PATH=/data/homes  # Container-Pfad!
```

### 2. Mehrere Shared-Ordner

**In docker-compose.yml:**
```yaml
volumes:
  # Jeder Shared-Ordner wird einzeln gemountet
  - /volume1/shared:/data/shared/Allgemein:rw
  - /volume1/Familie:/data/shared/Familie:rw
  - /volume1/Projekte:/data/shared/Projekte:rw
  - /volume1/Arbeit:/data/shared/Arbeit:rw
```

**In .env:**
```bash
# Root-Pfad für alle Shared-Ordner
NAS_SHARED_PATH=/data/shared
```

**NoteNest findet automatisch alle Unterordner unter `/data/shared/`!**

### 3. Permissions (UID/GID)

**Synology Standard:**
```yaml
user: "1024:100"  # admin:users
```

**Prüfen auf NAS:**
```bash
id admin
# uid=1024(admin) gid=100(users)
```

**Falls andere UID/GID:** In `docker-compose.yml` anpassen!

### 4. Read-Only vs. Read-Write

```yaml
# Read-Only (:ro) - Nur lesen
- /volume1/homes:/data/homes:ro

# Read-Write (:rw) - Lesen und Schreiben
- /volume1/shared:/data/shared/Allgemein:rw
```

**Empfehlung:**
- Private Ordner: `:ro` (NoteNest liest, schreibt via User-Permissions)
- Shared Ordner: `:rw` (alle schreiben)

---

## 📚 Siehe auch

- [NAS_SETUP_GUIDE.md](./NAS_SETUP_GUIDE.md) - Schritt-für-Schritt Setup
- [DEPLOYMENT_MODES.md](./DEPLOYMENT_MODES.md) - Deployment-Modi erklärt
- [docker-compose.example.yml](../docker-compose.example.yml) - Vollständige Compose-Konfiguration

