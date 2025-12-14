# NoteNest - Architektur & Designplanung

## 📋 Inhaltsverzeichnis
1. [Übersicht & Ziele](#übersicht--ziele)
2. [Technologie-Stack](#technologie-stack)
3. [Systemarchitektur](#systemarchitektur)
4. [Datenmodell & Speicherung](#datenmodell--speicherung)
5. [Sicherheitskonzept](#sicherheitskonzept)
6. [API-Design](#api-design)
7. [Frontend-Architektur](#frontend-architektur)
8. [PWA-Implementierung](#pwa-implementierung)
9. [Docker & Deployment](#docker--deployment)
10. [UI/UX-Konzept](#uiux-konzept)
11. [Dateisystem-Logik](#dateisystem-logik)
12. [Private & Geteilte Ordner](#private--geteilte-ordner)
13. [Bibelstellen-Referenzen](#bibelstellen-referenzen)
14. [PDF-Export](#pdf-export)
15. [Code-Qualität & Best Practices](#code-qualität--best-practices)
16. [Versionierung & Changelog](#versionierung--changelog)
17. [Entwickler-Setup](#entwickler-setup)
18. [Testing-Strategie](#testing-strategie)

---

## 📌 Übersicht & Ziele

### Kernfunktionalitäten
- **Multi-User-System**: Jeder Benutzer hat isolierten Zugriff auf seine Notizen
- **Private & Geteilte Ordner**: Persönliche Notizen + gemeinsame Ordner für Kollaboration
- **NAS-Integration**: Automatische Filterung basierend auf Dateisystem-Berechtigungen
- **Dateiverwaltung**: Ordnerstruktur mit CRUD-Operationen
- **Markdown-Editor**: Live-Vorschau, Syntax-Highlighting
- **Bibelstellen-Referenzen**: Automatische Erkennung und Verlinkung von Bibelstellen
- **PDF-Export**: DIN A4/A5 mit professioneller Formatierung
- **PWA**: Offline-Funktionalität, Installierbar auf Smartphones
- **Docker-Deployment**: Einfache Installation auf NAS/Server

### Nicht-Funktionale Anforderungen
- **Sicherheit**: Passwort-Hashing, Session-Management, Pfadvalidierung
- **Performance**: Schnelle Ladezeiten, effiziente Dateioperationen
- **Skalierbarkeit**: Unterstützung mehrerer gleichzeitiger Benutzer
- **Wartbarkeit**: Klare Code-Struktur, Logging, Testbarkeit

---

## 🛠️ Technologie-Stack

### Backend
**Empfehlung: Node.js mit Express.js**

**Vorteile:**
- Einheitliche Sprache (JavaScript/TypeScript) für Frontend & Backend
- Große Ecosystem für Markdown & PDF-Generierung
- Gute Performance für I/O-intensive Operationen
- Einfache Integration mit PWA-Service-Workern

**Alternative: Python FastAPI**
- Stärker bei komplexer Dateiverarbeitung
- Bessere Bibliotheken für PDF (WeasyPrint, ReportLab)
- Aber: Zwei Sprachen im Stack

**Entscheidung: Node.js/Express mit TypeScript**

### Frontend
**Empfehlung: React mit TypeScript**

**Vorteile:**
- Große Community, viele UI-Bibliotheken
- PWA-Support über Workbox
- Gute Performance mit React 18+
- Viele Markdown-Editor-Komponenten verfügbar

**Alternative: Vue 3**
- Einfacherer Einstieg
- Gute Performance
- Aber: Kleinere Ecosystem für spezifische Komponenten

**Entscheidung: React mit TypeScript**

### Datenbank
**Empfehlung: SQLite (für kleine/mittlere Installationen) oder PostgreSQL**

**SQLite für:**
- Benutzerdaten (Username, gehashte Passwörter, Einstellungen)
- Session-Tokens
- Metadaten (Datei-Pfade, Timestamps, Tags)

**Dateisystem für:**
- Eigentliche Notizen (.md-Dateien)
- Ordnerstruktur

**Alternative: PostgreSQL**
- Für größere Installationen (>100 Benutzer)
- Bessere Concurrent-Write-Performance

**Entscheidung: SQLite für MVP, PostgreSQL als Option**

### Authentifizierung

**Zwei Modi möglich:**

#### Modus 1: Eigene Benutzerverwaltung (Standard)
- Benutzer registrieren sich in NoteNest
- Passwörter werden in der App gehasht (Argon2id)
- Unabhängig von NAS-Benutzerverwaltung

#### Modus 2: NAS-Integration (Optional)
- NoteNest nutzt NAS-Authentifizierung
- Synology Directory Server, LDAP, Active Directory
- Benutzer loggen sich mit NAS-Credentials ein
- Keine separate Registrierung nötig

**Entscheidung: Hybrid-Ansatz** - Beide Modi unterstützen, konfigurierbar

**Token-System:**
- **JWT (JSON Web Tokens) mit Refresh-Tokens** (für beide Modi)
- Stateless, skalierbar
- Einfache Integration mit PWA
- "Remember Me" über lange Refresh-Token-Lifetime

### Markdown-Editor
**Empfehlung: react-markdown-editor-lite oder Monaco Editor**

**Features:**
- Split-View (Editor + Vorschau)
- Syntax-Highlighting
- Toolbar mit Formatierungs-Buttons
- Keyboard-Shortcuts

### PDF-Generierung
**Empfehlung: Puppeteer (Headless Chrome)**

**Vorteile:**
- Exzellente Markdown-zu-HTML-Rendering
- CSS-basierte Styling (wie Web)
- Unterstützt A4/A5-Formate
- Professionelle Typografie möglich

**Alternative:**
- **pdfkit**: Direkte PDF-Generierung, aber komplexeres Markdown-Rendering
- **WeasyPrint**: Python-basiert, sehr gute HTML/CSS-Unterstützung

**Entscheidung: Puppeteer für Backend-PDF-Generierung**

---

## 🏗️ Systemarchitektur

### High-Level-Architektur

```
┌─────────────────────────────────────────────────────────┐
│                    Reverse Proxy                        │
│              (Traefik/Nginx + HTTPS)                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Docker Container                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Frontend (React PWA)                      │   │
│  │  - Static Files (nginx)                          │   │
│  │  - Service Worker                                │   │
│  └────────────────┬─────────────────────────────────┘   │
│                   │ HTTP/REST API                        │
│  ┌────────────────▼─────────────────────────────────┐   │
│  │         Backend (Node.js/Express)                 │   │
│  │  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Auth       │  │   File        │              │   │
│  │  │   Service    │  │   Service     │              │   │
│  │  └──────────────┘  └──────────────┘              │   │
│  │  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   PDF        │  │   Settings   │              │   │
│  │  │   Service    │  │   Service    │              │   │
│  │  └──────────────┘  └──────────────┘              │   │
│  └───────┬──────────────────┬───────────────────────┘   │
│          │                  │                            │
│  ┌───────▼──────────┐  ┌───▼───────────────────────┐   │
│  │   SQLite/Postgres│  │   File System             │   │
│  │   (User DB)      │  │   (Mounted Volume)        │   │
│  └──────────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Ordnerstruktur im Container

```
/notenest/
├── frontend/              # React-App (Build-Output)
│   ├── build/            # Static Files
│   ├── public/
│   │   ├── manifest.json
│   │   └── service-worker.js
│   └── src/
├── backend/              # Node.js/Express
│   ├── src/
│   │   ├── routes/       # API-Routen
│   │   ├── services/     # Business-Logic
│   │   ├── middleware/   # Auth, Validation
│   │   ├── models/       # DB-Models
│   │   └── utils/        # Helper-Funktionen
│   └── package.json
├── docker-compose.yml
└── Dockerfile
```

### Mount-Points (Docker Volumes)

```
/nas/users/               # Host-System (NAS)
├── user1/
│   └── notes/
│       ├── folder1/
│       └── note1.md
├── user2/
│   └── notes/
│       └── ...
└── ...

Container:
/data/users/              # Gemountetes Volume
├── user1/               # Nur für user1 sichtbar
├── user2/               # Nur für user2 sichtbar
└── ...
```

---

## 💾 Datenmodell & Speicherung

### Datenbank-Schema (SQLite/PostgreSQL)

#### Tabelle: `users`
```sql
- id: INTEGER PRIMARY KEY
- username: VARCHAR(50) UNIQUE
- password_hash: VARCHAR(255)  # bcrypt/argon2 (NULL wenn NAS-Auth)
- email: VARCHAR(255) OPTIONAL
- auth_type: VARCHAR(20) DEFAULT 'local'  # 'local' | 'ldap' | 'synology'
- auth_source: VARCHAR(255) OPTIONAL  # LDAP-DN oder Synology-User-ID
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- is_active: BOOLEAN DEFAULT true
```

**Hinweis**: 
- `auth_type = 'local'`: Eigene Benutzerverwaltung, `password_hash` wird verwendet
- `auth_type = 'ldap'` oder `'synology'`: NAS-Authentifizierung, `password_hash` ist NULL
- `auth_source`: Referenz zum NAS-Benutzer (z.B. LDAP Distinguished Name)

#### Tabelle: `user_settings`
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FOREIGN KEY -> users.id
- private_folder_path: VARCHAR(500)  # z.B. "/homes/user1" (nur für diesen User sichtbar)
- shared_folder_path: VARCHAR(500)    # z.B. "/volume1/shared/notes" (für mehrere User sichtbar)
- theme: VARCHAR(20) DEFAULT 'light'
- default_export_size: VARCHAR(10) DEFAULT 'A4'
- default_bible_translation: VARCHAR(20) DEFAULT 'LUT'  # Standard-Übersetzung
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Hinweis**: Beide Pfade sind optional. Ein Benutzer kann nur private, nur geteilte, oder beide Ordner konfigurieren.

#### Tabelle: `user_bible_favorites`
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FOREIGN KEY -> users.id
- translation: VARCHAR(20)  # z.B. 'LUT', 'ELB', 'BasisBibel'
- display_order: INTEGER    # Reihenfolge in Favoriten-Liste
- created_at: TIMESTAMP

UNIQUE (user_id, translation)
INDEX idx_user_order (user_id, display_order)
```

**Hinweis**: Jeder Benutzer kann mehrere Übersetzungen als Favoriten markieren. Die Reihenfolge ist konfigurierbar.

#### Tabelle: `sessions` (für JWT-Blacklist oder Session-Tracking)
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FOREIGN KEY -> users.id
- token_id: VARCHAR(255)  # JWT jti (JWT ID)
- expires_at: TIMESTAMP
- created_at: TIMESTAMP
```

#### Tabelle: `file_metadata` (Optional: für schnelle Suche/Indexierung)
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FOREIGN KEY -> users.id
- file_path: VARCHAR(500)
- file_name: VARCHAR(255)
- parent_folder: VARCHAR(500)
- file_size: INTEGER
- last_modified: TIMESTAMP
- created_at: TIMESTAMP
```

### Dateisystem-Struktur

#### Private Ordner (z.B. Synology /homes/)
```
/homes/user1/                     # Nur für user1 sichtbar (NAS-Berechtigung)
├── .notenest/                    # Versteckter Config-Ordner
│   └── metadata.json             # Optional: Metadaten-Cache
├── folder1/
│   ├── note1.md
│   ├── note2.md
│   └── subfolder/
│       └── note3.md
├── folder2/
│   └── note4.md
└── note5.md                      # Root-Level Notizen
```

#### Geteilte Ordner (z.B. Synology /volume1/shared/)
```
/volume1/shared/notes/            # Für mehrere User sichtbar (NAS-Berechtigung)
├── team-notes/
│   ├── meeting-notes.md
│   └── project-ideas.md
├── public/
│   └── documentation.md
└── user1-contributions/          # User kann eigene Unterordner erstellen
    └── my-shared-note.md
```

**Konventionen:**
- **Bearbeitbare Dateien**: `.md` (Markdown), `.txt` (Plain Text)
- **Anzeigbare Dateien**: Alle Dateitypen werden angezeigt
- **Nicht bearbeitbare Dateien**: Werden ausgegraut dargestellt (z.B. `.pdf`, `.docx`, `.jpg`)
- Ordner: Keine Extension
- Versteckte Ordner: Beginnt mit `.` (werden ignoriert, außer `.notenest/`)
- Spezielle Dateien: `.notenest/` für App-Metadaten

**Bereits vorhandene Dateien:**
- Alle Dateien im konfigurierten Ordner werden angezeigt
- `.md` und `.txt` Dateien können direkt in der App bearbeitet werden
- Andere Dateitypen werden ausgegraut angezeigt (read-only)
- Dateien können umbenannt, verschoben und gelöscht werden (wenn Berechtigung vorhanden)
- **Sichtbarkeit**: Wird durch Dateisystem-Berechtigungen der NAS bestimmt

---

## 🔐 Sicherheitskonzept

### Authentifizierung & Autorisierung

### Authentifizierungs-Modi

NoteNest unterstützt zwei Authentifizierungs-Modi:

#### Modus 1: Eigene Benutzerverwaltung (Standard)

**Funktionsweise:**
- Benutzer registrieren sich in NoteNest mit Username und Passwort
- Passwörter werden in der App gehasht (Argon2id)
- Unabhängig von NAS-Benutzerverwaltung
- Jeder kann sich registrieren (oder Admin-Aktivierung)

**Vorteile:**
- ✅ Einfach zu implementieren
- ✅ Funktioniert auf jeder NAS (keine spezielle Konfiguration nötig)
- ✅ Unabhängig von NAS-Benutzerverwaltung
- ✅ Ideal für kleine Teams/Familien

**Nachteile:**
- ❌ Zwei separate Benutzerverwaltungen (NAS + NoteNest)
- ❌ Benutzer müssen sich zweimal anmelden (NAS + NoteNest)

#### Modus 2: NAS-Integration (Optional)

**Funktionsweise:**
- NoteNest nutzt die NAS-Authentifizierung
- Benutzer loggen sich mit NAS-Credentials ein
- Keine separate Registrierung nötig
- Unterstützt: Synology Directory Server, LDAP, Active Directory

**Vorteile:**
- ✅ Einheitliche Benutzerverwaltung (nur NAS)
- ✅ Benutzer müssen sich nur einmal anmelden
- ✅ Zentrale Verwaltung (Admin verwaltet nur NAS-Benutzer)
- ✅ Ideal für größere Organisationen

**Nachteile:**
- ❌ Erfordert NAS-Konfiguration (LDAP/Directory Server)
- ❌ Komplexere Implementierung
- ❌ Abhängig von NAS-Features

**Hybrid-Ansatz (Empfohlen):**
- Beide Modi werden unterstützt
- Konfigurierbar über Umgebungsvariable
- Benutzer können wählen (wenn beide aktiviert)

### Implementierung: NAS-Integration

#### Synology Directory Server

**Voraussetzungen:**
- Synology NAS mit Directory Server aktiviert
- LDAP-Service läuft
- Benutzer existieren im Directory Server

**Konfiguration:**
```env
# .env
AUTH_MODE=hybrid  # 'local' | 'ldap' | 'synology' | 'hybrid'
LDAP_ENABLED=true
LDAP_URL=ldap://synology-nas.local:389
LDAP_BASE_DN=dc=synology,dc=local
LDAP_BIND_DN=cn=admin,dc=synology,dc=local
LDAP_BIND_PASSWORD=admin-password
LDAP_USER_SEARCH_BASE=ou=users,dc=synology,dc=local
LDAP_USER_SEARCH_FILTER=(uid={username})
```

**Login-Flow:**
```javascript
// Pseudocode
async function loginWithLDAP(username, password) {
  // 1. Versuche LDAP-Authentifizierung
  const ldapClient = new LDAPClient({
    url: process.env.LDAP_URL,
    bindDN: process.env.LDAP_BIND_DN,
    bindPassword: process.env.LDAP_BIND_PASSWORD
  });
  
  // 2. Suche Benutzer im LDAP
  const userDN = await ldapClient.search(
    process.env.LDAP_USER_SEARCH_BASE,
    `(uid=${username})`
  );
  
  if (!userDN) {
    throw new Error("User not found in LDAP");
  }
  
  // 3. Versuche Bind mit Benutzer-Credentials
  try {
    await ldapClient.bind(userDN, password);
  } catch (error) {
    throw new Error("Invalid credentials");
  }
  
  // 4. Erstelle oder aktualisiere Benutzer in NoteNest-DB
  let user = await db.users.findOne({ 
    username,
    auth_type: 'ldap'
  });
  
  if (!user) {
    // Erster Login: Erstelle Benutzer in NoteNest-DB
    user = await db.users.create({
      username,
      auth_type: 'ldap',
      auth_source: userDN,
      password_hash: null, // Kein Passwort-Hash nötig
      is_active: true
    });
    
    // Erstelle Standard-Einstellungen
    await db.settings.create({
      userId: user.id,
      private_folder_path: `/homes/${username}`, // Synology-Standard
      shared_folder_path: null // Optional konfigurierbar
    });
  }
  
  // 5. Generiere JWT-Token
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return { accessToken, refreshToken, user };
}
```

#### LDAP (Allgemein)

**Unterstützte Protokolle:**
- LDAP v3
- LDAPS (LDAP over SSL/TLS)
- Active Directory (via LDAP)

**Konfiguration:**
```env
LDAP_ENABLED=true
LDAP_URL=ldaps://ldap.example.com:636
LDAP_BASE_DN=dc=example,dc=com
LDAP_BIND_DN=cn=notenest,ou=services,dc=example,dc=com
LDAP_BIND_PASSWORD=service-password
LDAP_USER_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_USER_SEARCH_FILTER=(sAMAccountName={username})  # Active Directory
# oder
LDAP_USER_SEARCH_FILTER=(uid={username})  # Standard LDAP
```

**Bibliothek:** `ldapjs` (Node.js)

#### Hybrid-Modus

**Funktionsweise:**
- Beide Authentifizierungs-Modi sind aktiv
- Login versucht zuerst NAS-Auth, dann lokale Auth
- Registrierung nur für lokale Benutzer möglich

**Login-Flow:**
```javascript
// Pseudocode
async function login(username, password) {
  // 1. Versuche NAS-Authentifizierung (wenn aktiviert)
  if (process.env.AUTH_MODE === 'hybrid' || process.env.AUTH_MODE === 'ldap') {
    try {
      return await loginWithLDAP(username, password);
    } catch (error) {
      // LDAP-Fehler: Weiter zu lokaler Auth
      if (process.env.AUTH_MODE === 'hybrid') {
        // Versuche lokale Auth
      } else {
        throw error; // Nur LDAP erlaubt
      }
    }
  }
  
  // 2. Lokale Authentifizierung
  const user = await db.users.findOne({ 
    username,
    auth_type: 'local'
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  // 3. Passwort prüfen
  const isValid = await argon2.verify(user.password_hash, password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }
  
  // 4. Generiere Token
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return { accessToken, refreshToken, user };
}
```

### Benutzer-Synchronisation (Optional)

**Problem**: Was passiert, wenn ein NAS-Benutzer gelöscht wird?

**Lösung 1: Manuelle Synchronisation**
- Admin kann Benutzer in NoteNest deaktivieren
- Keine automatische Synchronisation

**Lösung 2: Automatische Synchronisation (Zukünftige Erweiterung)**
- Periodische LDAP-Abfrage (z.B. täglich)
- Deaktiviere NoteNest-Benutzer, wenn nicht mehr in LDAP vorhanden
- Optional: Lösche Benutzer-Daten nach X Tagen

**Lösung 3: On-Demand-Synchronisation**
- Bei jedem Login: Prüfe, ob Benutzer noch in LDAP existiert
- Wenn nicht: Deaktiviere Benutzer

### Einstellungen pro Authentifizierungs-Modus

**Lokale Benutzer:**
- Können Passwort ändern (in NoteNest)
- Können sich registrieren
- Können Account löschen

**NAS-Benutzer:**
- Können Passwort NICHT in NoteNest ändern (muss über NAS erfolgen)
- Können sich NICHT registrieren (müssen in NAS erstellt werden)
- Können Account NICHT löschen (muss über NAS erfolgen)
- Können Einstellungen ändern (Basisordner, Theme, etc.)

### API-Anpassungen

**Registrierung:**
```
POST /api/auth/register
  - Nur verfügbar wenn AUTH_MODE = 'local' oder 'hybrid'
  - Für NAS-Benutzer: Nicht verfügbar (müssen in NAS erstellt werden)
```

**Login:**
```
POST /api/auth/login
  - Unterstützt beide Modi
  - Backend entscheidet basierend auf auth_type
```

**Passwort ändern:**
```
PUT /api/auth/password
  - Nur für lokale Benutzer (auth_type = 'local')
  - Für NAS-Benutzer: 403 Forbidden
```

#### 1. Passwort-Sicherheit
- **Hashing**: Argon2id (moderner als bcrypt, resistenter gegen GPU-Angriffe)
- **Salt**: Automatisch von Argon2 generiert
- **Parameter**: 
  - Memory: 64 MB
  - Iterations: 3
  - Parallelism: 4

#### 2. JWT-Implementierung
- **Access Token**: 
  - Lifetime: 15 Minuten
  - Enthält: `userId`, `username`, `jti` (JWT ID)
  - Signiert mit: HS256 oder RS256
- **Refresh Token**:
  - Lifetime: 7 Tage (oder konfigurierbar)
  - Gespeichert in DB mit `token_id`
  - Kann invalidiert werden (Logout, Security-Event)

#### 3. Pfadvalidierung (Kritisch!)

**Problem**: Verhindern von Path-Traversal-Angriffen

**Lösung**:
```javascript
// Pseudocode
function validateUserPath(userId, requestedPath) {
  // 1. Basisordner des Users aus DB holen
  const userBasePath = getUserBasePath(userId); // z.B. "/data/users/user1"
  
  // 2. Normalisiere beide Pfade (resolve relative paths)
  const normalizedBase = path.resolve(userBasePath);
  const normalizedRequest = path.resolve(userBasePath, requestedPath);
  
  // 3. Prüfe: Requested-Path muss innerhalb von Base-Path sein
  if (!normalizedRequest.startsWith(normalizedBase + path.sep) && 
      normalizedRequest !== normalizedBase) {
    throw new SecurityError("Path traversal attempt detected");
  }
  
  // 4. Prüfe auf gefährliche Zeichen/Patterns
  if (requestedPath.includes('..') || 
      requestedPath.includes('~') ||
      requestedPath.startsWith('/')) {
    throw new SecurityError("Invalid path");
  }
  
  return normalizedRequest;
}
```

**Regeln:**
- Alle Pfade relativ zum User-Basisordner
- Keine absoluten Pfade erlaubt
- Keine `..` oder `~` erlaubt
- Pfad muss mit `/` oder `\` beginnen (relativ zum Base)
- Whitelist für erlaubte Zeichen

#### 4. Dateioperationen-Sicherheit
- **Lesen**: Nur innerhalb der konfigurierten Basisordner (privat oder geteilt)
- **Schreiben**: Nur wenn Dateisystem-Berechtigung vorhanden
- **Löschen**: Validierung vor Löschen + Berechtigungsprüfung
- **Umbenennen**: Nur innerhalb des gleichen Basisordners
- **Verschieben**: Zwischen privaten und geteilten Ordnern möglich, wenn Berechtigung vorhanden

#### 5. URL-basierte Zugriffe (Path-Traversal-Schutz)
- **Validierung bei jedem Request**: Pfad wird validiert, auch wenn aus URL kommt
- **Keine Vertrauensstellung**: Frontend-URLs werden nie blind vertraut
- **Backend-Validierung**: Jeder API-Call prüft Berechtigung neu
- **403 Forbidden**: Wenn kein Zugriff → Fehlermeldung, kein Redirect zu fremden Pfaden
- **URL-Encoding**: Pfade werden korrekt encodiert/decodiert (verhindert Injection)

#### 5. Rate Limiting
- Login-Versuche: 5 pro 15 Minuten pro IP
- API-Calls: 100 pro Minute pro User
- PDF-Export: 10 pro Stunde pro User

#### 6. Input-Validierung
- Dateinamen: Nur alphanumerisch, `-`, `_`, Leerzeichen, `.`
- Max. Dateinamenlänge: 255 Zeichen
- Max. Dateigröße: 10 MB pro Notiz
- Max. Ordnertiefe: 10 Ebenen

---

## 🔌 API-Design

### RESTful API-Struktur

#### Authentifizierung
```
POST   /api/auth/register      # Nur wenn AUTH_MODE = 'local' oder 'hybrid'
POST   /api/auth/login         # Unterstützt lokale und NAS-Auth
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/password      # Nur für lokale Benutzer (auth_type = 'local')
GET    /api/auth/mode          # Gibt aktiven Auth-Modus zurück
```

#### Dateiverwaltung
```
GET    /api/files/list?path=/folder1&type=private|shared
GET    /api/files/content?path=/folder1/note.md&type=private|shared
POST   /api/files/create
  Body: { path: "/folder1/note.md", content: "...", type: "private"|"shared" }
PUT    /api/files/update
  Body: { path: "/folder1/note.md", content: "...", type: "private"|"shared" }
DELETE /api/files/delete
  Body: { path: "/folder1/note.md", type: "private"|"shared" }
POST   /api/files/move
  Body: { from: "/old.md", to: "/new.md", fromType: "private", toType: "shared" }
POST   /api/files/rename
  Body: { path: "/old.md", newName: "new.md", type: "private"|"shared" }
POST   /api/files/create-folder
  Body: { path: "/newfolder", type: "private"|"shared" }
```

#### Einstellungen
```
GET    /api/settings
PUT    /api/settings
```

#### PDF-Export
```
POST   /api/export/pdf
  Body: { path: "/note.md", size: "A4" | "A5" }
  Response: PDF-File (Binary)
```

### Beispiel-Requests

#### Login (Unterstützt lokale und NAS-Auth)
```json
POST /api/auth/login
{
  "username": "user1",
  "password": "securePassword123",
  "rememberMe": true
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "user": {
    "id": 1,
    "username": "user1",
    "authType": "local" | "ldap" | "synology"
  }
}
```

**Hinweis**: 
- Backend versucht zuerst NAS-Auth (wenn aktiviert), dann lokale Auth
- Bei Hybrid-Modus: Automatische Fallback-Logik
- Bei reinem LDAP-Modus: Nur NAS-Auth, keine Fallback

#### Auth-Modus abfragen
```json
GET /api/auth/mode

Response:
{
  "authMode": "hybrid",
  "ldapEnabled": true,
  "registrationEnabled": true  # Nur wenn lokale Auth aktiv
}
```

#### Dateien auflisten
```json
GET /api/files/list?path=/folder1&type=private
Headers: Authorization: Bearer {accessToken}

Response:
{
  "path": "/folder1",
  "type": "private",
  "items": [
    {
      "name": "note1.md",
      "type": "file",
      "fileType": {
        "type": "editable",
        "mimeType": "text/markdown",
        "canEdit": true,
        "canView": true
      },
      "size": 1024,
      "modified": "2024-01-15T10:30:00Z",
      "canWrite": true,
      "canDelete": true,
      "isEditable": true
    },
    {
      "name": "document.pdf",
      "type": "file",
      "fileType": {
        "type": "viewable",
        "mimeType": "application/pdf",
        "canEdit": false,
        "canView": true
      },
      "size": 2048,
      "modified": "2024-01-15T09:00:00Z",
      "canWrite": true,
      "canDelete": true,
      "isEditable": false
    },
    {
      "name": "subfolder",
      "type": "folder",
      "modified": "2024-01-15T09:00:00Z",
      "canWrite": true,
      "canDelete": true
    }
  ]
}
```

**Hinweise**: 
- `canWrite` und `canDelete` werden basierend auf Dateisystem-Berechtigungen ermittelt
- `isEditable` gibt an, ob die Datei im Editor bearbeitet werden kann (nur `.md` und `.txt`)
- `fileType` enthält Informationen über den Dateityp und Bearbeitbarkeit

#### Notiz erstellen
```json
POST /api/files/create
Headers: Authorization: Bearer {accessToken}
{
  "path": "/folder1/new-note.md",
  "content": "# Neue Notiz\n\nInhalt..."
}

Response:
{
  "success": true,
  "path": "/folder1/new-note.md",
  "message": "File created successfully"
}
```

---

## 🎨 Frontend-Architektur

### Komponenten-Struktur

```
src/
├── components/
│   ├── Layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── BottomToolbar.tsx
│   ├── Editor/
│   │   ├── MarkdownEditor.tsx
│   │   ├── Preview.tsx
│   │   └── Toolbar.tsx
│   ├── FileManager/
│   │   ├── FileTree.tsx
│   │   ├── FileItem.tsx
│   │   ├── FolderSection.tsx      # Für "Privat" und "Geteilt" Sektionen
│   │   └── ContextMenu.tsx
│   ├── Auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── Settings/
│       ├── SettingsPanel.tsx
│       └── FolderSettings.tsx     # Konfiguration der Basisordner
├── pages/
│   ├── LoginPage.tsx
│   ├── NotesPage.tsx
│   └── SettingsPage.tsx
├── services/
│   ├── api.ts          # API-Client
│   ├── auth.ts         # Auth-Logic
│   └── storage.ts      # LocalStorage/IndexedDB
├── hooks/
│   ├── useAuth.ts
│   ├── useFiles.ts
│   └── useEditor.ts
├── store/              # State Management (Zustand/Redux)
│   ├── authStore.ts
│   ├── fileStore.ts
│   └── editorStore.ts
└── utils/
    ├── markdown.ts
    └── validation.ts
```

### State Management

**Empfehlung: Zustand (lightweight) oder Redux Toolkit**

**Stores:**
- `authStore`: User-Info, Token, Login-Status
- `fileStore`: Dateibaum, aktuelle Datei, Auswahl
- `editorStore`: Editor-Content, Vorschau-Modus, Änderungen

### Routing

**React Router v6**

```
/                    -> Login (wenn nicht eingeloggt) / Notes (wenn eingeloggt)
/login               -> Login-Seite
/register            -> Registrierung
/notes               -> Haupt-Notizen-Ansicht
/notes/:type/:path*  -> Notiz bearbeiten 
                       (type = "private" | "shared", path = URL-encodierter relativer Pfad)
/settings            -> Einstellungen
```

**URL-Struktur-Beispiele:**
- `/notes/private/folder1/note1` → Private Notiz: `/folder1/note1.md`
- `/notes/shared/team-notes/meeting` → Geteilte Notiz: `/team-notes/meeting.md`
- `/notes/private` → Root-Ordner (privat)
- `/notes/shared` → Root-Ordner (geteilt)

**Wichtig**: Pfade werden URL-encodiert (z.B. Leerzeichen → `%20`, `/` → `%2F`)

### URL-Sharing & Sicherheit

**Design-Entscheidung: Pfade in URLs**

**Vorteile:**
- ✅ Deep-Linking: Direkter Zugriff auf spezifische Notizen
- ✅ Bookmarking: Benutzer können Notizen bookmarken
- ✅ Browser-History: Zurück/Vor-Buttons funktionieren
- ✅ Teilbar: URLs können geteilt werden (mit Einschränkungen)

**Sicherheitsrisiken & Mitigation:**

1. **Path-Traversal über URL:**
   - **Risiko**: Jemand könnte versuchen, fremde Pfade zu erraten: `/notes/private/../../otheruser/note`
   - **Mitigation**: Backend validiert JEDEN Pfad-Zugriff über URL
   - **Validierung**: Server prüft, ob der Benutzer Zugriff auf diesen Pfad hat

2. **URL-Sharing zwischen Benutzern:**
   - **Risiko**: Benutzer A teilt URL mit Benutzer B, der keinen Zugriff hat
   - **Mitigation**: Backend prüft Berechtigung bei jedem Zugriff
   - **Verhalten**: Wenn keine Berechtigung → 403 Forbidden oder Redirect zu `/notes`

3. **Sensible Pfad-Informationen:**
   - **Risiko**: URLs könnten interne Struktur preisgeben
   - **Mitigation**: Pfade sind relativ zum Basisordner, keine absoluten Pfade
   - **Alternative**: Encodierte IDs statt Pfade (siehe unten)

**Backend-Validierung bei URL-Zugriff:**

```javascript
// Pseudocode: Route-Handler
app.get('/api/files/content', authenticate, async (req, res) => {
  const { path: filePath, type } = req.query;
  const userId = req.user.id;
  
  try {
    // 1. Validierung: Pfad muss innerhalb des User-Bereichs sein
    const validatedPath = await validateAndResolvePath(userId, filePath, type);
    
    // 2. Prüfe Lese-Berechtigung
    const permissions = await checkFilePermissions(validatedPath, userId);
    if (!permissions.canRead) {
      return res.status(403).json({ 
        error: "Access denied",
        message: "You don't have permission to access this file"
      });
    }
    
    // 3. Prüfe Dateityp: Nur .md und .txt können gelesen werden
    const fileType = getFileType(path.basename(filePath));
    if (!fileType.canEdit) {
      return res.status(400).json({ 
        error: "File type not editable",
        message: "Only .md and .txt files can be edited in the app"
      });
    }
    
    // 4. Datei lesen
    const content = await readFile(userId, filePath, type);
    
    res.json({ content, path: filePath, type, fileType });
  } catch (error) {
    if (error instanceof SecurityError) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
```

**Frontend: URL-Parameter validieren**

```javascript
// Pseudocode: React Component
function NoteEditor() {
  const { type, path } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Validiere URL-Parameter beim Laden
    if (type !== 'private' && type !== 'shared') {
      navigate('/notes'); // Ungültiger Typ
      return;
    }
    
    // Lade Datei (Backend validiert Berechtigung)
    loadFile(path, type).catch(error => {
      if (error.status === 403) {
        // Keine Berechtigung → Redirect
        navigate('/notes');
        showNotification("You don't have access to this note");
      } else if (error.status === 404) {
        navigate('/notes');
        showNotification("Note not found");
      }
    });
  }, [type, path]);
  
  // ...
}
```

### Alternative: Encodierte IDs statt Pfade

**Option B: IDs in URLs (wenn Sharing unerwünscht)**

**Vorteile:**
- ✅ Keine Pfad-Informationen in URL
- ✅ Schwerer zu erraten
- ✅ Einfacher zu ändern (Pfad-Änderung ändert nicht die ID)

**Nachteile:**
- ❌ Keine Deep-Links zu spezifischen Pfaden möglich
- ❌ Keine Bookmarking von Pfaden
- ❌ Zusätzliche Datenbank-Tabelle nötig (Pfad → ID Mapping)

**Implementierung (Optional):**
```sql
-- Tabelle: file_references
- id: VARCHAR(36) PRIMARY KEY (UUID)
- user_id: INTEGER FOREIGN KEY
- file_path: VARCHAR(500)
- folder_type: VARCHAR(10) ('private' | 'shared')
- created_at: TIMESTAMP
```

**URL-Struktur mit IDs:**
```
/notes/:id          -> Notiz über ID (z.B. /notes/550e8400-e29b-41d4-a716-446655440000)
```

**Empfehlung**: Pfade in URLs verwenden, da:
1. Benutzerfreundlicher (verständliche URLs)
2. Deep-Linking ermöglicht
3. Backend-Validierung schützt vor unberechtigtem Zugriff
4. Sharing ist ein Feature, nicht ein Bug (wenn gewünscht)

### Sharing-Funktionalität (Optional)

**Wenn URL-Sharing gewünscht ist:**

**Option 1: Direktes URL-Sharing**
- Benutzer kopiert URL aus Browser
- Geteilter Benutzer muss eingeloggt sein
- Backend prüft Berechtigung beim Zugriff
- **Einschränkung**: Nur für geteilte Notizen sinnvoll

**Option 2: Share-Links mit Token**
- Generiere temporäre Share-Links mit Token
- Token in Datenbank speichern mit:
  - Gültigkeitsdauer (z.B. 7 Tage)
  - Berechtigungen (nur-Lese oder Schreibzugriff)
  - Optional: Passwort-geschützt

**API-Endpunkte für Share-Links:**
```
POST   /api/files/share
  Body: { path: "/note.md", type: "shared", expiresIn: 7, password: "optional" }
  Response: { shareToken: "abc123...", shareUrl: "/share/abc123..." }

GET    /api/share/:token
  Response: { path: "/note.md", type: "shared", canEdit: false }

DELETE /api/files/share/:token
  Revoke share link
```

**URL-Struktur für Share-Links:**
```
/share/:token        -> Öffentlicher Zugriff (ohne Login, wenn Token gültig)
```

**Empfehlung für MVP**: 
- Keine Share-Links im MVP
- URLs können manuell geteilt werden (Backend validiert Berechtigung)
- Share-Links als zukünftige Erweiterung

---

## 📱 PWA-Implementierung

### Manifest.json

```json
{
  "name": "NoteNest",
  "short_name": "NN",
  "description": "Persönliche Notizen-App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#007AFF",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Neue Notiz",
      "short_name": "Neu",
      "description": "Erstelle eine neue Notiz",
      "url": "/notes/new",
      "icons": [{ "src": "/icons/shortcut-new.png", "sizes": "96x96" }]
    }
  ]
}
```

### Service Worker-Strategie

**Workbox für Service Worker**

**Caching-Strategien:**
- **HTML/CSS/JS**: Cache First (mit Network Fallback)
- **API-Calls**: Network First (mit Cache Fallback)
- **Icons/Images**: Cache First
- **Markdown-Files**: Network First (immer aktuell)

**Offline-Funktionalität:**
- Offline-Seite anzeigen, wenn keine Verbindung
- Lokale Notizen in IndexedDB cachen
- Sync beim Wieder-Online-Gehen

### Installierbarkeit

**Kriterien:**
- HTTPS (oder localhost)
- Valid manifest.json
- Service Worker registriert
- Icons vorhanden

**Install-Prompt:**
- Custom "Add to Home Screen" Button
- Erscheint nach 2-3 Besuchen

---

## 🐳 Docker & Deployment

### Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Frontend Build
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Backend Build
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

# Stage 3: Production
FROM node:18-alpine
WORKDIR /app

# Install Puppeteer Dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copy built files
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Create data directory
RUN mkdir -p /data/users

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  notenest:
    build: .
    container_name: notenest
    ports:
      - "3000:3000"
    volumes:
      # NAS-Mounts (Synology Beispiel)
      - /volume1/homes:/data/homes:ro     # Private Ordner (read-only für Sicherheit)
      - /volume1/shared:/data/shared:rw   # Geteilte Ordner (read-write)
      # Oder: Lokale Entwicklung
      # - ./data/users:/data/users          # User-Daten (lokale Entwicklung)
      - ./data/database:/data/database    # SQLite-DB
      - ./logs:/app/logs                  # Logs
    # Wichtig: Container-User muss Zugriff auf NAS-Ordner haben
    # Option A: Als root (einfach, aber weniger sicher)
    # user: "0:0"
    # Option B: Als NAS-Admin-User (empfohlen für Synology)
    user: "1024:100"  # admin:users (Synology Standard)
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - DATA_ROOT=/data/users
      - DB_PATH=/data/database/notenest.db
      - LOG_LEVEL=info
    restart: unless-stopped
    networks:
      - notenest-network

  # Optional: Traefik als Reverse Proxy
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
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.notenest.rule=Host(`notenest.example.com`)"
      - "traefik.http.routers.notenest.entrypoints=websecure"
      - "traefik.http.routers.notenest.tls.certresolver=letsencrypt"

networks:
  notenest-network:
    driver: bridge
```

### Umgebungsvariablen (.env)

```env
# JWT Secrets (generiere mit: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Authentifizierung
AUTH_MODE=hybrid  # 'local' | 'ldap' | 'synology' | 'hybrid'
LDAP_ENABLED=false
LDAP_URL=ldap://synology-nas.local:389
LDAP_BASE_DN=dc=synology,dc=local
LDAP_BIND_DN=cn=admin,dc=synology,dc=local
LDAP_BIND_PASSWORD=admin-password
LDAP_USER_SEARCH_BASE=ou=users,dc=synology,dc=local
LDAP_USER_SEARCH_FILTER=(uid={username})

# Datenbank
DB_PATH=/data/database/notenest.db

# Server
PORT=3000
NODE_ENV=production

# Dateisystem
DATA_ROOT=/data/users

# NAS-Konfiguration
NAS_TYPE=synology  # 'synology' | 'generic' | '' (keine NAS-Integration)
NAS_HOMES_PATH=/data/homes  # Pfad zu /homes/ auf NAS
NAS_SHARED_PATH=/data/shared  # Pfad zu geteilten Ordnern
USER_MAPPING_MODE=same  # 'same' (Username = NAS-Username) | 'mapped' (explizites Mapping)

# Bibelstellen-Referenzen
BIBLE_API_ENABLED=true
BIBLE_API_KEY=your-api-bible-key-here
BIBLE_API_URL=https://api.bible/v1
BIBLE_API_CACHE_TTL=3600
BIBLE_SUPERSEARCH_ENABLED=true
BIBLE_SUPERSEARCH_URL=https://api.biblesupersearch.com/api

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/notenest.log
```

### Reverse Proxy (Traefik) - Optional

**traefik.yml:**
```yaml
api:
  dashboard: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /certs/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
```

---

## 🎨 UI/UX-Konzept

### Design-Philosophie: iPhone-Notizen-App

**Farben:**
- **Primär**: #007AFF (iOS Blue)
- **Hintergrund**: #FFFFFF (Light) / #1C1C1E (Dark)
- **Text**: #000000 (Light) / #FFFFFF (Dark)
- **Akzent**: #34C759 (Green für Erfolg), #FF3B30 (Red für Fehler)

**Typografie:**
- **Font**: System Font Stack (San Francisco auf iOS, Segoe UI auf Windows)
- **Headings**: 28px, 22px, 20px
- **Body**: 17px
- **Caption**: 15px

### Layout-Struktur

```
┌─────────────────────────────────────────┐
│  Header                                 │
│  [☰] NoteNest        [⚙️] [👤]         │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Editor Area                 │
│ (Files)  │  ┌────────────────────────┐  │
│          │  │ Markdown Editor        │  │
│ 📁 Privat│  │                        │  │
│ - folder1│  │                        │  │
│   - note1│  │                        │  │
│ - folder2│  │                        │  │
│          │  └────────────────────────┘  │
│ 👥 Geteilt│  ┌────────────────────────┐  │
│ - team/  │  │ Preview                │  │
│   - meet │  │                        │  │
│ - public │  │                        │  │
│          │  └────────────────────────┘  │
│          │                              │
├──────────┴──────────────────────────────┤
│  Bottom Toolbar                         │
│  [📁] [✏️] [👁️] [📤] [🗑️]              │
└─────────────────────────────────────────┘
```

**Sidebar-Struktur:**
- **📁 Privat**: Persönliche Notizen (nur für diesen Benutzer sichtbar)
- **👥 Geteilt**: Geteilte Notizen (für mehrere Benutzer sichtbar, basierend auf NAS-Berechtigungen)

### Bottom Toolbar (iPhone-Notizen-Style)

**Icons & Funktionen:**
1. **📁 Ordner**: Neue Ordner erstellen, Ordnerstruktur anzeigen
2. **✏️ Bearbeiten**: Editor-Modus umschalten
3. **👁️ Vorschau**: Markdown-Vorschau anzeigen
4. **📤 Export**: PDF-Export (A4/A5 wählen)
5. **🗑️ Löschen**: Aktuelle Notiz/Ordner löschen

**Verhalten:**
- Immer sichtbar (sticky bottom)
- Touch-optimiert (große Buttons, 44px Höhe)
- Haptic Feedback auf iOS

### Responsive Design

**Breakpoints:**
- **Mobile**: < 768px (Sidebar als Drawer)
- **Tablet**: 768px - 1024px (Sidebar collapsible)
- **Desktop**: > 1024px (Sidebar permanent)

**Touch-Gesten:**
- Swipe links: Sidebar öffnen/schließen
- Long-press: Context-Menu
- Pinch-to-zoom: Editor-Text vergrößern

### Icon-Design

**NoteNest-Logo:**
- **Basis**: Runder oder abgerundeter Container
- **Kürzel**: "NN" in moderner, fetter Schrift
- **Farben**: #007AFF (Blau) auf weißem Hintergrund
- **Größen**: 16x16, 32x32, 48x48, 192x192, 512x512

**Icon-Varianten:**
- Standard: Blau auf Weiß
- Dark Mode: Weiß auf Blau
- Maskable: Für Android Adaptive Icons

---

## 📂 Dateisystem-Logik

### Hybrid-Ansatz: Mounted Volume + Sandbox-Logik

**Konzept:**
1. Docker-Container mountet gemeinsames Root-Verzeichnis (`/data/users`)
2. Jeder Benutzer hat technisch Zugriff auf alle Unterordner
3. **Aber**: App-Logik beschränkt jeden Benutzer auf seinen Bereich

### Dateisystem-Zugriff: NAS-Benutzer-Mapping

**Problem**: Der Docker-Container muss wissen, als welcher NAS-Benutzer er auf Dateien zugreift, damit die Dateisystem-Berechtigungen korrekt funktionieren.

**Lösung: User-Mapping zwischen NoteNest und NAS**

#### Ansatz 1: Username-Gleichheit (Einfachste Lösung)

**Konzept:**
- NoteNest-Username = NAS-Username (z.B. beide "user1")
- Container läuft als ein User mit Zugriff auf alle `/homes/` Ordner
- Dateisystem-Berechtigungen werden durch NAS gesteuert

**Vorteile:**
- ✅ Einfach zu verstehen
- ✅ Keine zusätzliche Mapping-Tabelle nötig
- ✅ Funktioniert, wenn NoteNest-User = NAS-User

**Nachteile:**
- ❌ Funktioniert nicht, wenn Usernames unterschiedlich sind
- ❌ Container braucht Zugriff auf alle `/homes/` Ordner

**Implementierung:**
```javascript
// Pseudocode
// Benutzer registriert sich mit NAS-Username
async function registerUser(username, password) {
  // 1. Prüfe: Existiert dieser User im NAS?
  const nasUserExists = await checkNASUserExists(username);
  if (!nasUserExists) {
    throw new Error("NAS user does not exist. Please create user in NAS first.");
  }
  
  // 2. Erstelle NoteNest-User mit gleichem Username
  const user = await db.users.create({
    username, // = NAS-Username
    password_hash: await argon2.hash(password),
    nas_username: username, // Mapping: NoteNest-User → NAS-User
    auth_type: 'local'
  });
  
  // 3. Standard-Einstellungen mit NAS-Pfaden
  await db.settings.create({
    userId: user.id,
    private_folder_path: `/homes/${username}`, // NAS-Standard
    shared_folder_path: `/volume1/shared/notes`
  });
  
  return user;
}
```

#### Ansatz 2: Explizites User-Mapping (Flexibler)

**Konzept:**
- NoteNest-User kann einen anderen NAS-Username haben
- Mapping-Tabelle: NoteNest-User → NAS-User
- Bei Registrierung: Benutzer gibt NAS-Username an

**Vorteile:**
- ✅ Flexibel: NoteNest-User kann anderen NAS-User verwenden
- ✅ Unterstützt Szenarien, wo Usernames unterschiedlich sind

**Nachteile:**
- ❌ Zusätzliche Konfiguration nötig
- ❌ Komplexer

**Datenbank-Schema:**
```sql
-- Erweitere users-Tabelle
ALTER TABLE users ADD COLUMN nas_username VARCHAR(50);
-- Oder separate Mapping-Tabelle
CREATE TABLE user_nas_mapping (
  id INTEGER PRIMARY KEY,
  user_id INTEGER FOREIGN KEY -> users.id,
  nas_username VARCHAR(50) UNIQUE,
  created_at: TIMESTAMP
);
```

#### Ansatz 3: Container läuft als NAS-User (Komplex)

**Konzept:**
- Container startet mit UID/GID des NAS-Users
- Jeder Request läuft als entsprechender NAS-User

**Vorteile:**
- ✅ Exakte Dateisystem-Berechtigungen
- ✅ Keine Umgehung von NAS-Berechtigungen möglich

**Nachteile:**
- ❌ Sehr komplex: Container muss für jeden User neu gestartet werden
- ❌ Nicht praktikabel bei mehreren gleichzeitigen Usern
- ❌ Docker-Container können nicht einfach User wechseln

**Nicht empfohlen** für Multi-User-Szenarien.

### Empfohlene Lösung: Username-Gleichheit + Container mit Root/Service-User

**Konzept:**
1. **NoteNest-Username = NAS-Username**
   - Bei Registrierung: Prüfe, ob NAS-User existiert
   - Verwende gleichen Username

2. **Container läuft als User mit Zugriff auf alle Ordner**
   - Option A: Container läuft als `root` (einfach, aber weniger sicher)
   - Option B: Container läuft als Service-User mit entsprechenden Permissions
   - Option C: Container läuft als NAS-Admin-User

3. **Dateisystem-Berechtigungen werden respektiert**
   - App versucht auf `/homes/user1` zuzugreifen
   - NAS-Dateisystem prüft Berechtigungen
   - Wenn Container-User keine Berechtigung hat → Fehler
   - App filtert basierend auf erfolgreichen Zugriffen

**Docker-Container-Konfiguration:**
```yaml
# docker-compose.yml
services:
  notenest:
    # Option A: Als root (einfach, aber weniger sicher)
    user: "0:0"  # root:root
    
    # Option B: Als Service-User (empfohlen)
    # user: "1000:1000"  # notenest:notenest
    # Voraussetzung: Dieser User muss auf NAS Zugriff haben
    
    # Option C: Als NAS-Admin-User
    # user: "1024:100"  # admin:users (Synology Standard)
    
    volumes:
      - /volume1/homes:/data/homes:ro  # Read-only für Sicherheit
      - /volume1/shared:/data/shared:rw  # Read-write für geteilte Ordner
```

**Wichtig**: Container-User muss auf alle `/homes/` Ordner zugreifen können, die NoteNest-Benutzer verwenden.

### Alternative: NFS/SMB Mount mit User-Credentials

**Konzept:**
- Jeder NoteNest-User hat NAS-Credentials gespeichert
- Bei Dateizugriff: Mount mit User-spezifischen Credentials
- Oder: Proxy-Service, der als NAS-User agiert

**Vorteile:**
- ✅ Exakte Berechtigungen pro User
- ✅ Keine Notwendigkeit für Container-User mit breiten Permissions

**Nachteile:**
- ❌ Sehr komplex: Dynamisches Mounting
- ❌ Performance-Overhead
- ❌ Sicherheitsrisiko: Credentials müssen gespeichert werden

**Nicht empfohlen** für MVP.

### Implementierung: NAS-User-Validierung

**Bei Registrierung:**
```javascript
// Pseudocode
async function validateNASUser(username) {
  // Prüfe, ob NAS-User existiert
  // Option 1: Prüfe Dateisystem (wenn Container Zugriff hat)
  const homesPath = `/data/homes/${username}`;
  try {
    const stats = await fs.stat(homesPath);
    if (stats.isDirectory()) {
      return { exists: true, path: homesPath };
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`NAS user "${username}" does not exist. Please create user in NAS first.`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`No permission to access NAS user "${username}" directory.`);
    }
    throw error;
  }
  
  // Option 2: LDAP-Abfrage (wenn LDAP aktiviert)
  if (process.env.LDAP_ENABLED === 'true') {
    const ldapUser = await queryLDAP(username);
    if (ldapUser) {
      return { exists: true, ldapDN: ldapUser.dn };
    }
  }
  
  return { exists: false };
}
```

**Bei Login:**
```javascript
// Pseudocode
async function login(username, password) {
  // 1. Authentifiziere in NoteNest
  const user = await authenticateInNoteNest(username, password);
  
  // 2. Prüfe: Existiert NAS-User noch?
  const nasUser = await validateNASUser(user.nas_username || user.username);
  if (!nasUser.exists) {
    throw new Error("NAS user no longer exists. Please contact administrator.");
  }
  
  // 3. Prüfe: Hat Container Zugriff auf NAS-Ordner?
  const privatePath = `/data/homes/${user.nas_username || user.username}`;
  try {
    await fs.access(privatePath, constants.R_OK);
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new Error("No permission to access NAS directory. Please check container permissions.");
    }
    throw error;
  }
  
  return user;
}
```

### Datenbank-Schema-Erweiterung

```sql
-- Erweitere users-Tabelle
ALTER TABLE users ADD COLUMN nas_username VARCHAR(50);
-- Index für schnelle Suche
CREATE INDEX idx_nas_username ON users(nas_username);

-- Oder: Separate Mapping-Tabelle (wenn Usernames unterschiedlich sein können)
CREATE TABLE user_nas_mapping (
  id INTEGER PRIMARY KEY,
  user_id INTEGER FOREIGN KEY -> users.id UNIQUE,
  nas_username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Empfohlene Konfiguration

**Für Synology NAS:**
```yaml
# docker-compose.yml
services:
  notenest:
    # Container läuft als admin-User (hat Zugriff auf /homes/)
    user: "1024:100"  # admin:users (Synology Standard)
    
    volumes:
      # Mount /homes/ für private Ordner
      - /volume1/homes:/data/homes:ro
      # Mount /volume1/shared/ für geteilte Ordner
      - /volume1/shared:/data/shared:rw
```

**Umgebungsvariablen:**
```env
# NAS-Konfiguration
NAS_TYPE=synology  # 'synology' | 'generic'
NAS_HOMES_PATH=/data/homes
NAS_SHARED_PATH=/data/shared

# User-Mapping
USER_MAPPING_MODE=same  # 'same' (Username = NAS-Username) | 'mapped' (explizites Mapping)
```

### Zusammenfassung

**Einfachste Lösung (Empfohlen für MVP):**
1. NoteNest-Username = NAS-Username
2. Container läuft als User mit Zugriff auf alle `/homes/` Ordner
3. Bei Registrierung: Prüfe, ob NAS-User existiert
4. App-Logik filtert basierend auf Dateisystem-Berechtigungen

**Vorteile:**
- ✅ Einfach zu implementieren
- ✅ Keine komplexe User-Mapping-Logik
- ✅ Funktioniert mit Standard-NAS-Setup
- ✅ Dateisystem-Berechtigungen werden automatisch respektiert

### Implementierungs-Logik

#### 1. Benutzer-Registrierung
```javascript
// Pseudocode
async function registerUser(username, password) {
  // 1. Prüfe: Existiert NAS-User? (wenn NAS-Integration aktiv)
  if (process.env.NAS_TYPE) {
    const nasUser = await validateNASUser(username);
    if (!nasUser.exists) {
      throw new Error(`NAS user "${username}" does not exist. Please create user in NAS first.`);
    }
  }
  
  // 2. Passwort hashen
  const passwordHash = await argon2.hash(password);
  
  // 3. User in DB speichern
  const user = await db.users.create({ 
    username,
    passwordHash,
    nas_username: username, // Mapping: NoteNest-User = NAS-User
    auth_type: 'local'
  });
  
  // 4. Standard-Einstellungen mit NAS-Pfaden
  const privatePath = process.env.NAS_HOMES_PATH 
    ? `${process.env.NAS_HOMES_PATH}/${username}` 
    : `/data/users/${username}`;
  
  await db.settings.create({
    userId: user.id,
    private_folder_path: privatePath, // z.B. "/data/homes/user1"
    shared_folder_path: process.env.NAS_SHARED_PATH || null
  });
  
  // 5. Prüfe: Hat Container Zugriff auf NAS-Ordner?
  try {
    await fs.access(privatePath, constants.R_OK);
  } catch (error) {
    if (error.code === 'EACCES') {
      throw new Error("No permission to access NAS directory. Please check container permissions.");
    }
    // ENOENT ist OK - Ordner wird beim ersten Zugriff erstellt
  }
  
  return user;
}
```

#### 2. Pfadvalidierung (Kritisch!)

```javascript
// Pseudocode
function validateAndResolvePath(userId, requestedPath) {
  // 1. Basisordner aus DB holen
  const settings = await db.settings.findOne({ userId });
  const userBasePath = settings.baseFolderPath; // z.B. "/data/users/user1"
  
  // 2. Normalisiere Pfade (resolve relative paths, remove ..)
  const normalizedBase = path.resolve(userBasePath);
  let normalizedRequest;
  
  if (path.isAbsolute(requestedPath)) {
    // Absoluter Pfad: muss mit userBasePath beginnen
    normalizedRequest = path.resolve(requestedPath);
  } else {
    // Relativer Pfad: relativ zum userBasePath
    normalizedRequest = path.resolve(userBasePath, requestedPath);
  }
  
  // 3. Sicherheitsprüfung: Requested-Path muss innerhalb von Base-Path sein
  if (!normalizedRequest.startsWith(normalizedBase + path.sep) && 
      normalizedRequest !== normalizedBase) {
    throw new SecurityError("Path traversal attempt detected");
  }
  
  // 4. Zusätzliche Validierungen
  if (requestedPath.includes('..') || 
      requestedPath.includes('~') ||
      requestedPath.match(/[<>:"|?*]/)) { // Windows ungültige Zeichen
    throw new SecurityError("Invalid characters in path");
  }
  
  // 5. Prüfe auf versteckte System-Ordner (optional: erlauben für .notenest)
  const pathParts = normalizedRequest.split(path.sep);
  if (pathParts.some(part => part.startsWith('.') && part !== '.notenest')) {
    throw new SecurityError("Access to hidden folders not allowed");
  }
  
  return normalizedRequest;
}
```

#### 3. Dateioperationen mit Validierung

```javascript
// Beispiel: Datei lesen
async function readFile(userId, filePath) {
  const validatedPath = await validateAndResolvePath(userId, filePath);
  
  // Prüfe ob Datei existiert
  if (!fs.existsSync(validatedPath)) {
    throw new NotFoundError("File not found");
  }
  
  // Prüfe ob es eine Datei ist (nicht Ordner)
  const stats = fs.statSync(validatedPath);
  if (!stats.isFile()) {
    throw new Error("Path is not a file");
  }
  
  // Prüfe Dateigröße (Max 10 MB)
  if (stats.size > 10 * 1024 * 1024) {
    throw new Error("File too large");
  }
  
  return fs.readFileSync(validatedPath, 'utf-8');
}
```

#### 4. Ordnerstruktur auflisten

```javascript
async function listDirectory(userId, dirPath = '/') {
  const validatedPath = await validateAndResolvePath(userId, dirPath);
  
  if (!fs.existsSync(validatedPath)) {
    throw new NotFoundError("Directory not found");
  }
  
  const stats = fs.statSync(validatedPath);
  if (!stats.isDirectory()) {
    throw new Error("Path is not a directory");
  }
  
  const items = fs.readdirSync(validatedPath)
    .filter(item => !item.startsWith('.') || item === '.notenest')
    .map(item => {
      const itemPath = path.join(validatedPath, item);
      const itemStats = fs.statSync(itemPath);
      
      return {
        name: item,
        type: itemStats.isDirectory() ? 'folder' : 'file',
        size: itemStats.isFile() ? itemStats.size : null,
        modified: itemStats.mtime,
        path: path.relative(validatedPath, itemPath) // Relativ zum angefragten Pfad
      };
    });
  
  return items.sort((a, b) => {
    // Ordner zuerst, dann alphabetisch
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
```

### Vorteile des Hybrid-Ansatzes

1. **Flexibilität**: Benutzer kann Basisordner auf NAS-Verzeichnis zeigen
2. **Sicherheit**: App-Logik verhindert Zugriff auf fremde Ordner
3. **Einfachheit**: Username-Gleichheit macht User-Mapping überflüssig
4. **Portabilität**: Funktioniert auf jedem System mit Docker
5. **NAS-Integration**: Nutzt bestehende NAS-Benutzer und -Berechtigungen

### Nachteile & Mitigation

**Nachteil**: Wenn Container kompromittiert wird, könnte theoretisch auf alle Ordner zugegriffen werden.

**Mitigation**:
- Container läuft als non-root User
- File-System-Permissions auf Host-System setzen
- Regelmäßige Security-Audits
- Logging aller Dateioperationen

---

## 🔗 Private & Geteilte Ordner

### Konzept: Zwei Basisordner pro Benutzer

**Idee**: Jeder Benutzer kann zwei Basisordner konfigurieren:
1. **Privater Ordner**: Nur für diesen Benutzer sichtbar (z.B. `/homes/user1` auf Synology)
2. **Geteilter Ordner**: Für mehrere Benutzer sichtbar (z.B. `/volume1/shared/notes` auf Synology)

**Vorteil**: Die Sichtbarkeit wird durch die Dateisystem-Berechtigungen der NAS automatisch gefiltert.

### Synology-Beispiel

**Privater Ordner:**
- Pfad: `/homes/user1`
- NAS-Berechtigung: Nur `user1` hat Lese-/Schreibzugriff
- In NoteNest: Nur für `user1` sichtbar

**Geteilter Ordner:**
- Pfad: `/volume1/shared/notes`
- NAS-Berechtigung: Mehrere Benutzer haben Lese-/Schreibzugriff
- In NoteNest: Für alle berechtigten Benutzer sichtbar

### Erweiterte Pfadvalidierung

```javascript
// Pseudocode
async function validateAndResolvePath(userId, requestedPath, folderType) {
  // folderType: 'private' | 'shared'
  
  // 1. Einstellungen aus DB holen
  const settings = await db.settings.findOne({ userId });
  
  // 2. Basisordner basierend auf Typ wählen
  let userBasePath;
  if (folderType === 'private') {
    userBasePath = settings.private_folder_path;
    if (!userBasePath) {
      throw new Error("Private folder not configured");
    }
  } else if (folderType === 'shared') {
    userBasePath = settings.shared_folder_path;
    if (!userBasePath) {
      throw new Error("Shared folder not configured");
    }
  } else {
    throw new Error("Invalid folder type");
  }
  
  // 3. Normalisiere Pfade
  const normalizedBase = path.resolve(userBasePath);
  let normalizedRequest;
  
  if (path.isAbsolute(requestedPath)) {
    normalizedRequest = path.resolve(requestedPath);
  } else {
    normalizedRequest = path.resolve(userBasePath, requestedPath);
  }
  
  // 4. Sicherheitsprüfung: Requested-Path muss innerhalb von Base-Path sein
  if (!normalizedRequest.startsWith(normalizedBase + path.sep) && 
      normalizedRequest !== normalizedBase) {
    throw new SecurityError("Path traversal attempt detected");
  }
  
  // 5. Zusätzliche Validierungen
  if (requestedPath.includes('..') || 
      requestedPath.includes('~') ||
      requestedPath.match(/[<>:"|?*]/)) {
    throw new SecurityError("Invalid characters in path");
  }
  
  return normalizedRequest;
}
```

### Dateisystem-Berechtigungen prüfen

**Wichtig**: Die App respektiert die tatsächlichen Dateisystem-Berechtigungen der NAS.

```javascript
// Pseudocode
const fs = require('fs').promises;
const { access, constants } = require('fs');

async function checkFilePermissions(filePath, userId) {
  try {
    // Prüfe Lese-Berechtigung
    await fs.access(filePath, constants.R_OK);
    const canRead = true;
    
    // Prüfe Schreib-Berechtigung
    await fs.access(filePath, constants.W_OK);
    const canWrite = true;
    
    // Prüfe ob Datei/Ordner existiert
    const stats = await fs.stat(filePath);
    const exists = true;
    
    return {
      exists,
      canRead,
      canWrite,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (error) {
    if (error.code === 'EACCES') {
      // Keine Berechtigung
      return {
        exists: false,
        canRead: false,
        canWrite: false
      };
    }
    if (error.code === 'ENOENT') {
      // Datei existiert nicht
      return {
        exists: false,
        canRead: false,
        canWrite: false
      };
    }
    throw error;
  }
}
```

### Ordnerstruktur auflisten mit Berechtigungsfilterung

```javascript
// Pseudocode
async function listDirectory(userId, dirPath = '/', folderType) {
  const validatedPath = await validateAndResolvePath(userId, dirPath, folderType);
  
  // Prüfe ob Ordner existiert und lesbar ist
  const permissions = await checkFilePermissions(validatedPath, userId);
  if (!permissions.exists || !permissions.canRead) {
    throw new NotFoundError("Directory not found or not accessible");
  }
  
  if (!permissions.isDirectory) {
    throw new Error("Path is not a directory");
  }
  
  // Versuche Ordner zu lesen
  let items;
  try {
    items = await fs.readdir(validatedPath);
  } catch (error) {
    if (error.code === 'EACCES') {
      // Keine Berechtigung - gebe leeres Array zurück
      return [];
    }
    throw error;
  }
  
  // Filtere und mappe Items mit Berechtigungsprüfung
  const itemsWithPermissions = await Promise.all(
    items
      .filter(item => !item.startsWith('.') || item === '.notenest')
      .map(async (item) => {
        const itemPath = path.join(validatedPath, item);
        
        try {
          const itemStats = await fs.stat(itemPath);
          const itemPermissions = await checkFilePermissions(itemPath, userId);
          
          return {
            name: item,
            type: itemStats.isDirectory() ? 'folder' : 'file',
            size: itemStats.isFile() ? itemStats.size : null,
            modified: itemStats.mtime,
            path: path.relative(validatedPath, itemPath),
            canRead: itemPermissions.canRead,
            canWrite: itemPermissions.canWrite,
            canDelete: itemPermissions.canWrite // Kann schreiben = kann löschen
          };
        } catch (error) {
          // Wenn keine Berechtigung, überspringe Item
          if (error.code === 'EACCES' || error.code === 'ENOENT') {
            return null;
          }
          throw error;
        }
      })
  );
  
  // Filtere null-Werte (Items ohne Berechtigung)
  const filteredItems = itemsWithPermissions.filter(item => item !== null);
  
  // Sortiere: Ordner zuerst, dann alphabetisch
  return filteredItems.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
```

### Kombinierte Ansicht: Private + Geteilte Ordner

**Frontend-Logik**: Die App zeigt beide Ordner-Typen in einer kombinierten Ansicht.

```javascript
// Pseudocode: Frontend
async function loadAllFolders(userId) {
  const [privateItems, sharedItems] = await Promise.all([
    api.listDirectory(userId, '/', 'private').catch(() => []),
    api.listDirectory(userId, '/', 'shared').catch(() => [])
  ]);
  
  return {
    private: {
      path: '/',
      type: 'private',
      items: privateItems
    },
    shared: {
      path: '/',
      type: 'shared',
      items: sharedItems
    }
  };
}
```

### UI-Darstellung

**Sidebar-Struktur:**
```
📁 Meine Notizen (Privat)
  ├── folder1/
  │   ├── note1.md          (bearbeitbar)
  │   ├── document.pdf       (ausgegraut, nicht bearbeitbar)
  │   └── image.jpg          (ausgegraut, nicht bearbeitbar)
  └── note2.md              (bearbeitbar)

👥 Geteilte Notizen
  ├── team-notes/
  │   └── meeting.md         (bearbeitbar)
  └── documentation.md       (bearbeitbar)
```

**Dateityp-Icons:**
- 📄 `.md`, `.txt` - Bearbeitbar (normale Farbe)
- 📄 `.pdf`, `.doc`, `.docx` - Ausgegraut (read-only)
- 🖼️ `.jpg`, `.png`, `.gif` - Ausgegraut (read-only)
- 📁 Ordner - Normale Darstellung

**Visuelle Unterscheidung:**
- **Privat**: Normales Ordner-Icon 📁
- **Geteilt**: Ordner-Icon mit "Personen"-Symbol 👥
- **Nur-Lese**: Grau ausgegraut, Schreib-Icons deaktiviert
- **Bearbeitbare Dateien** (`.md`, `.txt`): Normale Darstellung, klickbar für Editor
- **Nicht bearbeitbare Dateien** (`.pdf`, `.docx`, `.jpg`, etc.): Ausgegraut, aber sichtbar

### Unterstützung bereits vorhandener Dateien

**Konzept:**
- Alle Dateien im konfigurierten Ordner werden angezeigt
- Bereits vorhandene `.md` und `.txt` Dateien können direkt in der App bearbeitet werden
- Andere Dateitypen werden ausgegraut angezeigt (read-only)
- Dateien können umbenannt, verschoben und gelöscht werden (wenn Berechtigung vorhanden)

**Dateityp-Klassifizierung:**

**Bearbeitbar (im Editor):**
- `.md` (Markdown)
- `.txt` (Plain Text)

**Anzeigbar, aber nicht bearbeitbar:**
- `.pdf` (PDF-Dokumente)
- `.doc`, `.docx` (Word-Dokumente)
- `.odt` (OpenDocument Text)
- `.rtf` (Rich Text Format)

**Bilder (nur Anzeige):**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`

**Andere Dateitypen:**
- Alle anderen Dateitypen werden ebenfalls angezeigt (ausgegraut)
- Können umbenannt, verschoben, gelöscht werden
- Keine Bearbeitung im Editor möglich

**UI-Verhalten:**

**Bearbeitbare Dateien:**
- Normale Farbe und Darstellung
- Klickbar: Öffnet im Editor
- Kontext-Menü: Bearbeiten, Umbenennen, Verschieben, Löschen, Export

**Nicht bearbeitbare Dateien:**
- Ausgegraut (Opacity: 0.5-0.6)
- Nicht klickbar für Editor
- Kontext-Menü: Umbenennen, Verschieben, Löschen, Download (wenn unterstützt)
- Tooltip: "Diese Datei kann nicht im Editor bearbeitet werden"

**Frontend-Implementierung:**

```typescript
// Pseudocode: React Component
function FileItem({ file }) {
  const isEditable = file.isEditable; // true für .md und .txt
  const isDisabled = !isEditable;
  
  return (
    <div 
      className={`file-item ${isDisabled ? 'disabled' : ''}`}
      onClick={() => {
        if (isEditable) {
          openEditor(file.path);
        } else {
          showTooltip("Diese Datei kann nicht im Editor bearbeitet werden");
        }
      }}
    >
      <FileIcon type={file.fileType.type} />
      <span className={isDisabled ? 'text-muted' : ''}>
        {file.name}
      </span>
      {isDisabled && (
        <span className="badge">Read-only</span>
      )}
    </div>
  );
}
```

**CSS-Styling:**

```css
.file-item {
  padding: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.file-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-item.disabled:hover {
  background-color: transparent;
}

.file-item.disabled .text-muted {
  color: #999;
}
```

### Verschieben zwischen privaten und geteilten Ordnern

```javascript
// Pseudocode
async function moveFile(userId, fromPath, fromType, toPath, toType) {
  // 1. Validierung: Quell-Pfad
  const validatedFromPath = await validateAndResolvePath(userId, fromPath, fromType);
  
  // 2. Validierung: Ziel-Pfad
  const validatedToPath = await validateAndResolvePath(userId, toPath, toType);
  
  // 3. Prüfe Schreib-Berechtigung am Ziel
  const targetDir = path.dirname(validatedToPath);
  const targetPermissions = await checkFilePermissions(targetDir, userId);
  if (!targetPermissions.canWrite) {
    throw new Error("No write permission at target location");
  }
  
  // 4. Verschiebe Datei
  await fs.rename(validatedFromPath, validatedToPath);
  
  return {
    success: true,
    from: fromPath,
    to: toPath,
    fromType,
    toType
  };
}
```

### Einstellungen: Basisordner konfigurieren

**UI-Flow:**
1. Benutzer öffnet Einstellungen
2. Kann zwei Pfade konfigurieren:
   - **Privater Ordner**: z.B. `/homes/user1` oder `/volume1/users/user1`
   - **Geteilter Ordner**: z.B. `/volume1/shared/notes` oder `/volume1/public/notes`
3. App prüft beim Speichern:
   - Existiert der Ordner?
   - Hat der Benutzer Lese-Berechtigung?
   - (Optional) Hat der Benutzer Schreib-Berechtigung?

**Validierung beim Speichern:**
```javascript
// Pseudocode
async function validateFolderPath(userId, folderPath, folderType) {
  try {
    // Prüfe ob Ordner existiert
    const stats = await fs.stat(folderPath);
    if (!stats.isDirectory()) {
      throw new Error("Path is not a directory");
    }
    
    // Prüfe Lese-Berechtigung
    await fs.access(folderPath, constants.R_OK);
    
    // Prüfe Schreib-Berechtigung (optional, aber empfohlen)
    try {
      await fs.access(folderPath, constants.W_OK);
      return {
        valid: true,
        canRead: true,
        canWrite: true
      };
    } catch {
      return {
        valid: true,
        canRead: true,
        canWrite: false,
        warning: "Folder is read-only"
      };
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error("Folder does not exist");
    }
    if (error.code === 'EACCES') {
      throw new Error("No permission to access folder");
    }
    throw error;
  }
}
```

### Vorteile dieses Ansatzes

1. **Automatische Filterung**: NAS-Berechtigungen werden respektiert
2. **Flexibilität**: Benutzer kann beliebige Ordner auf NAS konfigurieren
3. **Sicherheit**: App kann nur auf Ordner zugreifen, für die Berechtigung besteht
4. **Einfachheit**: Keine komplexe Berechtigungsverwaltung in der App nötig
5. **Kompatibilität**: Funktioniert mit jeder NAS, die Standard-Dateisystem-Berechtigungen unterstützt

### Herausforderungen & Lösungen

**Herausforderung 1**: Wie erkennt die App, welche Ordner geteilt sind?

**Lösung**: 
- Benutzer konfiguriert explizit einen "geteilten Ordner"
- App zeigt nur Ordner an, auf die der Benutzer Zugriff hat (durch Dateisystem-Berechtigungen)
- Wenn mehrere Benutzer denselben Ordner konfigurieren, sehen sie denselben Inhalt

**Herausforderung 2**: Was passiert, wenn ein Benutzer keine Berechtigung mehr hat?

**Lösung**:
- App zeigt Ordner/Dateien nicht an (werden bei `listDirectory` gefiltert)
- Beim Versuch, auf eine Datei zuzugreifen: Fehlermeldung "Keine Berechtigung"
- Einstellungen zeigen Warnung, wenn konfigurierter Ordner nicht mehr zugänglich ist

**Herausforderung 3**: Performance bei vielen Benutzern im geteilten Ordner?

**Lösung**:
- Caching von Ordner-Listen (5 Minuten TTL)
- Lazy Loading: Ordner-Inhalt wird erst geladen, wenn geöffnet
- Indexierung optional für schnelle Suche

---

## 📖 Bibelstellen-Referenzen

### Übersicht

NoteNest erkennt automatisch Bibelstellen in Notizen (z.B. "Psalm 23,3", "1. Mose 1:1") und bietet Funktionen zur Anzeige und Verlinkung der Bibeltexte.

### Funktionalität

**Kernfeatures:**
- Automatische Erkennung von Bibelstellen in Markdown-Text
- Hover-Tooltip mit Bibeltext
- Klick öffnet Popup mit vollständigem Vers/Kapitel
- Unterstützung für Versbereiche (z.B. "Psalm 23,1-6")
- Mehrere Übersetzungen parallel anzeigbar
- Offline-Funktionalität durch lokale Public-Domain-Übersetzungen

### Hybrid-Ansatz: Lokale + API

**Strategie:**
1. **Lokale Basis (Public Domain)**: Immer verfügbar, offline
   - Lutherbibel 1912
   - Elberfelder Bibel 1905
2. **API.Bible (YouVersion)**: Moderne Übersetzungen
   - Lutherbibel 2017
   - Elberfelder 2006
   - BasisBibel
   - Neue Genfer Übersetzung
   - Hoffnung für Alle
3. **Bible SuperSearch API**: Fallback für ältere Übersetzungen

### Datenmodell

#### Tabelle: `bible_verses` (Lokale Public-Domain-Übersetzungen)
```sql
- id: INTEGER PRIMARY KEY
- translation: VARCHAR(20)  # 'LUT1912', 'ELB1905'
- book: VARCHAR(50)          # 'Ps', 'Genesis', etc.
- chapter: INTEGER
- verse: INTEGER
- text: TEXT
- created_at: TIMESTAMP

INDEX idx_lookup (translation, book, chapter, verse)
```

#### Tabelle: `bible_cache` (API-Ergebnisse)
```sql
- id: INTEGER PRIMARY KEY
- reference: VARCHAR(50)     # 'PSA.23.3', 'GEN.1.1'
- translation: VARCHAR(20)    # 'LUT', 'ELB', etc.
- text: TEXT
- expires_at: TIMESTAMP       # Cache-Ablauf (1 Stunde)
- created_at: TIMESTAMP

INDEX idx_cache (reference, translation)
UNIQUE (reference, translation)
```

### Bibelstellen-Erkennung

**Regex-Patterns für verschiedene Formate:**

```javascript
// Pseudocode
const bibleReferencePatterns = [
  // Format: "Psalm 23,3" oder "Ps 23,3"
  /(?:1\.?\s*)?(?:Samuel|Könige|Chronik|Mose|Korinther|Thessalonicher|Timotheus|Petrus|Johannes)\s+\d+[,\:]\d+/gi,
  
  // Format: "Psalm 23:3" oder "Ps 23:3"
  /(?:Psalm|Ps|Psalmen)\s+\d+[,\:]\d+/gi,
  
  // Format: "1. Mose 1:1"
  /\d+\.\s*Mose\s+\d+[,\:]\d+/gi,
  
  // Format: "Johannes 3,16"
  /(?:Matthäus|Markus|Lukas|Johannes|Apostelgeschichte|Römer|Galater|Epheser|Philipper|Kolosser|Jakobus|Hebräer|Offenbarung)\s+\d+[,\:]\d+/gi,
  
  // Versbereiche: "Psalm 23,1-6"
  /(?:Psalm|Ps)\s+\d+[,\:]\d+-\d+/gi,
  
  // Kapitel: "Psalm 23"
  /(?:Psalm|Ps)\s+\d+/gi
];
```

**Implementierung:**
```javascript
// Pseudocode
function findBibleReferences(text) {
  const references = [];
  
  for (const pattern of bibleReferencePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const reference = parseBibleReference(match[0]);
      if (reference) {
        references.push({
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          book: reference.book,
          chapter: reference.chapter,
          verse: reference.verse,
          verseEnd: reference.verseEnd // Für Bereiche
        });
      }
    }
  }
  
  return references;
}

function parseBibleReference(text) {
  // Normalisiere verschiedene Formate zu Standard-Format
  // "Psalm 23,3" -> { book: "PSA", chapter: 23, verse: 3 }
  // "1. Mose 1:1" -> { book: "GEN", chapter: 1, verse: 1 }
  // ...
}
```

### API-Integration

#### API.Bible (YouVersion) - Primäre Quelle

**Konfiguration:**
```env
BIBLE_API_ENABLED=true
BIBLE_API_KEY=your-api-key-here
BIBLE_API_URL=https://api.bible/v1
BIBLE_API_CACHE_TTL=3600  # 1 Stunde
```

**Übersetzungs-Mapping:**
```javascript
const translationMapping = {
  'LUT': 'de4e12af7f28f599-02',  // Lutherbibel 2017
  'ELB': 'de4e12af7f28f599-03',  // Elberfelder 2006
  'BasisBibel': 'de4e12af7f28f599-04',
  'NGÜ': 'de4e12af7f28f599-05',  // Neue Genfer Übersetzung
  'HFA': 'de4e12af7f28f599-06'   // Hoffnung für Alle
};
```

**API-Request:**
```javascript
// Pseudocode
async function getBibleVerseFromAPI(reference, translation) {
  const bibleId = translationMapping[translation];
  if (!bibleId) {
    throw new Error(`Translation ${translation} not available via API`);
  }
  
  // Konvertiere Referenz zu API-Format
  // "Psalm 23,3" -> "PSA.23.3"
  const apiReference = convertToAPIFormat(reference);
  
  const response = await fetch(
    `${process.env.BIBLE_API_URL}/bibles/${bibleId}/verses/${apiReference}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.BIBLE_API_KEY}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data.content;
}
```

**Rate Limits:**
- Free Tier: ~1.000 Requests/Tag
- Caching erforderlich, um Limits nicht zu überschreiten

#### Bible SuperSearch API - Fallback

**Konfiguration:**
```env
BIBLE_SUPERSEARCH_ENABLED=true
BIBLE_SUPERSEARCH_URL=https://api.biblesupersearch.com/api
```

**Verfügbare Übersetzungen:**
- `elberfelder_1905` (Elberfelder 1905)
- `luther_1912` (Lutherbibel 1912)
- `luther_1545` (Lutherbibel 1545)
- `schlachter_1951` (Schlachter 1951)

**API-Request:**
```javascript
// Pseudocode
async function getBibleVerseFromSuperSearch(reference, translation) {
  const translationMap = {
    'ELB1905': 'elberfelder_1905',
    'LUT1912': 'luther_1912'
  };
  
  const apiTranslation = translationMap[translation];
  if (!apiTranslation) {
    throw new Error(`Translation ${translation} not available`);
  }
  
  // Konvertiere Referenz
  // "Psalm 23,3" -> { book: "psalm", chapter: 23, verse: 3 }
  const { book, chapter, verse } = parseReference(reference);
  
  const response = await fetch(
    `${process.env.BIBLE_SUPERSEARCH_URL}/bible/${apiTranslation}/${book}/${chapter}/${verse}`
  );
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.text;
}
```

### Hauptfunktion: Bibelvers abrufen

```javascript
// Pseudocode
async function getBibleVerse(reference, translation = 'LUT') {
  // 1. Prüfe Cache (API-Ergebnisse)
  const cacheKey = `${reference}-${translation}`;
  const cached = await db.bible_cache.findOne({
    reference: normalizeReference(reference),
    translation,
    expires_at: { $gt: new Date() }
  });
  
  if (cached) {
    return cached.text;
  }
  
  // 2. Prüfe lokale Public-Domain-Übersetzungen
  if (isPublicDomainTranslation(translation)) {
    const verse = await db.bible_verses.findOne({
      translation,
      book: getBookCode(reference),
      chapter: getChapter(reference),
      verse: getVerse(reference)
    });
    
    if (verse) {
      return verse.text;
    }
  }
  
  // 3. Versuche API.Bible (moderne Übersetzungen)
  if (isModernTranslation(translation)) {
    try {
      const text = await getBibleVerseFromAPI(reference, translation);
      
      // Cache Ergebnis
      await db.bible_cache.create({
        reference: normalizeReference(reference),
        translation,
        text,
        expires_at: new Date(Date.now() + 3600 * 1000) // 1 Stunde
      });
      
      return text;
    } catch (error) {
      console.warn(`API.Bible failed for ${reference}:`, error);
      // Fallback zu lokal, wenn verfügbar
    }
  }
  
  // 4. Fallback: Bible SuperSearch (Public Domain)
  if (isPublicDomainTranslation(translation)) {
    try {
      const text = await getBibleVerseFromSuperSearch(reference, translation);
      
      // Cache Ergebnis
      await db.bible_cache.create({
        reference: normalizeReference(reference),
        translation,
        text,
        expires_at: new Date(Date.now() + 3600 * 1000)
      });
      
      return text;
    } catch (error) {
      console.warn(`Bible SuperSearch failed for ${reference}:`, error);
    }
  }
  
  // 5. Finaler Fallback: Lokale Public-Domain (sollte immer verfügbar sein)
  const verse = await db.bible_verses.findOne({
    translation: 'LUT1912', // Fallback zu Luther 1912
    book: getBookCode(reference),
    chapter: getChapter(reference),
    verse: getVerse(reference)
  });
  
  if (verse) {
    return verse.text;
  }
  
  throw new Error(`Bible verse not found: ${reference}`);
}
```

### API-Endpunkte

```
GET    /api/bible/verse
  Query: ?reference=Psalm+23,3&translation=LUT
  Response: { text: "...", reference: "Psalm 23,3", translation: "LUT" }

GET    /api/bible/chapter
  Query: ?book=Ps&chapter=23&translation=LUT
  Response: { verses: [...], book: "Ps", chapter: 23 }

GET    /api/bible/translations
  Response: { 
    local: ["LUT1912", "ELB1905"],
    api: ["LUT", "ELB", "BasisBibel", "NGÜ", "HFA"],
    favorites: ["LUT", "ELB"]  # Favoriten des Benutzers
  }

GET    /api/bible/favorites
  Response: { 
    favorites: [
      { translation: "LUT", displayName: "Lutherbibel 2017", order: 1 },
      { translation: "ELB", displayName: "Elberfelder 2006", order: 2 }
    ]
  }

POST   /api/bible/favorites
  Body: { translation: "LUT", order: 1 }
  Response: { success: true }

DELETE /api/bible/favorites/:translation
  Response: { success: true }

PUT    /api/bible/favorites/order
  Body: { favorites: [{ translation: "LUT", order: 1 }, { translation: "ELB", order: 2 }] }
  Response: { success: true }
```

### Frontend-Integration

**Markdown-Editor-Erweiterung:**
```typescript
// Pseudocode: React Component
function BibleReference({ reference, translation = 'LUT' }) {
  const [verse, setVerse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTranslation, setCurrentTranslation] = useState(translation);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  useEffect(() => {
    // Lade Favoriten
    api.getBibleFavorites().then(data => {
      setFavorites(data.favorites.map(f => f.translation));
    });
    
    // Lade Vers
    setLoading(true);
    api.getBibleVerse(reference, currentTranslation)
      .then(setVerse)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [reference, currentTranslation]);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    showBiblePopup({
      reference,
      verse,
      currentTranslation,
      favorites,
      onTranslationChange: setCurrentTranslation,
      onInsertToNote: (text: string) => insertTextToEditor(text)
    });
  };
  
  return (
    <span className="bible-reference">
      <a href="#" onClick={handleClick}>
        {reference}
      </a>
      {loading && <span className="loading">...</span>}
    </span>
  );
}
```

**Bibel-Popup-Komponente:**
```typescript
// Pseudocode: React Component
interface BiblePopupProps {
  reference: string;
  verse: string;
  currentTranslation: string;
  favorites: string[];
  onTranslationChange: (translation: string) => void;
  onInsertToNote: (text: string) => void;
}

function BiblePopup({ 
  reference, 
  verse, 
  currentTranslation, 
  favorites,
  onTranslationChange,
  onInsertToNote 
}: BiblePopupProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const [allTranslations, setAllTranslations] = useState<Translation[]>([]);
  
  useEffect(() => {
    // Lade alle verfügbaren Übersetzungen
    api.getBibleTranslations().then(data => {
      setAllTranslations([...data.local, ...data.api]);
    });
  }, []);
  
  const handleInsertToNote = (format: 'quote' | 'text' | 'markdown') => {
    let text = verse;
    
    if (format === 'quote') {
      text = `> ${verse}\n> — ${reference} (${currentTranslation})`;
    } else if (format === 'markdown') {
      text = `**${reference}** (${currentTranslation})\n\n${verse}`;
    }
    
    onInsertToNote(text);
  };
  
  return (
    <div className={`bible-popup ${expanded ? 'expanded' : ''}`}>
      <div className="bible-popup-header">
        <h3>{reference}</h3>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Verkleinern' : 'Erweitern'}
        </button>
      </div>
      
      <div className="bible-popup-content">
        <div className="bible-text" style={{ maxHeight: expanded ? '400px' : '150px', overflowY: 'auto' }}>
          {verse}
        </div>
        
        <div className="bible-popup-actions">
          <div className="translation-selector">
            <label>Übersetzung:</label>
            <select 
              value={currentTranslation} 
              onChange={(e) => onTranslationChange(e.target.value)}
            >
              {favorites.map(t => (
                <option key={t} value={t}>{getTranslationName(t)}</option>
              ))}
            </select>
            <button onClick={() => setShowAllTranslations(true)}>
              Alle Übersetzungen...
            </button>
          </div>
          
          <div className="insert-actions">
            <button onClick={() => handleInsertToNote('text')}>
              Text übernehmen
            </button>
            <button onClick={() => handleInsertToNote('quote')}>
              Als Zitat übernehmen
            </button>
            <button onClick={() => handleInsertToNote('markdown')}>
              Mit Markdown übernehmen
            </button>
          </div>
        </div>
      </div>
      
      {showAllTranslations && (
        <TranslationModal
          translations={allTranslations}
          current={currentTranslation}
          favorites={favorites}
          onSelect={(translation) => {
            onTranslationChange(translation);
            setShowAllTranslations(false);
          }}
          onClose={() => setShowAllTranslations(false)}
        />
      )}
    </div>
  );
}
```

**Markdown-Processing:**
```javascript
// Pseudocode: Markdown-zu-HTML mit Bibelstellen-Erkennung
function processMarkdown(markdown) {
  // 1. Finde alle Bibelstellen
  const references = findBibleReferences(markdown);
  
  // 2. Ersetze durch React-Komponenten oder HTML
  let processed = markdown;
  references.reverse().forEach(ref => {
    const component = `<BibleReference reference="${ref.text}" />`;
    processed = processed.substring(0, ref.start) + 
                component + 
                processed.substring(ref.end);
  });
  
  return processed;
}
```

### UI/UX-Features

**1. Hover-Tooltip:**
- Beim Hovern über Bibelstelle: Tooltip mit Vers-Text
- Format: "Psalm 23,3: Der HERR ist mein Hirte..."

**2. Klick-Popup (Erweitert):**
- Beim Klick/Tipp auf Bibelstellen-Referenz: Popup mit Bibelvers
- **Kompaktes Popup**: Zeigt Vers-Text, Übersetzung, Referenz
- **Erweitertes Popup**: Größeres Popup mit Scroll-Funktion für längere Texte/Versbereiche
- **Übersetzung wechseln**:
  - Schnellwechsel: Aus Favoriten-Liste wählen (Dropdown)
  - Alle Übersetzungen: Button öffnet Modal mit allen verfügbaren Übersetzungen
- **In Notiz übernehmen**: Button kopiert Bibelvers oder Versbereich in die Notiz
  - Option: Als Zitat-Format (mit Referenz)
  - Option: Nur Text
  - Option: Mit Markdown-Formatierung

**3. Favoriten-Verwaltung:**
- Benutzer kann mehrere Übersetzungen als Favoriten markieren
- Favoriten werden in Einstellungen verwaltet
- Reihenfolge der Favoriten ist konfigurierbar
- Favoriten erscheinen zuerst in Übersetzungs-Auswahl

**4. Einstellungen:**
- Standard-Übersetzung wählen (für neue Bibelstellen)
- Favoriten-Liste verwalten (hinzufügen, entfernen, Reihenfolge ändern)
- Verfügbare Übersetzungen anzeigen (lokal + API)
- Cache-Verwaltung

**4. Offline-Modus:**
- Lokale Public-Domain-Übersetzungen immer verfügbar
- API-Übersetzungen nur bei Internetverbindung
- Klare Kennzeichnung: "Offline verfügbar" vs. "Online erforderlich"

### Lokale Bibel-Datenbank

**Import-Prozess:**
1. Public-Domain-Übersetzungen als JSON/OSIS herunterladen
2. Konvertierung zu SQLite-Format
3. Import in `bible_verses` Tabelle

**Quellen für Public-Domain-Übersetzungen:**
- Bible SuperSearch: JSON-Downloads verfügbar
- Open-Source-Projekte: GitHub-Repositories
- OSIS-Format: Standard für Bibel-Daten

**Speicherbedarf:**
- Eine Übersetzung: ~5-10 MB
- Mehrere Übersetzungen: 20-50 MB (akzeptabel)

### Caching-Strategie

**Mehrstufiges Caching:**
1. **Memory-Cache** (Backend): Häufig genutzte Verse (5 Minuten TTL)
2. **Database-Cache** (bible_cache): API-Ergebnisse (1 Stunde TTL)
3. **Local Storage** (Frontend): Verse für aktuelle Session

**Cache-Invalidierung:**
- Automatisch nach TTL
- Manuell über Einstellungen
- Bei API-Fehlern: Cache länger behalten

### Fehlerbehandlung

**Fallback-Kette:**
1. Memory-Cache
2. Database-Cache
3. Lokale Public-Domain-Übersetzung
4. API.Bible
5. Bible SuperSearch API
6. Fehler: "Bibelstelle nicht gefunden"

**Fehlermeldungen:**
- "Bibelstelle nicht gefunden" → Vers existiert nicht
- "Übersetzung nicht verfügbar" → Übersetzung nicht unterstützt
- "API-Fehler" → Fallback zu lokaler Übersetzung

### Lizenzrechtliches

**Public-Domain-Übersetzungen:**
- Lutherbibel 1912: Public Domain
- Elberfelder 1905: Public Domain
- Keine Lizenzprobleme bei lokaler Speicherung

**Moderne Übersetzungen (API):**
- Nutzung über API.Bible gemäß API-Lizenz
- Keine lokale Speicherung ohne Erlaubnis
- Caching erlaubt (temporär, 1 Stunde)

**Empfehlung:**
- Lokale Speicherung nur für Public-Domain-Übersetzungen
- Moderne Übersetzungen nur über API
- Lizenzbedingungen der APIs beachten

### Performance-Optimierungen

1. **Lazy Loading**: Verse werden erst geladen, wenn benötigt
2. **Batch-Requests**: Mehrere Verse in einem Request (wenn API unterstützt)
3. **Prefetching**: Verse im sichtbaren Bereich vorladen
4. **Indexierung**: Datenbank-Indizes für schnelle Suche

### Zukünftige Erweiterungen (Optional)

#### 1. Vergleichsansicht
**Beschreibung**: Mehrere Übersetzungen nebeneinander anzeigen
**UI-Konzept**: Side-by-Side-Ansicht mit 2-3 Übersetzungen gleichzeitig
**Priorität**: Hoch (nützlich, relativ einfach umsetzbar)
**Beispiel**:
```
┌─────────────────────────────────────────┐
│ Psalm 23,1                             │
├─────────────────┬───────────────────────┤
│ Luther 1912     │ Elberfelder 1905      │
├─────────────────┼───────────────────────┤
│ Der HERR ist    │ Der HERR ist mein     │
│ mein Hirte...   │ Hirt...               │
└─────────────────┴───────────────────────┘
```

#### 2. Konkordanz (Wortsuche)
**Beschreibung**: Suche nach Wörtern in der Bibel
**Features**:
- Suche nach Begriffen (z.B. "Hirte") → alle Verse mit diesem Wort
- Kontext: Zeigt alle Fundstellen mit Vers-Referenzen
- Filter: Nach Buch, Kapitel, Übersetzung
**Priorität**: Mittel (nützlich, mehr Aufwand)
**Datenbank**: Neue Tabelle `bible_concordance` für Wort-Index

#### 3. Studien-Tools

##### a) Kommentare
- Kommentare zu einzelnen Versen anzeigen
- Verschiedene Kommentarwerke (z.B. Matthew Henry, Spurgeon)
- Integration externer Kommentar-APIs
**Priorität**: Niedrig (nice-to-have)

##### b) Querverweise
- Automatische Querverweise zu verwandten Versen
- "Siehe auch"-Links
- Themen-basierte Verknüpfungen
**Priorität**: Mittel (nützlich, mehr Aufwand)
**Datenbank**: Neue Tabelle `bible_cross_references`

##### c) Strong's Numbers
- Griechische/hebräische Wörter mit Strong's-Nummern
- Wörterbuch-Integration
- Etymologie und Wortstudien
**Priorität**: Niedrig (für fortgeschrittene Nutzer)

#### 4. Lesepläne
**Beschreibung**: Tägliche Bibellese-Integration
**Features**:
- Vordefinierte Lesepläne (z.B. "Bibel in einem Jahr")
- Fortschrittsanzeige
- Erinnerungen
- Integration in Notizen
**Priorität**: Niedrig (nice-to-have)
**Datenbank**: Neue Tabellen `reading_plans`, `reading_plan_progress`

#### 5. Notizen zu Versen
**Beschreibung**: Persönliche Notizen zu Bibelstellen
**Features**:
- Notizen direkt an Versen speichern
- Vers-spezifische Kommentare
- Verknüpfung mit Notizen
- Suche in Vers-Notizen
**Priorität**: Hoch (nützlich, relativ einfach umsetzbar)
**Datenbank**: Neue Tabelle `verse_notes`
**Beispiel**:
```
Psalm 23,1 [📝 Meine Notiz]
"Dieser Vers erinnert mich an..."
```

#### 6. Versbereiche erweitern
**Beschreibung**: Mehrere Verse gleichzeitig anzeigen
**Aktuell**: Einzelne Verse oder Kapitel
**Erweitert**:
- Mehrere Verse gleichzeitig (z.B. "Psalm 23,1-6")
- Mehrere Kapitel (z.B. "1. Mose 1-3")
- Parallele Stellen zusammenfassen
**Priorität**: Hoch (nützlich, relativ einfach umsetzbar)

#### 7. Vers-Highlighting
**Beschreibung**: Verse in verschiedenen Farben markieren
**Features**:
- Verse in verschiedenen Farben markieren
- Kategorien (z.B. "Gebet", "Verheißung", "Ermutigung")
- Filter nach Highlights
**Priorität**: Mittel (nützlich, mehr Aufwand)
**Datenbank**: Neue Tabelle `verse_highlights`

#### 8. Vers-Sharing
**Beschreibung**: Verse direkt teilen
**Features**:
- Verse direkt teilen
- Social-Media-Integration
- Export als Bild (Verse als Zitat-Bild)
**Priorität**: Niedrig (nice-to-have)

#### 9. Audio-Integration
**Beschreibung**: Bibelverse vorlesen lassen
**Features**:
- Text-to-Speech
- Integration mit Audio-Bibeln
**Priorität**: Niedrig (nice-to-have)

#### 10. Vers-Statistiken
**Beschreibung**: Nutzungsstatistiken für Bibelverse
**Features**:
- Häufigste zitierten Verse
- Meistgenutzte Übersetzungen
- Lese-Statistiken
**Priorität**: Niedrig (nice-to-have)
**Datenbank**: Neue Tabelle `verse_statistics`

---

## 📄 PDF-Export

### Technologie: Puppeteer

**Warum Puppeteer?**
- Exzellente Markdown-zu-HTML-Rendering (über markdown-it)
- CSS-basierte Styling (wie Web)
- Unterstützt A4/A5-Formate perfekt
- Professionelle Typografie möglich

### Implementierungs-Strategie

#### 1. Markdown zu HTML konvertieren

```javascript
// Pseudocode
const markdownIt = require('markdown-it');
const md = new markdownIt({
  html: true,
  linkify: true,
  typographer: true
});

function markdownToHTML(markdown) {
  return md.render(markdown);
}
```

#### 2. HTML mit CSS stylen

**CSS-Template für PDF:**
```css
@page {
  size: A4; /* oder A5 */
  margin: 2cm;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #000;
}

h1 { font-size: 24pt; margin-top: 1em; margin-bottom: 0.5em; }
h2 { font-size: 20pt; margin-top: 0.8em; margin-bottom: 0.4em; }
h3 { font-size: 16pt; margin-top: 0.6em; margin-bottom: 0.3em; }

code {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

pre {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
}

blockquote {
  border-left: 4px solid #007AFF;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
}
```

#### 3. Puppeteer PDF-Generierung

```javascript
// Pseudocode
const puppeteer = require('puppeteer');

async function generatePDF(markdown, options = {}) {
  const { size = 'A4', filename } = options;
  
  // 1. Markdown zu HTML
  const html = markdownToHTML(markdown);
  
  // 2. Vollständiges HTML-Dokument erstellen
  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${cssTemplate}</style>
    </head>
    <body>${html}</body>
    </html>
  `;
  
  // 3. Puppeteer Browser starten
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Für Docker
  });
  
  const page = await browser.newPage();
  
  // 4. HTML laden
  await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
  
  // 5. PDF generieren
  const pdf = await page.pdf({
    format: size, // 'A4' oder 'A5'
    printBackground: true,
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    }
  });
  
  await browser.close();
  
  return pdf;
}
```

#### 4. API-Endpoint

```javascript
// Pseudocode
app.post('/api/export/pdf', authenticate, async (req, res) => {
  const { path: filePath, size = 'A4' } = req.body;
  const userId = req.user.id;
  
  try {
    // 1. Datei lesen (mit Pfadvalidierung)
    const markdown = await readFile(userId, filePath);
    
    // 2. PDF generieren
    const pdfBuffer = await generatePDF(markdown, { size });
    
    // 3. Response senden
    const filename = path.basename(filePath, '.md') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Performance-Optimierungen

1. **Caching**: Generierte PDFs kurz cachen (5 Minuten)
2. **Queue**: Für viele Requests: PDF-Generierung in Queue (Bull/BullMQ)
3. **Timeout**: Max. 30 Sekunden für PDF-Generierung
4. **Resource-Limits**: Puppeteer Memory-Limit setzen

---

## 💻 Code-Qualität & Best Practices

### Sicherheits- und Versionskontrolle

#### .gitignore Konfiguration

**Kritische Dateien, die NIEMALS committet werden dürfen:**

```gitignore
# Umgebungsvariablen und Secrets
.env
.env.local
.env.*.local
.env.production
.env.development

# API-Keys und Credentials
*.key
*.pem
*.cert
*.crt
secrets/
credentials/

# Docker-Compose mit Secrets
docker-compose.override.yml
docker-compose.prod.yml

# Datenbank-Dateien
*.db
*.sqlite
*.sqlite3
data/database/

# Logs
logs/
*.log
npm-debug.log*

# Node-Module
node_modules/
npm-debug.log
yarn-error.log

# Build-Artefakte
dist/
build/
*.tsbuildinfo

# IDE-spezifische Dateien
.vscode/
.idea/
*.swp
*.swo
*~

# OS-spezifische Dateien
.DS_Store
Thumbs.db

# Temporäre Dateien
tmp/
temp/
*.tmp
```

**Wichtig**: `.gitignore` muss vor dem ersten Commit korrekt konfiguriert sein.

#### Sichere Verwaltung sensibler Daten

**Prinzip: Keine Secrets in Code oder Konfigurationsdateien**

**1. Umgebungsvariablen (.env)**

```env
# .env.example (Wird committet, als Template)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
BIBLE_API_KEY=your-api-bible-key-here
LDAP_BIND_PASSWORD=admin-password
```

```env
# .env (NIEMALS committet, nur lokal)
JWT_SECRET=actual-secret-key-generated-with-openssl
JWT_REFRESH_SECRET=actual-refresh-secret-key
BIBLE_API_KEY=actual-api-key-from-registration
LDAP_BIND_PASSWORD=actual-ldap-password
```

**2. docker-compose.yml (Keine Secrets)**

```yaml
# ❌ FALSCH: Secrets direkt im docker-compose.yml
services:
  notenest:
    environment:
      - JWT_SECRET=my-secret-key  # ❌ NIEMALS!

# ✅ RICHTIG: Secrets über Umgebungsvariablen
services:
  notenest:
    env_file:
      - .env  # Wird aus .env geladen (nicht committet)
    environment:
      - NODE_ENV=production
      - PORT=3000
      # Keine Secrets hier!
```

**3. Sichere Secret-Generierung**

```bash
# JWT-Secrets generieren
openssl rand -base64 32

# Für Production: Stärkere Secrets
openssl rand -hex 64
```

**4. Secret-Management für Production**

**Option A: Docker Secrets (für Docker Swarm)**
```yaml
secrets:
  jwt_secret:
    external: true

services:
  notenest:
    secrets:
      - jwt_secret
```

**Option B: Externe Secret-Manager**
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Kubernetes Secrets

**5. Code-Review Checkliste**

Vor jedem Commit prüfen:
- [ ] Keine API-Keys im Code
- [ ] Keine Passwörter in Konfigurationsdateien
- [ ] `.env` Datei in `.gitignore`
- [ ] `docker-compose.yml` enthält keine Secrets
- [ ] `.env.example` vorhanden (als Template)
- [ ] Sensible Daten nur über Umgebungsvariablen

### Code-Struktur und Lesbarkeit

#### Datei- und Ordnerstruktur

**Backend-Struktur:**
```
backend/
├── src/
│   ├── config/              # Konfiguration
│   │   ├── database.ts
│   │   ├── environment.ts
│   │   └── constants.ts
│   ├── routes/              # API-Routen
│   │   ├── auth.routes.ts
│   │   ├── files.routes.ts
│   │   └── bible.routes.ts
│   ├── controllers/         # Request-Handler
│   │   ├── auth.controller.ts
│   │   ├── files.controller.ts
│   │   └── bible.controller.ts
│   ├── services/            # Business-Logik
│   │   ├── auth.service.ts
│   │   ├── file.service.ts
│   │   ├── path-validation.service.ts
│   │   └── bible.service.ts
│   ├── middleware/          # Express-Middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── models/             # Datenbank-Models
│   │   ├── user.model.ts
│   │   └── file-metadata.model.ts
│   ├── utils/              # Helper-Funktionen
│   │   ├── path.utils.ts
│   │   ├── file-type.utils.ts
│   │   └── bible-reference.utils.ts
│   └── types/              # TypeScript-Typen
│       ├── user.types.ts
│       └── file.types.ts
├── tests/                  # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

**Frontend-Struktur:**
```
frontend/
├── src/
│   ├── components/         # React-Komponenten
│   │   ├── Layout/
│   │   ├── Editor/
│   │   ├── FileManager/
│   │   └── Auth/
│   ├── pages/              # Seiten-Komponenten
│   ├── hooks/              # Custom Hooks
│   ├── services/           # API-Clients
│   ├── store/              # State Management
│   ├── utils/              # Helper-Funktionen
│   └── types/              # TypeScript-Typen
├── public/
└── package.json
```

#### Code-Kommentierung

**Prinzipien:**
1. **Warum, nicht Was**: Kommentare erklären das "Warum", nicht das "Was"
2. **JSDoc für Funktionen**: Alle öffentlichen Funktionen dokumentieren
3. **Komplexe Logik**: Ungewöhnliche oder komplexe Stellen kommentieren
4. **TODO-Kommentare**: Für zukünftige Verbesserungen

**Beispiel: Gute Kommentierung**

```typescript
/**
 * Validiert und normalisiert einen Dateipfad für einen Benutzer.
 * 
 * Verhindert Path-Traversal-Angriffe durch:
 * 1. Normalisierung des Pfades
 * 2. Prüfung, ob Pfad innerhalb des Benutzer-Basisordners liegt
 * 3. Validierung gefährlicher Zeichen
 * 
 * @param userId - ID des Benutzers
 * @param requestedPath - Angeforderter Pfad (relativ oder absolut)
 * @param folderType - Typ des Ordners ('private' | 'shared')
 * @returns Normalisierter, validierter absoluter Pfad
 * @throws SecurityError - Wenn Path-Traversal erkannt wird
 * @throws NotFoundError - Wenn Basisordner nicht konfiguriert
 */
async function validateAndResolvePath(
  userId: number,
  requestedPath: string,
  folderType: 'private' | 'shared'
): Promise<string> {
  // 1. Hole Benutzer-Einstellungen aus Datenbank
  const settings = await db.settings.findOne({ userId });
  
  if (!settings) {
    throw new NotFoundError("User settings not found");
  }
  
  // 2. Wähle Basisordner basierend auf Typ
  // Warum: Benutzer kann private und geteilte Ordner haben
  const basePath = folderType === 'private' 
    ? settings.private_folder_path 
    : settings.shared_folder_path;
  
  if (!basePath) {
    throw new NotFoundError(`${folderType} folder not configured`);
  }
  
  // 3. Normalisiere Pfade (entfernt '..' und relative Pfade)
  // Warum: Verhindert Path-Traversal-Angriffe
  const normalizedBase = path.resolve(basePath);
  const normalizedRequest = path.resolve(basePath, requestedPath);
  
  // 4. Sicherheitsprüfung: Pfad muss innerhalb von Base-Pfad sein
  // Warum: Verhindert Zugriff auf fremde Ordner
  if (!normalizedRequest.startsWith(normalizedBase + path.sep) && 
      normalizedRequest !== normalizedBase) {
    throw new SecurityError("Path traversal attempt detected");
  }
  
  return normalizedRequest;
}
```

**Beispiel: Schlechte Kommentierung**

```typescript
// ❌ SCHLECHT: Kommentiert das Offensichtliche
function add(a: number, b: number): number {
  // Addiere a und b
  return a + b;
}

// ✅ BESSER: Kein Kommentar nötig, Code ist selbsterklärend
function add(a: number, b: number): number {
  return a + b;
}
```

#### Überschriften und Strukturierung

**Datei-Struktur mit klaren Abschnitten:**

```typescript
// ============================================================================
// IMPORTS
// ============================================================================
import { Request, Response, NextFunction } from 'express';
import { validateAndResolvePath } from '../services/path-validation.service';
import { readFile } from '../services/file.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface FileContentRequest extends Request {
  query: {
    path: string;
    type: 'private' | 'shared';
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

/**
 * Lädt den Inhalt einer Datei
 */
export async function getFileContent(
  req: FileContentRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Implementation...
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Prüft, ob eine Datei bearbeitbar ist
 */
function isFileEditable(filePath: string): boolean {
  // Implementation...
}
```

### Funktionale Modularität

#### Single-Responsibility-Prinzip (SRP)

**Prinzip**: Jede Funktion/Klasse hat genau eine Verantwortlichkeit.

**Beispiel: Schlechte Funktion (zu viele Verantwortlichkeiten)**

```typescript
// ❌ SCHLECHT: Zu viele Verantwortlichkeiten
async function processFile(userId: number, filePath: string) {
  // 1. Validierung
  const validatedPath = await validatePath(userId, filePath);
  
  // 2. Datei lesen
  const content = await fs.readFile(validatedPath, 'utf-8');
  
  // 3. Markdown parsen
  const parsed = markdown.parse(content);
  
  // 4. Bibelstellen finden
  const references = findBibleReferences(parsed);
  
  // 5. Bibelverse laden
  const verses = await Promise.all(
    references.map(ref => loadBibleVerse(ref))
  );
  
  // 6. HTML generieren
  const html = generateHTML(parsed, verses);
  
  // 7. Cache speichern
  await cache.set(filePath, html);
  
  return html;
}
```

**Beispiel: Gute Funktionen (Single-Responsibility)**

```typescript
// ✅ GUT: Jede Funktion hat eine klare Verantwortlichkeit

/**
 * Validiert einen Dateipfad für einen Benutzer
 */
async function validateFilePath(
  userId: number, 
  filePath: string
): Promise<string> {
  return await validateAndResolvePath(userId, filePath, 'private');
}

/**
 * Lädt den Inhalt einer Datei
 */
async function loadFileContent(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Findet alle Bibelstellen in einem Markdown-Text
 */
function findBibleReferences(markdown: string): BibleReference[] {
  return bibleReferenceUtils.findReferences(markdown);
}

/**
 * Lädt Bibelverse für eine Liste von Referenzen
 */
async function loadBibleVerses(
  references: BibleReference[]
): Promise<BibleVerse[]> {
  return await Promise.all(
    references.map(ref => bibleService.getVerse(ref))
  );
}

/**
 * Generiert HTML aus Markdown mit eingebetteten Bibelversen
 */
function generateHTMLWithVerses(
  markdown: string,
  verses: Map<string, string>
): string {
  return markdownRenderer.render(markdown, verses);
}

/**
 * Hauptfunktion: Verarbeitet eine Datei
 */
async function processFile(userId: number, filePath: string): Promise<string> {
  // 1. Validierung
  const validatedPath = await validateFilePath(userId, filePath);
  
  // 2. Datei laden
  const content = await loadFileContent(validatedPath);
  
  // 3. Bibelstellen finden
  const references = findBibleReferences(content);
  
  // 4. Bibelverse laden
  const verses = await loadBibleVerses(references);
  const versesMap = new Map(verses.map(v => [v.reference, v.text]));
  
  // 5. HTML generieren
  const html = generateHTMLWithVerses(content, versesMap);
  
  // 6. Cache speichern
  await cacheService.set(validatedPath, html);
  
  return html;
}
```

#### Funktionale Größe

**Richtlinien:**
- **Maximale Funktionenlänge**: 50-100 Zeilen (idealerweise < 50)
- **Wenn Funktion zu lang**: In kleinere Funktionen aufteilen
- **Komplexe Logik**: In separate Funktionen extrahieren

**Beispiel: Funktion aufteilen**

```typescript
// ❌ SCHLECHT: Zu lange Funktion
async function handleFileUpload(req: Request, res: Response) {
  // 100+ Zeilen Code...
  // Validierung
  // Datei-Upload
  // Verarbeitung
  // Speicherung
  // Response
}

// ✅ BESSER: Aufgeteilt in kleinere Funktionen
async function handleFileUpload(req: Request, res: Response) {
  try {
    const file = await validateFileUpload(req);
    const processedFile = await processUploadedFile(file);
    const savedFile = await saveFile(processedFile);
    res.json({ success: true, file: savedFile });
  } catch (error) {
    handleUploadError(error, res);
  }
}

async function validateFileUpload(req: Request): Promise<UploadedFile> {
  // Validierungslogik (20-30 Zeilen)
}

async function processUploadedFile(file: UploadedFile): Promise<ProcessedFile> {
  // Verarbeitungslogik (20-30 Zeilen)
}

async function saveFile(file: ProcessedFile): Promise<SavedFile> {
  // Speicherungslogik (20-30 Zeilen)
}
```

#### Wiederverwendbarkeit

**Prinzipien:**
1. **DRY (Don't Repeat Yourself)**: Code-Duplikation vermeiden
2. **Generische Funktionen**: Funktionen sollten für verschiedene Szenarien nutzbar sein
3. **Utility-Funktionen**: Häufig genutzte Logik in Utils auslagern

**Beispiel: Wiederverwendbare Funktionen**

```typescript
// ✅ GUT: Generische, wiederverwendbare Funktion
/**
 * Prüft Dateisystem-Berechtigungen für einen Pfad
 */
async function checkFilePermissions(
  filePath: string,
  userId: number
): Promise<FilePermissions> {
  try {
    await fs.access(filePath, constants.R_OK);
    const canRead = true;
    
    try {
      await fs.access(filePath, constants.W_OK);
      const canWrite = true;
    } catch {
      const canWrite = false;
    }
    
    return { canRead, canWrite };
  } catch (error) {
    if (error.code === 'EACCES') {
      return { canRead: false, canWrite: false };
    }
    throw error;
  }
}

// Wiederverwendbar für:
// - Datei-Lesen
// - Datei-Schreiben
// - Ordner-Auflisten
// - Datei-Löschen
```

#### Testbarkeit

**Prinzipien:**
1. **Pure Functions**: Funktionen ohne Seiteneffekte bevorzugen
2. **Dependency Injection**: Abhängigkeiten von außen übergeben
3. **Mocking-freundlich**: Funktionen sollten leicht mockbar sein

**Beispiel: Testbare Funktion**

```typescript
// ✅ GUT: Testbar durch Dependency Injection
class FileService {
  constructor(
    private fileSystem: FileSystem,
    private pathValidator: PathValidator,
    private logger: Logger
  ) {}
  
  async readFile(userId: number, filePath: string): Promise<string> {
    const validatedPath = await this.pathValidator.validate(userId, filePath);
    const content = await this.fileSystem.readFile(validatedPath);
    this.logger.info(`File read: ${filePath} by user ${userId}`);
    return content;
  }
}

// Testbar durch Mocking:
const mockFileSystem = { readFile: jest.fn() };
const mockPathValidator = { validate: jest.fn() };
const mockLogger = { info: jest.fn() };

const service = new FileService(mockFileSystem, mockPathValidator, mockLogger);
```

### Code-Review Checkliste

**Vor jedem Merge Request:**

**Sicherheit:**
- [ ] Keine Secrets im Code
- [ ] `.env` in `.gitignore`
- [ ] `docker-compose.yml` enthält keine Secrets
- [ ] Pfadvalidierung implementiert
- [ ] Input-Validierung vorhanden

**Code-Qualität:**
- [ ] Funktionen folgen SRP (Single-Responsibility-Prinzip)
- [ ] Funktionen sind < 100 Zeilen (idealerweise < 50)
- [ ] Code ist selbsterklärend (wenig Kommentare nötig)
- [ ] Komplexe Logik ist kommentiert
- [ ] JSDoc für öffentliche Funktionen

**Struktur:**
- [ ] Klare Datei- und Ordnerstruktur
- [ ] Logische Gruppierung von Code
- [ ] Konsistente Namenskonventionen
- [ ] Keine Code-Duplikation (DRY)

**Testbarkeit:**
- [ ] Funktionen sind testbar
- [ ] Dependency Injection wo nötig
- [ ] Unit-Tests vorhanden

---

## 📝 Versionierung & Changelog

### Semantic Versioning

**Format**: `MAJOR.MINOR.PATCH` (z.B. `1.2.3`)

**Regeln:**
- **MAJOR**: Breaking Changes (API-Änderungen, Datenbank-Migrationen)
- **MINOR**: Neue Features (rückwärtskompatibel)
- **PATCH**: Bugfixes, kleine Verbesserungen

**Beispiele:**
- `1.0.0` → `1.0.1`: Bugfix
- `1.0.1` → `1.1.0`: Neues Feature (z.B. Bibelstellen-Favoriten)
- `1.1.0` → `2.0.0`: Breaking Change (z.B. API-Änderung)

### Versionsverwaltung

**package.json (Backend & Frontend):**
```json
{
  "name": "notenest",
  "version": "1.0.0",
  "description": "NoteNest - Persönliche Notizen-App mit Bibelstellen-Referenzen"
}
```

**Git Tags:**
```bash
# Version taggen
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Für Pre-Releases
git tag -a v1.0.0-beta.1 -m "Beta release 1.0.0"
```

**Docker Image Tags:**
```bash
# Version-spezifische Tags
docker build -t notenest:1.0.0 .
docker build -t notenest:latest .

# Für Pre-Releases
docker build -t notenest:1.0.0-beta.1 .
```

### CHANGELOG.md

**Format (Keep a Changelog):**

```markdown
# Changelog

Alle bemerkenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Geplant
- Volltextsuche über alle Notizen
- Tags und Kategorien

## [1.1.0] - 2024-02-15

### Hinzugefügt
- Bibelstellen-Favoriten-Verwaltung
- Erweiterte Popup-Funktionen für Bibelstellen
- Option: Bibelvers direkt in Notiz übernehmen
- Docker Registry Integration für einfaches Deployment

### Geändert
- Verbesserte Performance bei Bibelstellen-Erkennung
- UI-Verbesserungen für mobile Geräte

### Behoben
- Bug: Bibelstellen wurden nicht korrekt erkannt bei Versbereichen
- Bug: PDF-Export bei langen Notizen

## [1.0.0] - 2024-01-15

### Hinzugefügt
- Initiale Release
- Multi-User-System mit Authentifizierung
- Private und geteilte Ordner
- Markdown-Editor mit Live-Vorschau
- Bibelstellen-Referenzen (Basis-Funktionalität)
- PDF-Export (A4/A5)
- PWA-Support
- Docker-Deployment
```

**Changelog-Pflege:**
- Jede Änderung wird sofort dokumentiert
- Bei Release: Unreleased → Neue Version
- Klare Kategorien: Hinzugefügt, Geändert, Behoben, Entfernt

### Release-Prozess

**1. Pre-Release:**
```bash
# Version in package.json erhöhen
npm version 1.1.0-beta.1

# Changelog aktualisieren
# Git commit & tag
git add CHANGELOG.md package.json
git commit -m "chore: prepare release 1.1.0-beta.1"
git tag v1.1.0-beta.1
```

**2. Release:**
```bash
# Finale Version
npm version 1.1.0

# Build
docker build -t notenest:1.1.0 .
docker tag notenest:1.1.0 registry.example.com/notenest:1.1.0
docker tag notenest:1.1.0 registry.example.com/notenest:latest

# Push
docker push registry.example.com/notenest:1.1.0
docker push registry.example.com/notenest:latest

# Git
git add CHANGELOG.md package.json
git commit -m "chore: release version 1.1.0"
git tag v1.1.0
git push origin main --tags
```

**3. Post-Release:**
- GitHub Release erstellen (wenn GitHub verwendet wird)
- Release-Notes aus CHANGELOG.md kopieren
- Docker Image auf NAS deployen

### Datenbank-Migrationen

**Versionierung von Datenbank-Änderungen:**
```
migrations/
├── 001_initial_schema.sql
├── 002_add_bible_favorites.sql
├── 003_add_file_metadata.sql
└── ...
```

**Migration beim Update:**
```javascript
// Pseudocode
async function runMigrations(currentVersion, targetVersion) {
  const migrations = getMigrationsBetween(currentVersion, targetVersion);
  
  for (const migration of migrations) {
    await db.exec(migration.sql);
    await updateVersion(migration.version);
  }
}
```

---

## 🛠️ Entwickler-Setup

### Windows-Entwicklungsumgebung

#### Benötigte Software

**1. Node.js & npm**
- **Download**: https://nodejs.org/
- **Version**: LTS (Long Term Support)
- **Prüfung**: `node --version` und `npm --version`
- **Empfehlung**: Node.js 18.x oder höher

**2. Docker Desktop**
- **Download**: https://www.docker.com/products/docker-desktop/
- **Prüfung**: `docker --version` und `docker-compose --version`
- **Wichtig**: Docker Desktop muss laufen (System-Tray)

**3. Git**
- **Download**: https://git-scm.com/download/win
- **Prüfung**: `git --version`
- **Konfiguration**: Username und Email setzen

**4. Code-Editor (Empfohlen: VS Code)**
- **Download**: https://code.visualstudio.com/
- **Empfohlene Extensions**:
  - ESLint
  - Prettier
  - Docker
  - GitLens
  - TypeScript and JavaScript Language Features

**5. Optional: Datenbank-Client**
- **DBeaver** (kostenlos): https://dbeaver.io/
- Oder: **DB Browser for SQLite**: https://sqlitebrowser.org/

#### Projekt-Setup

**1. Repository klonen/erstellen:**
```bash
git clone <repository-url>
cd NotizenApp
```

**2. Umgebungsvariablen konfigurieren:**
```bash
# .env.example kopieren
cp .env.example .env

# .env bearbeiten (API-Keys, Secrets, etc.)
# WICHTIG: .env ist bereits in .gitignore
```

**3. Dependencies installieren:**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

**4. Lokale Bibel-Datenbank importieren:**
```bash
# Bibel-JSON-Dateien sind bereits vorhanden in "lokale bibeln/"
# Import-Script ausführen (wird erstellt)
cd backend
npm run import-bibles
```

**5. Entwicklung starten:**
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

#### Docker-Entwicklung

**docker-compose.dev.yml:**
```yaml
version: '3.8'

services:
  notenest-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: notenest-dev
    ports:
      - "3000:3000"
      - "5173:5173"  # Vite Dev Server
    volumes:
      # Live-Reload: Code-Änderungen werden sofort übernommen
      - ./backend:/app/backend
      - ./frontend:/app/frontend
      - ./lokale bibeln:/app/data/bibles:ro
      - ./data/database:/app/data/database
    environment:
      - NODE_ENV=development
      - PORT=3000
    env_file:
      - .env
    command: npm run dev
```

**Dockerfile.dev:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Installiere Dependencies
COPY package*.json ./
RUN npm install

# Expose Ports
EXPOSE 3000 5173

# Dev-Command (wird in docker-compose überschrieben)
CMD ["npm", "run", "dev"]
```

**Entwicklung mit Docker:**
```bash
# Starten
docker-compose -f docker-compose.dev.yml up

# Im Hintergrund
docker-compose -f docker-compose.dev.yml up -d

# Logs anzeigen
docker-compose -f docker-compose.dev.yml logs -f

# Stoppen
docker-compose -f docker-compose.dev.yml down
```

### Build-Prozess

#### Lokaler Build (Windows)

**1. Backend Build:**
```bash
cd backend
npm run build
# Erstellt: backend/dist/
```

**2. Frontend Build:**
```bash
cd frontend
npm run build
# Erstellt: frontend/build/
```

**3. Docker Build:**
```bash
# Im Root-Verzeichnis
docker build -t notenest:latest .

# Mit Version
docker build -t notenest:1.0.0 .
docker tag notenest:1.0.0 notenest:latest
```

#### Production Build

**Dockerfile (Multi-Stage):**
```dockerfile
# Stage 1: Frontend Build
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Backend Build
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

# Stage 3: Production
FROM node:18-alpine
WORKDIR /app

# Installiere Puppeteer Dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copy built files
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Copy Bibel-Datenbank (lokal)
COPY "lokale bibeln"/*.json ./data/bibles/

# Create data directory
RUN mkdir -p /data/users /data/database

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
```

**Build-Befehl:**
```bash
docker build -t notenest:1.0.0 .
```

### Docker Registry

#### Option 1: Docker Hub (Kostenlos)

**Registrierung:**
- URL: https://hub.docker.com/
- Kostenlos für öffentliche Repositories
- Kostenlos für 1 privates Repository
- Unbegrenzte öffentliche Repositories

**Verwendung:**
```bash
# Login
docker login

# Tag
docker tag notenest:1.0.0 <username>/notenest:1.0.0
docker tag notenest:1.0.0 <username>/notenest:latest

# Push
docker push <username>/notenest:1.0.0
docker push <username>/notenest:latest
```

**docker-compose.yml (NAS):**
```yaml
services:
  notenest:
    image: <username>/notenest:latest
    # Oder: image: <username>/notenest:1.0.0
    pull_policy: always
    # ...
```

#### Option 2: GitHub Container Registry (GHCR) - Kostenlos

**Vorteile:**
- ✅ Komplett kostenlos (auch private)
- ✅ Integration mit GitHub
- ✅ Keine Limits

**Verwendung:**
```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin

# Tag
docker tag notenest:1.0.0 ghcr.io/<username>/notenest:1.0.0

# Push
docker push ghcr.io/<username>/notenest:1.0.0
```

#### Option 3: Lokale Registry (Selbst gehostet)

**Für private/geschlossene Umgebung:**
```bash
# Registry starten
docker run -d -p 5000:5000 --name registry registry:2

# Tag & Push
docker tag notenest:1.0.0 localhost:5000/notenest:1.0.0
docker push localhost:5000/notenest:1.0.0
```

**Empfehlung**: Docker Hub oder GHCR für Einfachheit.

### Deployment-Workflow

**1. Entwicklung (Windows):**
```bash
# Code entwickeln
# Tests ausführen
npm test

# Lokal testen
docker-compose -f docker-compose.dev.yml up
```

**2. Build (Windows):**
```bash
# Build Image
docker build -t notenest:1.0.0 .

# Test lokal
docker run -p 3000:3000 notenest:1.0.0
```

**3. Push zu Registry (Windows):**
```bash
# Tag
docker tag notenest:1.0.0 <username>/notenest:1.0.0
docker tag notenest:1.0.0 <username>/notenest:latest

# Push
docker push <username>/notenest:1.0.0
docker push <username>/notenest:latest
```

**4. Deployment auf NAS:**
```bash
# Auf NAS
cd /path/to/notenest
docker-compose pull
docker-compose up -d
```

### Checkliste: Entwickler-Setup

**Vor dem Start:**
- [ ] Node.js installiert (v18+)
- [ ] Docker Desktop installiert und läuft
- [ ] Git installiert und konfiguriert
- [ ] VS Code installiert (oder anderer Editor)
- [ ] Projekt geklont/erstellt
- [ ] `.env` Datei erstellt (aus `.env.example`)
- [ ] API-Keys konfiguriert (YouVersion API)
- [ ] Bibel-JSON-Dateien vorhanden (`lokale bibeln/`)
- [ ] Dependencies installiert (`npm install` in backend & frontend)
- [ ] Bibel-Datenbank importiert (`npm run import-bibles`)

**Erste Schritte:**
- [ ] Lokale Entwicklung starten (`npm run dev`)
- [ ] Docker-Entwicklung testen (`docker-compose -f docker-compose.dev.yml up`)
- [ ] Build testen (`docker build -t notenest:test .`)
- [ ] Registry-Account erstellt (Docker Hub oder GHCR)

---

## 🧪 Testing-Strategie

### Backend-Tests

#### Unit-Tests (Jest)
- **Pfadvalidierung**: Verschiedene Path-Traversal-Szenarien
- **Passwort-Hashing**: Argon2-Verifizierung
- **JWT-Generierung**: Token-Erstellung und -Validierung
- **Dateioperationen**: Mock File-System

#### Integration-Tests
- **API-Endpoints**: Vollständige Request/Response-Zyklen
- **Authentifizierung**: Login, Register, Token-Refresh
- **Dateiverwaltung**: CRUD-Operationen mit echten Dateien

#### Security-Tests
- **Path-Traversal**: Versuche, auf fremde Ordner zuzugreifen
- **SQL-Injection**: Input-Validierung
- **XSS**: Sanitization von User-Input

### Frontend-Tests

#### Unit-Tests (Jest + React Testing Library)
- **Komponenten**: Rendering, Interaktionen
- **Hooks**: Custom Hooks testen
- **Utils**: Helper-Funktionen

#### E2E-Tests (Playwright/Cypress)
- **User-Flows**: Registrierung → Login → Notiz erstellen → Export
- **Responsive**: Mobile/Tablet/Desktop-Verhalten
- **PWA**: Installierbarkeit, Offline-Funktionalität

### Mock-Daten für Tests

```javascript
// test/fixtures/users.js
export const mockUsers = [
  {
    id: 1,
    username: 'testuser',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$...', // Pre-hashed
    baseFolderPath: '/test/data/users/testuser'
  }
];

// test/fixtures/files.js
export const mockFileStructure = {
  '/test/data/users/testuser': {
    'note1.md': '# Test Note\n\nContent...',
    'folder1': {
      'note2.md': '# Another Note\n\n...'
    }
  }
};
```

### Test-Coverage-Ziele

- **Backend**: > 80% Coverage
- **Frontend**: > 70% Coverage
- **Kritische Funktionen**: 100% Coverage (Pfadvalidierung, Auth)

---

## 📊 Logging & Monitoring

### Logging (Winston)

**Log-Levels:**
- **error**: Fehler, Exceptions
- **warn**: Warnungen (z.B. fehlgeschlagene Login-Versuche)
- **info**: Wichtige Events (Login, Datei-Erstellung)
- **debug**: Detaillierte Debug-Informationen

**Log-Format:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "File created",
  "userId": 1,
  "path": "/folder1/note.md",
  "ip": "192.168.1.100"
}
```

**Log-Rotation:**
- Täglich neue Log-Datei
- Alte Logs nach 30 Tagen löschen
- Max. 100 MB pro Log-Datei

### Monitoring (Optional)

**Health-Check-Endpoint:**
```
GET /api/health
Response: { status: "ok", uptime: 12345, version: "1.0.0" }
```

**Metriken (Optional mit Prometheus):**
- Anzahl aktiver Benutzer
- API-Response-Zeiten
- Fehlerrate
- Dateioperationen pro Minute

---

## 🚀 Deployment-Checkliste

### Vor dem Deployment

- [ ] Umgebungsvariablen konfiguriert (.env)
- [ ] JWT-Secrets generiert (stark, zufällig)
- [ ] Datenbank initialisiert
- [ ] Docker-Volumes erstellt
- [ ] Reverse Proxy konfiguriert (HTTPS)
- [ ] Firewall-Regeln gesetzt
- [ ] Backup-Strategie definiert

### Nach dem Deployment

- [ ] Health-Check funktioniert
- [ ] Registrierung funktioniert
- [ ] Login funktioniert
- [ ] Dateiverwaltung funktioniert
- [ ] PDF-Export funktioniert
- [ ] PWA installierbar
- [ ] Offline-Modus funktioniert
- [ ] Logs werden geschrieben

---

## 🔄 Zukünftige Erweiterungen (Optional)

- **Tags & Suche**: Volltextsuche über alle Notizen
- **Kollaboration**: Notizen teilen, gemeinsam bearbeiten
- **Versionierung**: Git-ähnliche Versionshistorie
- **Plugins**: Erweiterbare Funktionalität
- **Mobile Apps**: Native iOS/Android Apps
- **Cloud-Sync**: Optionaler Cloud-Backup
- **Templates**: Notiz-Vorlagen
- **Dark Mode**: Automatisches Theme-Switching

---

## 📝 Zusammenfassung

### Technologie-Stack (Finale Entscheidung)

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript
- **Datenbank**: SQLite (MVP) / PostgreSQL (Production)
- **Auth**: JWT mit Refresh-Tokens
  - **Modi**: Eigene Benutzerverwaltung ODER NAS-Integration (LDAP/Synology)
  - **Hybrid**: Beide Modi gleichzeitig möglich
- **LDAP**: ldapjs (für NAS-Integration)
- **PDF**: Puppeteer
- **Markdown**: markdown-it
- **PWA**: Workbox
- **Container**: Docker + docker-compose
- **Reverse Proxy**: Traefik (optional)

### Kritische Sicherheitsaspekte

1. **Pfadvalidierung**: Jede Dateioperation muss validiert werden (für private UND geteilte Ordner)
2. **URL-basierte Zugriffe**: Pfade in URLs werden beim Backend validiert (keine Vertrauensstellung)
3. **Dateisystem-Berechtigungen**: Respektierung der NAS-Berechtigungen für automatische Filterung
4. **Passwort-Hashing**: Argon2id mit starken Parametern
5. **JWT-Sicherheit**: Kurze Access-Token-Lifetime, sichere Secrets
6. **Input-Validierung**: Alle User-Inputs validieren und sanitizen (inkl. URL-Parameter)
7. **Rate Limiting**: Schutz gegen Brute-Force-Angriffe

### Neue Features: Private & Geteilte Ordner

1. **Zwei Basisordner pro Benutzer**: 
   - Privater Ordner (z.B. `/homes/user1` auf Synology)
   - Geteilter Ordner (z.B. `/volume1/shared/notes` auf Synology)

2. **Automatische Filterung durch NAS-Berechtigungen**:
   - App zeigt nur Ordner/Dateien an, auf die der Benutzer Zugriff hat
   - Keine komplexe Berechtigungsverwaltung in der App nötig
   - Funktioniert mit jeder NAS, die Standard-Dateisystem-Berechtigungen unterstützt

3. **UI-Unterscheidung**:
   - Sidebar zeigt "Privat" und "Geteilt" getrennt an
   - Visuelle Icons zur Unterscheidung (📁 vs. 👥)
   - Berechtigungsanzeige (nur-Lese vs. Schreibzugriff)

### URL-Struktur & Sharing

1. **Pfade in URLs**:
   - Format: `/notes/:type/:path*` (z.B. `/notes/private/folder1/note1`)
   - Ermöglicht Deep-Linking, Bookmarking und Browser-History
   - Pfade werden URL-encodiert

2. **Sicherheit bei URL-Zugriffen**:
   - Backend validiert JEDEN Pfad-Zugriff (auch aus URLs)
   - Keine Vertrauensstellung: Frontend-URLs werden nie blind vertraut
   - Bei fehlender Berechtigung: 403 Forbidden (kein Zugriff auf fremde Notizen)

3. **Sharing-Möglichkeiten**:
   - URLs können manuell geteilt werden (Backend prüft Berechtigung)
   - Optional: Share-Links mit Token für temporären Zugriff (zukünftige Erweiterung)

### Bibelstellen-Referenzen

1. **Automatische Erkennung**:
   - Regex-basierte Erkennung von Bibelstellen in Notizen
   - Unterstützung verschiedener Formate ("Psalm 23,3", "Ps 23:3", etc.)
   - Versbereiche unterstützt ("Psalm 23,1-6")

2. **Hybrid-Ansatz**:
   - Lokale Public-Domain-Übersetzungen (Luther 1912, Elberfelder 1905) für Offline-Nutzung
   - API.Bible für moderne Übersetzungen (Luther 2017, Elberfelder 2006, BasisBibel, etc.)
   - Bible SuperSearch als Fallback

3. **UI-Features**:
   - Hover-Tooltip mit Vers-Text
   - Klick öffnet Popup mit vollständigem Vers/Kapitel
   - Mehrere Übersetzungen parallel anzeigbar
   - Offline-Funktionalität durch lokale Basis-Übersetzungen

### Unterstützung bereits vorhandener Dateien

1. **Alle Dateien werden angezeigt**:
   - Bereits vorhandene Dateien im konfigurierten Ordner sind sichtbar
   - Keine Filterung nach Dateityp

2. **Bearbeitbarkeit**:
   - `.md` und `.txt` Dateien können im Editor bearbeitet werden
   - Andere Dateitypen (`.pdf`, `.docx`, `.jpg`, etc.) werden ausgegraut angezeigt
   - Nicht bearbeitbare Dateien können trotzdem umbenannt, verschoben und gelöscht werden

3. **UI-Darstellung**:
   - Bearbeitbare Dateien: Normale Darstellung, klickbar
   - Nicht bearbeitbare Dateien: Ausgegraut (Opacity 0.5-0.6), Read-only Badge
   - Tooltip bei Hover über nicht bearbeitbare Dateien

### Authentifizierung: NAS-Integration

1. **Zwei Authentifizierungs-Modi**:
   - **Eigene Benutzerverwaltung**: Standard, unabhängig von NAS
   - **NAS-Integration**: Nutzt Synology Directory Server, LDAP oder Active Directory

2. **Hybrid-Ansatz**:
   - Beide Modi können gleichzeitig aktiviert sein
   - Login versucht zuerst NAS-Auth, dann lokale Auth
   - Konfigurierbar über Umgebungsvariablen

3. **Vorteile NAS-Integration**:
   - Einheitliche Benutzerverwaltung (nur NAS)
   - Benutzer müssen sich nur einmal anmelden
   - Zentrale Verwaltung durch NAS-Admin
   - Ideal für größere Organisationen

4. **Implementierung**:
   - LDAP-Protokoll (ldapjs)
   - Unterstützt Synology Directory Server
   - Unterstützt Standard-LDAP und Active Directory
   - Automatische Benutzer-Erstellung beim ersten Login

### Code-Qualität & Best Practices

1. **Sicherheits- und Versionskontrolle**:
   - `.gitignore` korrekt konfiguriert (keine Secrets im Repository)
   - Sensible Daten nur über Umgebungsvariablen
   - `.env.example` als Template für andere Entwickler
   - Keine Secrets in `docker-compose.yml`

2. **Code-Struktur und Lesbarkeit**:
   - Klare Datei- und Ordnerstruktur
   - JSDoc-Kommentare für öffentliche Funktionen
   - Überschriften und Abschnitte in Dateien
   - Kommentare erklären "Warum", nicht "Was"

3. **Funktionale Modularität**:
   - Single-Responsibility-Prinzip (SRP)
   - Funktionen < 100 Zeilen (idealerweise < 50)
   - Wiederverwendbare Utility-Funktionen
   - Testbare Funktionen durch Dependency Injection

### Nächste Schritte

1. **MVP-Entwicklung**: Basis-Funktionalität implementieren
2. **Security-Audit**: Externe Prüfung der Sicherheitslogik
3. **Beta-Testing**: Mit echten Benutzern testen
4. **Performance-Tuning**: Optimierung basierend auf Tests
5. **Bibel-Datenbank**: Public-Domain-Übersetzungen importieren
6. **API-Keys**: API.Bible Key registrieren
7. **Code-Review-Prozess**: Checkliste etablieren
8. **Dokumentation**: Benutzerhandbuch, Admin-Guide

---

**Ende der Architektur-Planung**

