# Deployment-Modi - NAS vs. Standalone

NoteNest unterstützt zwei Deployment-Modi, die über die Umgebungsvariable `DEPLOYMENT_MODE` gesteuert werden.

## 🎯 Übersicht

| Feature | Standalone | NAS-Mode |
|---------|-----------|----------|
| **Zielumgebung** | Server, Cloud, lokaler PC | Synology, QNAP, TrueNAS |
| **Benutzer-Registrierung** | ✅ Aktiviert | ❌ Deaktiviert (nur Admin) |
| **Private Ordner** | Container-intern | NAS Home-Verzeichnisse |
| **Shared-Ordner** | Container-intern | NAS Shared-Folders |
| **Benutzer-Verwaltung** | Self-Service | Admin-gesteuert |
| **NAS-Integration** | ❌ Keine | ✅ Vollständig |

---

## 🖥️ Standalone-Mode

### Wann verwenden?

- Eigenständiger Server (VPS, Cloud, lokaler PC)
- Keine NAS-Integration benötigt
- Benutzer sollen sich selbst registrieren können
- Einfaches Setup ohne externe Abhängigkeiten

### Charakteristika

**Benutzer-Registrierung:**
- ✅ Self-Service Registrierung aktiv
- User erstellen eigene Accounts
- Register-Link auf Login-Seite sichtbar

**Datenspeicherung:**
- Alle Daten im Container/Volume
- Ordnerstruktur:
  ```
  /data/
  ├── database/
  │   └── notenest.db
  ├── users/
  │   ├── alice/
  │   ├── bob/
  │   └── ...
  └── shared/
      └── ... (wenn aktiviert)
  ```

**Konfiguration:**

```bash
# .env
DEPLOYMENT_MODE=standalone
AUTH_MODE=local
REGISTRATION_ENABLED=true
```

```yaml
# docker-compose.yml
volumes:
  - ./data:/data
```

### Benutzer-Erfahrung

**Registration:**
1. User öffnet http://server:3100/login
2. Klickt auf "Noch kein Konto? Registrieren"
3. Erstellt eigenen Account
4. Kann sofort loslegen

**Ordner:**
- Private: Eigener Ordner im Container
- Shared: Optional, wenn vom Admin eingerichtet

---

## 🏠 NAS-Mode

### Wann verwenden?

- Deployment auf Synology, QNAP, TrueNAS, etc.
- Bestehende NAS-Benutzer sollen ihre Home-Verzeichnisse nutzen
- Admin möchte volle Kontrolle über Benutzer-Zugriff
- Integration in bestehendes NAS-Berechtigungssystem

### Charakteristika

**Benutzer-Verwaltung:**
- ❌ Self-Service Registrierung deaktiviert
- Nur Admin erstellt Benutzer
- Register-Link auf Login-Seite versteckt
- Benutzer müssen bereits auf NAS existieren

**Datenspeicherung:**
- Private Ordner: NAS Home-Verzeichnisse (z.B. `/volume1/homes/username/`)
- Shared Ordner: NAS Shared Folders (z.B. `/volume1/Familie/`)
- Datenbank: Lokal im Container

**NAS-Pfad-Struktur:**
```
NAS-Filesystem:
/volume1/
├── homes/
│   ├── alice/          → "Privat (alice)" in NoteNest
│   ├── bob/            → "Privat (bob)" in NoteNest
│   └── ...
├── Familie/            → "Familie" (wenn freigegeben)
├── Projekte/           → "Projekte" (wenn freigegeben)
└── Arbeit/             → "Arbeit" (wenn freigegeben)
```

**Konfiguration:**

```bash
# .env
DEPLOYMENT_MODE=nas
AUTH_MODE=hybrid
REGISTRATION_ENABLED=false
NAS_TYPE=synology
NAS_HOMES_PATH=/data/homes      # Container-Pfad!
NAS_SHARED_PATH=/data/shared    # Container-Pfad!
```

```yaml
# docker-compose.yml
volumes:
  # Home-Verzeichnisse
  - /volume1/homes:/data/homes:ro
  
  # Shared-Ordner (mehrere möglich!)
  - /volume1/Familie:/data/shared/Familie:rw
  - /volume1/Projekte:/data/shared/Projekte:rw
  - /volume1/Arbeit:/data/shared/Arbeit:rw
```

### Benutzer-Erfahrung

**Registration:**
1. User öffnet http://nas-ip:3100/login
2. Sieht **keinen** "Registrieren"-Link
3. Muss vom Admin einen Account erhalten

**Admin erstellt User:**
1. Admin loggt sich ein
2. Öffnet Admin-Panel
3. Erstellt User mit gleichem Namen wie NAS-User
4. User kann sich anmelden

**Ordner:**
- Private: NAS-Home des Users (`/volume1/homes/alice/`)
- Shared: Nur die vom Admin freigegebenen Ordner

**Beispiel (User "alice"):**

Admin gibt "Familie" und "Projekte" frei:

```
┌─────────────────────────────────┐
│ Privat (alice)                  │
├─────────────────────────────────┤
│ 📄 Meine_Notizen.md            │  ← /volume1/homes/alice/
│ 📁 Persönlich/                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Shared                          │
├─────────────────────────────────┤
│ 📁 Familie/                     │  ← /volume1/Familie/
│ 📁 Projekte/                    │  ← /volume1/Projekte/
└─────────────────────────────────┘
```

Alice sieht **nicht:**
- "Arbeit" (nicht freigegeben)
- Andere Home-Verzeichnisse

---

## 🔐 Sicherheit & Berechtigungen

### Standalone-Mode

**Sicherheitsebene:**
- NoteNest-interne Berechtigungen
- Jeder User hat Zugriff auf seine eigenen Dateien
- Admin kann User und Ordner verwalten

**Verantwortung:**
- NoteNest kontrolliert alle Zugriffe
- Keine externe Berechtigungssystem

### NAS-Mode

**Mehrschichtige Sicherheit:**

1. **NAS-Level (Basis-Sicherheit):**
   - NAS-Permissions gelten auch in NoteNest
   - User ohne NAS-Berechtigung kann Ordner nicht öffnen
   - Auch wenn Admin in NoteNest freigegeben hat

2. **NoteNest-Level (Zusätzliche Kontrolle):**
   - Admin entscheidet, welcher User welche Shared-Ordner **sieht**
   - User sieht nur freigegebene Ordner (auch wenn NAS-Berechtigung vorhanden)

**Beispiel:**

```
User "alice":
- NAS-Permissions: Zugriff auf "Familie", "Projekte", "Arbeit"
- NoteNest-Freigaben: Nur "Familie", "Projekte"
- Ergebnis: Alice sieht nur "Familie" und "Projekte" in NoteNest
```

**Best Practice:**
- NAS-Permissions = Grobe Zugriffsrechte (Team-basiert)
- NoteNest-Freigaben = Feine Kontrolle (pro User, Übersichtlichkeit)

---

## 🚀 Migration zwischen Modi

### Standalone → NAS

**Schritte:**

1. **Daten sichern:**
   ```bash
   docker-compose down
   cp -r data/ data.backup/
   ```

2. **NAS vorbereiten:**
   - User auf NAS anlegen (mit gleichem Namen wie in NoteNest)
   - Shared-Ordner erstellen

3. **Konfiguration anpassen:**
   ```bash
   # .env
   DEPLOYMENT_MODE=nas
   REGISTRATION_ENABLED=false
   NAS_HOMES_PATH=/data/homes
   NAS_SHARED_PATH=/data/shared
   ```

4. **docker-compose.yml anpassen:**
   ```yaml
   volumes:
     - /volume1/homes:/data/homes:ro
     - /volume1/Familie:/data/shared/Familie:rw
   ```

5. **Daten migrieren:**
   - User-Dateien von `data/users/alice/` nach `/volume1/homes/alice/` kopieren
   - Shared-Dateien nach `/volume1/Familie/` kopieren

6. **Container neu starten:**
   ```bash
   docker-compose up -d
   ```

### NAS → Standalone

**Achtung:** Weniger üblich, aber möglich.

**Schritte:**

1. **Daten exportieren:**
   ```bash
   # Von NAS in Container kopieren
   docker cp /volume1/homes/alice/ notenest:/data/users/alice/
   ```

2. **Konfiguration anpassen:**
   ```bash
   # .env
   DEPLOYMENT_MODE=standalone
   REGISTRATION_ENABLED=true
   # NAS_*-Variablen entfernen
   ```

3. **docker-compose.yml vereinfachen:**
   ```yaml
   volumes:
     - ./data:/data
   ```

4. **Container neu starten:**
   ```bash
   docker-compose up -d
   ```

---

## 🔧 Entwicklung vs. Production

### Entwicklung

```bash
# Immer Standalone
DEPLOYMENT_MODE=standalone
NODE_ENV=development
REGISTRATION_ENABLED=true
```

**Empfohlen:**
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production

**Standalone:**
```bash
DEPLOYMENT_MODE=standalone
NODE_ENV=production
REGISTRATION_ENABLED=true  # oder false, je nach Wunsch
```

**NAS:**
```bash
DEPLOYMENT_MODE=nas
NODE_ENV=production
REGISTRATION_ENABLED=false
NAS_TYPE=synology
NAS_HOMES_PATH=/data/homes
NAS_SHARED_PATH=/data/shared
```

---

## 📋 Checkliste: Welcher Modus?

### Verwende Standalone, wenn:
- [ ] Du einen eigenständigen Server hast (VPS, Cloud, PC)
- [ ] User sich selbst registrieren sollen
- [ ] Keine NAS-Integration benötigt wird
- [ ] Einfaches Setup gewünscht ist

### Verwende NAS-Mode, wenn:
- [ ] Du eine Synology, QNAP, TrueNAS, etc. hast
- [ ] Bestehende NAS-User ihre Home-Verzeichnisse nutzen sollen
- [ ] Admin volle Kontrolle über User-Zugriff haben soll
- [ ] Integration in bestehendes NAS-Berechtigungssystem gewünscht ist
- [ ] Mehrere Shared-Ordner mit feiner Zugriffskontrolle benötigt werden

---

## 📚 Siehe auch

- [NAS_SETUP_GUIDE.md](./NAS_SETUP_GUIDE.md) - Schritt-für-Schritt NAS-Setup
- [ENV_EXAMPLES.md](./ENV_EXAMPLES.md) - Environment-Variablen Beispiele
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Auth-System erklärt
- [README.md](../README.md) - Hauptdokumentation
