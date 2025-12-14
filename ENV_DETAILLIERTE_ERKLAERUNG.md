# Detaillierte Erklärung der .env Variablen

## 🔐 JWT (JSON Web Tokens)

### Was ist JWT?

**JWT** = **JSON Web Token**

**Zweck**: Sichere Authentifizierung ohne Session-Speicherung

**Wie funktioniert es?**
1. Benutzer loggt sich ein (Username + Passwort)
2. Server prüft Credentials
3. Server erstellt JWT-Token (signiert mit JWT_SECRET)
4. Token wird an Client gesendet
5. Client sendet Token bei jedem Request mit
6. Server verifiziert Token (mit JWT_SECRET)

**Vorteile:**
- Stateless (kein Session-Speicher nötig)
- Skalierbar (mehrere Server können dasselbe Secret nutzen)
- Sicher (Token ist signiert, kann nicht gefälscht werden)

### Werden die Werte immer generiert?

**Ja, aber nur einmal!**

**Workflow:**
1. **Erste Installation**: Generiere JWT_SECRET und JWT_REFRESH_SECRET
2. **Speichere in `.env`**: Diese Werte bleiben gleich
3. **Bei jedem Start**: Server verwendet dieselben Secrets aus `.env`
4. **Nur neu generieren wenn**: Secret kompromittiert wurde

**Generierung (einmalig):**
```powershell
# JWT_SECRET generieren
openssl rand -base64 32

# JWT_REFRESH_SECRET generieren (anderer Wert!)
openssl rand -base64 32
```

**Beispiel:**
```env
JWT_SECRET=K8mN2pQ5rT9vW3xY7zA1bC4dE6fG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6zA8b
JWT_REFRESH_SECRET=Z9yX7wV5uT3sR1qP8oN6mL4kJ2iH0gF7eD5cB3aZ1yX9wV7uT5sR3qP1o
```

**Wichtig:**
- Einmal generiert, bleiben sie gleich
- NIEMALS ändern, wenn bereits Benutzer existieren (alle Sessions würden ungültig)
- Nur neu generieren bei Sicherheitsvorfall

---

## 👤 AUTH_MODE – Authentifizierungs-Modi

### `local` – Nur lokale Benutzerverwaltung

**Was passiert:**
- Benutzer registrieren sich direkt in NoteNest
- Passwörter werden in NoteNest-Datenbank gehasht
- Keine Verbindung zu NAS/LDAP

**Vorteile:**
- Einfachste Konfiguration
- Funktioniert ohne NAS
- Unabhängig von NAS-Benutzerverwaltung

**Nachteile:**
- Zwei separate Benutzerverwaltungen (NAS + NoteNest)
- Benutzer müssen sich zweimal anmelden

**Verwendung:**
- Kleine Teams/Familien
- Keine NAS-Integration gewünscht
- Entwicklung/Testing

### `ldap` – Nur LDAP/NAS-Authentifizierung

**Was passiert:**
- Benutzer loggen sich mit NAS-Credentials ein
- NoteNest authentifiziert gegen LDAP-Server
- Keine Registrierung in NoteNest möglich
- Benutzer müssen in NAS erstellt werden

**Vorteile:**
- Einheitliche Benutzerverwaltung (nur NAS)
- Zentrale Verwaltung
- Keine doppelte Anmeldung

**Nachteile:**
- Erfordert LDAP-Konfiguration
- Benutzer müssen in NAS erstellt werden

**Verwendung:**
- Größere Organisationen
- Bestehende LDAP/Active Directory Infrastruktur
- Zentrale Benutzerverwaltung gewünscht

### `synology` – Synology-spezifische Integration

**Was passiert:**
- Wie `ldap`, aber mit Synology-spezifischen Optimierungen
- Nutzt Synology Directory Server
- Automatische Pfad-Konfiguration (`/homes/{username}`)

**Vorteile:**
- Optimiert für Synology NAS
- Automatische Standard-Pfade
- Einfache Konfiguration für Synology

**Verwendung:**
- Synology NAS als Server
- Synology Directory Server aktiviert

### `hybrid` – Beide Modi gleichzeitig (Empfohlen)

**Was passiert:**
- Beide Authentifizierungs-Modi sind aktiv
- Login versucht zuerst LDAP, dann lokale Auth
- Registrierung nur für lokale Benutzer möglich

**Vorteile:**
- Flexibilität: NAS-Benutzer UND lokale Benutzer
- Fallback: Wenn LDAP nicht verfügbar, lokale Auth
- Beste aus beiden Welten

**Nachteile:**
- Etwas komplexere Konfiguration

**Verwendung:**
- **Empfohlen für die meisten Fälle**
- Wenn sowohl NAS- als auch lokale Benutzer gewünscht
- Flexible Migration möglich

**Beispiel-Flow:**
```
Benutzer loggt sich ein:
1. Versuche LDAP-Authentifizierung
   → Erfolg: Login erfolgreich
   → Fehler: Weiter zu Schritt 2
2. Versuche lokale Authentifizierung
   → Erfolg: Login erfolgreich
   → Fehler: Login fehlgeschlagen
```

---

## 🖥️ NODE_ENV – Node.js Umgebung

### `development` – Entwicklungsmodus

**Was passiert:**
- Detailliertes Logging (alle Meldungen)
- Hot-Reload aktiviert (Code-Änderungen werden sofort übernommen)
- Source Maps für Debugging
- Keine Performance-Optimierungen
- Entwickler-Features aktiviert

**Verhalten:**
- Fehler zeigen Stack-Traces
- Mehr Debug-Informationen
- Langsamere Performance (OK für Entwicklung)

**Verwendung:**
- Lokale Entwicklung
- Testing
- Debugging

**Beispiel-Logging:**
```
[DEBUG] Database query: SELECT * FROM users
[INFO] User logged in: user1
[DEBUG] JWT token generated: eyJhbGc...
```

### `production` – Produktionsmodus

**Was passiert:**
- Minimiertes Logging (nur wichtige Meldungen)
- Performance-Optimierungen aktiviert
- Keine Source Maps (kleinere Builds)
- Fehler-Handling optimiert
- Sicherheits-Features aktiviert

**Verhalten:**
- Fehler zeigen keine Stack-Traces (Sicherheit)
- Weniger Debug-Informationen
- Optimierte Performance

**Verwendung:**
- Live-Server
- NAS-Deployment
- Endbenutzer

**Beispiel-Logging:**
```
[INFO] Server started on port 3000
[WARN] Failed login attempt from 192.168.1.100
[ERROR] Database connection failed
```

**Wichtig:**
- Immer `production` für Live-Server setzen
- Bessere Performance
- Mehr Sicherheit

---

## 🏠 NAS_HOMES_PATH – Synology Beispiel

### Synology-Verzeichnisstruktur

**Auf Synology NAS:**
```
/volume1/
├── homes/          # Private Ordner für jeden Benutzer
│   ├── user1/      # Nur für user1 sichtbar
│   ├── user2/      # Nur für user2 sichtbar
│   └── admin/      # Nur für admin sichtbar
├── shared/         # Geteilte Ordner
│   └── notes/      # Für mehrere Benutzer sichtbar
└── ...
```

### Docker-Volume-Mapping

**In docker-compose.yml:**
```yaml
volumes:
  # Host (Synology) → Container
  - /volume1/homes:/data/homes:ro
  - /volume1/shared:/data/shared:rw
```

**Bedeutung:**
- `/volume1/homes` (auf Synology) wird gemountet nach `/data/homes` (im Container)
- `/volume1/shared` (auf Synology) wird gemountet nach `/data/shared` (im Container)

### .env Konfiguration

**Für Synology:**
```env
NAS_TYPE=synology
NAS_HOMES_PATH=/data/homes      # Container-Pfad (nicht /volume1/homes!)
NAS_SHARED_PATH=/data/shared    # Container-Pfad (nicht /volume1/shared!)
```

**Wichtig:**
- `.env` verwendet Container-Pfade (`/data/homes`), nicht Host-Pfade (`/volume1/homes`)
- Das Mapping wird in `docker-compose.yml` gemacht
- Container sieht `/data/homes`, was tatsächlich `/volume1/homes` auf der NAS ist

**Warum?**
- Container läuft isoliert
- Container kennt nur seine eigenen Pfade
- Docker macht das Mapping transparent

### Beispiel-Konfiguration

**Synology NAS:**
- Host-Pfad: `/volume1/homes/user1`
- Container-Pfad: `/data/homes/user1`
- In `.env`: `NAS_HOMES_PATH=/data/homes` ✅
- In `.env`: `NAS_HOMES_PATH=/volume1/homes` ❌ (falsch!)

---

## 📖 BIBLE_LOCAL_PATH – Lokale Bibel-Dateien

### Deine Situation

**Windows-Entwicklung:**
- Dateien liegen bei: `C:\Users\b-kun\Documents\NotizenApp\lokale bibeln\luther_1912.json`
- Du möchtest: `C:\Users\b-kun\Documents\NotizenApp\data\bibles\luther_1912.json`

### Lösung: Zwei verschiedene Pfade

**1. Development (Windows, lokal):**
```env
BIBLE_LOCAL_PATH=./data/bibles
# Oder absolut:
BIBLE_LOCAL_PATH=C:\Users\b-kun\Documents\NotizenApp\data\bibles
```

**2. Production (Docker Container):**
```env
BIBLE_LOCAL_PATH=/app/data/bibles
```

### Empfehlung: Dateien verschieben

**Aktuell:**
```
lokale bibeln/
├── luther_1912.json
├── elberfelder_1905.json
└── ...
```

**Empfohlen:**
```
data/
└── bibles/
    ├── luther_1912.json
    ├── elberfelder_1905.json
    └── ...
```

**Vorteile:**
- Konsistente Struktur
- Einfacher für Docker (kann `data/` mounten)
- Klarere Organisation

### .env Konfiguration

**Für lokale Entwicklung (Windows):**
```env
BIBLE_LOCAL_PATH=./data/bibles
# Oder:
BIBLE_LOCAL_PATH=data/bibles
```

**Für Docker:**
```env
BIBLE_LOCAL_PATH=/app/data/bibles
```

**docker-compose.dev.yml:**
```yaml
volumes:
  - ./data/bibles:/app/data/bibles:ro
```

### Code-Anpassung nötig

**Backend muss beide Pfade unterstützen:**
```typescript
// Pseudocode
const getBiblePath = (): string => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.BIBLE_LOCAL_PATH || '/app/data/bibles';
  }
  
  // Development: Relativer Pfad
  return process.env.BIBLE_LOCAL_PATH || path.join(__dirname, '../../data/bibles');
};
```

---

## 📋 Zusammenfassung

### JWT
- **Einmal generieren**, dann in `.env` speichern
- Bleiben gleich, außer bei Sicherheitsvorfall
- Zwei verschiedene Secrets: JWT_SECRET und JWT_REFRESH_SECRET

### AUTH_MODE
- **`hybrid` empfohlen**: Flexibel, beide Modi möglich
- **`local`**: Einfachste Lösung, keine NAS nötig
- **`ldap`/`synology`**: Für NAS-Integration

### NODE_ENV
- **`development`**: Für lokale Entwicklung
- **`production`**: Für Live-Server/NAS

### NAS_HOMES_PATH
- **Container-Pfad verwenden**: `/data/homes` (nicht `/volume1/homes`)
- Mapping wird in docker-compose.yml gemacht

### BIBLE_LOCAL_PATH
- **Development**: Relativer Pfad `./data/bibles` oder `data/bibles`
- **Production**: Container-Pfad `/app/data/bibles`
- **Empfehlung**: Dateien nach `data/bibles/` verschieben

