# .env.example - Detaillierte Erklärung

Diese Datei enthält alle Umgebungsvariablen, die NoteNest benötigt. Kopiere diese Datei zu `.env` und trage deine tatsächlichen Werte ein.

---

## 🔐 JWT Secrets

### JWT_SECRET
**Was**: Geheimer Schlüssel zum Signieren von Access-Tokens
**Warum**: Wird verwendet, um JWT-Tokens zu signieren und zu verifizieren
**Generierung**: 
```powershell
# Mit OpenSSL (wenn installiert)
openssl rand -base64 32

# Oder mit PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```
**Wichtig**: 
- Muss stark und zufällig sein
- NIEMALS committen oder teilen
- Mindestens 32 Zeichen
- Für Production: Noch länger (64+ Zeichen)

### JWT_REFRESH_SECRET
**Was**: Geheimer Schlüssel zum Signieren von Refresh-Tokens
**Warum**: Separate Sicherheit für Refresh-Tokens (längere Gültigkeit)
**Generierung**: Gleiche Methode wie JWT_SECRET, aber anderer Wert
**Wichtig**: Muss sich von JWT_SECRET unterscheiden

---

## 👤 Authentifizierung

### AUTH_MODE
**Werte**: `local` | `ldap` | `synology` | `hybrid`
**Standard**: `hybrid`
**Erklärung**:
- `local`: Nur eigene Benutzerverwaltung (Registrierung in NoteNest)
- `ldap`: Nur LDAP/NAS-Authentifizierung
- `synology`: Synology-spezifische LDAP-Integration
- `hybrid`: Beide Modi gleichzeitig (empfohlen)

### LDAP_ENABLED
**Werte**: `true` | `false`
**Standard**: `false`
**Erklärung**: Aktiviert/deaktiviert LDAP-Integration
**Hinweis**: Nur relevant wenn `AUTH_MODE` LDAP oder hybrid ist

### LDAP_URL
**Beispiel**: `ldap://synology-nas.local:389`
**Erklärung**: URL zum LDAP-Server
**Formate**:
- `ldap://hostname:389` (unverschlüsselt)
- `ldaps://hostname:636` (verschlüsselt, empfohlen)

### LDAP_BASE_DN
**Beispiel**: `dc=synology,dc=local`
**Erklärung**: Base Distinguished Name für LDAP-Suche
**Aufbau**: `dc=domain,dc=tld`
**Synology**: Meist `dc=synology,dc=local` oder `dc=nas,dc=local`

### LDAP_BIND_DN
**Beispiel**: `cn=admin,dc=synology,dc=local`
**Erklärung**: DN des Service-Accounts, der LDAP-Abfragen durchführt
**Warum**: NoteNest braucht einen Account, um im LDAP zu suchen
**Hinweis**: Sollte ein Service-Account sein, nicht ein normaler Benutzer

### LDAP_BIND_PASSWORD
**Erklärung**: Passwort für den LDAP_BIND_DN Account
**Wichtig**: NIEMALS committen, nur in `.env` speichern

### LDAP_USER_SEARCH_BASE
**Beispiel**: `ou=users,dc=synology,dc=local`
**Erklärung**: Basis-OU (Organizational Unit) wo Benutzer gesucht werden
**Hinweis**: Kann leer sein, dann wird LDAP_BASE_DN verwendet

### LDAP_USER_SEARCH_FILTER
**Beispiel**: `(uid={username})`
**Erklärung**: LDAP-Filter zum Finden von Benutzern
**Platzhalter**: `{username}` wird durch den tatsächlichen Username ersetzt
**Alternativen**:
- `(sAMAccountName={username})` - Für Active Directory
- `(cn={username})` - Für Standard-LDAP
- `(uid={username})` - Für Synology/Standard-LDAP

---

## 💾 Datenbank

### DB_PATH
**Development**: `../../data/database/notenest.db` (relativ)
**Production**: `/data/database/notenest.db` (absolut im Container)
**Erklärung**: Pfad zur SQLite-Datenbank-Datei
**Hinweis**: 
- Development: Relativer Pfad funktioniert
- Production: Muss absoluter Pfad sein (Container)

---

## 🖥️ Server

### PORT
**Standard**: `3000`
**Erklärung**: Port auf dem der Backend-Server läuft
**Hinweis**: 
- Development: Kann geändert werden wenn Port belegt
- Production: Meist über Reverse Proxy (Traefik/Nginx)

### NODE_ENV
**Werte**: `development` | `production` | `test`
**Standard**: `development`
**Erklärung**: 
- `development`: Entwicklungsmodus (mehr Logging, Hot-Reload)
- `production`: Produktionsmodus (optimiert, weniger Logging)
- `test`: Test-Modus

---

## 📂 Dateisystem

### DATA_ROOT
**Standard**: `/data/users`
**Erklärung**: Root-Verzeichnis für Benutzer-Daten
**Hinweis**: Wird hauptsächlich für lokale Entwicklung verwendet

---

## 🏠 NAS-Konfiguration

### NAS_TYPE
**Werte**: `synology` | `generic` | `` (leer)
**Erklärung**: 
- `synology`: Synology-spezifische Optimierungen
- `generic`: Standard-NAS
- Leer: Keine NAS-Integration

### NAS_HOMES_PATH
**Beispiel**: `/data/homes`
**Erklärung**: Pfad zu `/homes/` Verzeichnis auf NAS
**Container**: Wird als Volume gemountet (z.B. `/volume1/homes:/data/homes`)
**Hinweis**: Muss mit docker-compose Volume übereinstimmen

### NAS_SHARED_PATH
**Beispiel**: `/data/shared`
**Erklärung**: Pfad zu geteilten Ordnern auf NAS
**Container**: Wird als Volume gemountet (z.B. `/volume1/shared:/data/shared`)

### USER_MAPPING_MODE
**Werte**: `same` | `mapped`
**Standard**: `same`
**Erklärung**:
- `same`: NoteNest-Username = NAS-Username (empfohlen)
- `mapped`: Explizites Mapping über Datenbank-Tabelle

---

## 📖 Bibelstellen-Referenzen

### BIBLE_API_ENABLED
**Werte**: `true` | `false`
**Standard**: `true`
**Erklärung**: Aktiviert/deaktiviert API.Bible Integration

### BIBLE_API_KEY
**Erklärung**: Dein YouVersion API Key
**Woher**: https://scripture.api.bible/
**Format**: String (wird von YouVersion bereitgestellt)
**Wichtig**: NIEMALS committen

### BIBLE_API_URL
**Standard**: `https://rest.api.bible`
**Erklärung**: Base-URL der YouVersion API
**Hinweis**: Normalerweise nicht ändern, es sei denn API ändert sich

### BIBLE_API_CACHE_TTL
**Standard**: `3600` (Sekunden = 1 Stunde)
**Erklärung**: Wie lange API-Ergebnisse gecacht werden
**Warum**: Reduziert API-Calls, spart Rate Limits

### BIBLE_SUPERSEARCH_ENABLED
**Werte**: `true` | `false`
**Standard**: `true`
**Erklärung**: Aktiviert/deaktiviert Bible SuperSearch API (Fallback)

### BIBLE_SUPERSEARCH_URL
**Standard**: `https://api.biblesupersearch.com/api`
**Erklärung**: Base-URL der Bible SuperSearch API
**Hinweis**: Normalerweise nicht ändern

### BIBLE_LOCAL_PATH
**Standard**: `/app/data/bibles`
**Erklärung**: Pfad zu lokalen Bibel-JSON-Dateien im Container
**Development**: `lokale bibeln/` wird nach `/app/data/bibles` gemountet
**Production**: Dateien werden beim Build kopiert

---

## 📝 Logging

### LOG_LEVEL
**Werte**: `error` | `warn` | `info` | `debug`
**Standard**: `info`
**Erklärung**: 
- `error`: Nur Fehler
- `warn`: Fehler + Warnungen
- `info`: Fehler + Warnungen + Info (empfohlen für Production)
- `debug`: Alles (nur für Development)

### LOG_FILE
**Standard**: `/app/logs/notenest.log`
**Erklärung**: Pfad zur Log-Datei
**Hinweis**: Muss mit docker-compose Volume übereinstimmen

---

## 📋 Beispiel-Konfigurationen

### Lokale Entwicklung (ohne NAS)
```env
AUTH_MODE=local
LDAP_ENABLED=false
NAS_TYPE=
DB_PATH=../../data/database/notenest.db
NODE_ENV=development
```

### Synology NAS (mit LDAP)
```env
AUTH_MODE=hybrid
LDAP_ENABLED=true
LDAP_URL=ldaps://synology-nas.local:636
LDAP_BASE_DN=dc=synology,dc=local
LDAP_BIND_DN=cn=notenest,ou=services,dc=synology,dc=local
LDAP_BIND_PASSWORD=service-password
LDAP_USER_SEARCH_BASE=ou=users,dc=synology,dc=local
LDAP_USER_SEARCH_FILTER=(uid={username})
NAS_TYPE=synology
NAS_HOMES_PATH=/data/homes
NAS_SHARED_PATH=/data/shared
```

### Production (Docker)
```env
NODE_ENV=production
DB_PATH=/data/database/notenest.db
NAS_HOMES_PATH=/data/homes
NAS_SHARED_PATH=/data/shared
LOG_LEVEL=info
```

---

## ⚠️ Wichtige Hinweise

1. **NIEMALS committen**: `.env` ist in `.gitignore`
2. **Sichere Secrets**: JWT-Secrets müssen stark und zufällig sein
3. **API-Keys**: Nur in `.env`, nie im Code
4. **Development vs. Production**: Unterschiedliche Werte für verschiedene Umgebungen
5. **Pfade**: 
   - Development: Relativ oder lokal
   - Production: Absolut (Container-Pfade)

---

## 🔄 Workflow

1. `.env.example` kopieren zu `.env`
2. Alle `your-*-here` Werte ersetzen
3. Secrets generieren (JWT_SECRET, JWT_REFRESH_SECRET)
4. API-Keys eintragen (BIBLE_API_KEY)
5. NAS-spezifische Werte anpassen (falls NAS verwendet)
6. Testen: `npm run dev` sollte ohne Fehler starten

