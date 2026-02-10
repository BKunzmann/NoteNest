# Changelog

Alle wichtigen Änderungen in diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [1.0.0] - 2025-12-10

## [Unreleased]

### 🛠️ Stabilisierung & UX-Verbesserungen (2026-02-10)
- **Admin-Navigation**: Die Admin-Krone im Header ist wieder sichtbar und führt erneut ins Adminpanel.
- **Suche repariert**: Die Notizsuche funktioniert wieder zuverlässig (SQL-Fehler in der Indexabfrage behoben).
- **„Zuletzt bearbeitet“ beschleunigt**:
  - Umstellung auf **indexbasierte** Auslieferung statt rekursivem Dateisystem-Scan.
  - Fallback-Merging aus bestehendem Suchindex.
  - Zusätzliche Pflege von Datei-Metadaten bei Listen-/Create-/Update-/Move-/Copy-/Delete-Operationen.
- **Gruppierung angepasst**: Statt „Älter“ werden ältere Einträge nun nach **Jahr** gruppiert (z. B. `2025`, `2024`).
- **Sidebar-Verhalten verbessert**:
  - Sidebar wird beim Einklappen nicht mehr unmontiert (State bleibt erhalten).
  - Ordnerpfad bleibt erhalten, Selektion bleibt sichtbar, bis die Notiz explizit geschlossen wird.
- **Kontextmenüs repariert**:
  - Rechtsklick/Longpress-Menüs (Sidebar + 3-Punkte im Header) reagieren wieder korrekt auf Aktionen.
- **Pfadauswahl gehärtet**:
  - „Neue Datei…“ nutzt jetzt Ordnernavigation statt freiem Zielpfad-Textfeld.
  - Wechsel des Ablagebereichs setzt den Zielordner auf den jeweiligen Bereichs-Start zurück.
  - Einstellungen verwenden nun Dropdown-/Navigationsauswahl für private/geteilte Pfade und Standardablage.
- **Bottom-Toolbar („Neu“) korrigiert**:
  - In „Zuletzt“ wird der Standardordner vorgeschlagen.
  - In „Ordner“ wird der aktuell geöffnete Ordnerpfad verwendet.

### ✅ Tests
- Backend: vollständige Jest-Suite erfolgreich (`12/12` Suites, `73/73` Tests).
- Frontend: Build (TypeScript + Vite) erfolgreich.
- Frontend: Vitest-Suite erfolgreich.

### ✨ Features
- **Notiz-/Dateiaktionen per Kontextmenü**:
  - Rechtsklick und Longpress in der Sidebar und im Notiz-Header
  - Aktionen: **Löschen**, **Kopieren**, **Verschieben**
  - Neuer Dialog für Copy/Move mit Zieltyp, Zielordner und Zielname
- **Neue Standardablage für Notizen pro Benutzer**:
  - Neue Benutzereinstellungen:
    - `default_note_type` (`private`/`shared`)
    - `default_note_folder_path`
    - `sidebar_view_mode` (`recent`/`folders`)
  - Startseite (`/notes`) bietet „Neue Notiz im Standardordner“
- **Sidebar-Ansicht „Zuletzt bearbeitet“ (umschaltbar)**:
  - Standardansicht gruppiert nach Zeiträumen (Heute, Gestern, letzte 7/30 Tage, älter)
  - Umschaltbar auf klassische Ordneransicht
  - Persistenz der Ansicht pro Benutzer
- **Datei-API erweitert**:
  - `GET /api/files/recent` für rekursive „zuletzt bearbeitet“-Listen
  - `POST /api/files/copy` für Datei-/Ordnerkopien
  - Verbesserter Move-Fallback bei Cross-Device-Moves (`EXDEV`)

### 🐛 Bugfixes
- **Erstell-Dialog (Neu/Ordner)** zeigt jetzt klar den Zielbereich und Zielordner an und erlaubt die Auswahl direkt im Dialog.
- **Pfad-/Einstellungsvalidierung** in den Settings wurde erweitert (inkl. Erstellung/Prüfung des Standardordners).

### ✅ Tests
- Neue Backend-Tests:
  - `file.service.copy-recent.test.ts`
  - `settings.service.defaults.test.ts`
- Neuer Frontend-Test:
  - `recentGrouping.test.ts`

### ✨ Features
- **Volltextsuche mit Index**: Hochperformante Index-basierte Suche
  - **10-100x schneller** als vorherige Dateisystem-Suche
  - **Fuzzy Search** mit Tippfehler-Toleranz (Levenshtein-Distanz ≤ 2)
  - **Automatische Indexierung** bei Datei-Operationen (create/update/delete/move)
  - **Parallele Indexierung** für bessere Performance (konfigurierbar)
  - **Relevanz-Scoring** für optimale Ergebnis-Sortierung
  - Unterstützt alle Markdown-Varianten (`.md`, `.markdown`, `.mdown`, `.mkd`, `.mkdn`, `.mkdown`, `.mdwn`, `.mdtxt`, `.mdtext`) und `.txt`
  - **Admin-Endpoints** für manuelle Re-Indexierung und Index-Statistiken
  - Invertierter Index mit Tokenisierung für schnelle Suche
  - Inkrementelle Updates (nur geänderte Dateien werden neu indexiert)
- **Admin-Panel**: Benutzerverwaltung für Administratoren
  - Benutzer erstellen, löschen, deaktivieren
  - Passwort zurücksetzen
  - Admin-Rechte verwalten
  - Benutzer-Status ändern

### 🐛 Bugfixes
- **Authentifizierung**: "Angemeldet bleiben" funktioniert jetzt korrekt
  - localStorage vs. sessionStorage abhängig von User-Wahl
  - Race Condition beim App-Start behoben
  - checkAuth() wird nur noch einmal pro Reload aufgerufen
  - Access Token (15 Min) wird automatisch durch Refresh Token (7 Tage) erneuert

### 🔧 Technische Details
- **Datenbankschema erweitert**:
  - `app_config` Tabelle für globale Konfiguration
  - `search_index` Tabelle für indexierte Dateien
  - `search_tokens` Tabelle für invertierten Index
  - Indizes für optimale Performance
- **Index-Service**:
  - Tokenisierung mit Unicode-Support (Umlaute)
  - Levenshtein-Distanz für Fuzzy Search
  - Content-Hash (SHA-256) für Änderungserkennung
  - Batch-Insert für Token-Performance
- **Rate Limiting**: Angepasst für Development und Production
  - Development: 20 Login-Versuche / 5 Minuten
  - Production: 5 Login-Versuche / 15 Minuten
- **Docker-Konfiguration**: Optimiert und vereinfacht
  - `.env.example` und `.env.production.example` Templates
  - Separate docker-compose.yml für Dev und Production
  - Test-Daten aus Repository entfernt
  - Entrypoint-Script verbessert (behandelt .env als Verzeichnis)

### ⚡ Performance
- **Volltextsuche**: 10-100x schneller durch Index-basierte Suche
  - Vorher: O(n) - jede Datei muss bei jeder Suche gelesen werden
  - Jetzt: O(log n) - Suche im Index, nur relevante Dateien werden geladen
  - Beispiel: 1000 Dateien - von ~30-60 Sekunden auf ~0.2-0.5 Sekunden

### 📚 Dokumentation
- **SEARCH_INDEX.md**: Vollständige Dokumentation der Index-Funktionalität
  - Technische Details
  - API-Dokumentation
  - Konfiguration
  - Troubleshooting

### Geplant für zukünftige Releases
- **Erweiterte Suche**: Phrasensuche, Wildcards, Boolesche Operatoren
- **Office-Dateien**: Optional `.docx`, `.pdf`, `.xlsx` indexieren
- Erweiterte Bibelstellen-Features (Vergleichsansicht, Vers-Notizen, erweiterte Versbereiche)
- LDAP/NAS-Integration (optional)
- Share-Links
- Tags & Kategorien
- Versionierung von Notizen

## [1.0.0] - 2025-12-14

### ✨ Features
- **Authentifizierung**: JWT-basierte Authentifizierung mit Refresh-Tokens
  - Login/Registrierung
  - "Angemeldet bleiben" Funktionalität
  - Automatische Token-Erneuerung
- **Notizen-Verwaltung**: Vollständige CRUD-Operationen für Notizen
  - Private und geteilte Ordner
  - Markdown-Editor mit Live-Vorschau
  - WYSIWYG-Editor (What You See Is What You Get)
  - Split-View (Editor + Vorschau)
  - Automatisches Speichern
  - Undo/Redo-Funktionalität
- **Bibelstellen-Integration**: Umfassende Bibelstellen-Funktionalität
  - Automatische Erkennung von Bibelstellen im Text
  - Hover-Tooltips mit Vers-Text
  - Interaktive Popups mit vollständigem Vers/Kapitel
  - Mehrere Übersetzungen unterstützt:
    - Luther 1912 (LUT1912)
    - Luther 1545 (LUT1545)
    - Elberfelder 1905 (ELB1905)
    - Schlachter 1951 (SCH1951)
    - Elberfelder (ELB) via API.Bible
  - Favoriten-System für Bibelübersetzungen
  - Standard-Übersetzung konfigurierbar
  - "In Notiz übernehmen" Funktionalität
  - Bibelstellen-Links in WYSIWYG-Editor
- **Export-Funktionen**: Export von Notizen in verschiedene Formate
  - PDF-Export (A4/A5)
  - Word-Dokument-Export (.docx)
  - Markdown-Export (.md)
  - Bibelstellen-Links in Exporten
- **Volltextsuche**: Durchsucht alle Notizen
  - Live-Suche mit Debouncing
  - Kontextuelle Treffer-Anzeige
  - Deep-Linking zu Ergebnissen
  - Erweiterte Treffer-Anzeige
- **Einstellungen**: Umfassende Konfigurationsmöglichkeiten
  - Theme-Auswahl (Hell/Dunkel)
  - Standard-Bibelübersetzung
  - Bibelübersetzungs-Favoriten
  - Export-Größe (A4/A5)
  - Ordner-Pfade konfigurierbar
- **PWA-Funktionalität**: Progressive Web App
  - Offline-Funktionalität
  - IndexedDB-Caching
  - Automatische Synchronisation
  - Offline-Indikator
- **Production-Features**: Enterprise-ready Features
  - Rate Limiting (Login, API, Export)
  - Strukturiertes Logging (Winston)
  - Log-Rotation (täglich, 30 Tage Retention)
  - Health-Check Endpoint
  - Prometheus Metrics
  - Log-Analyse
  - Erweiterte Tests (Unit + Integration)

### 🔧 Technische Details
- **Backend**: Node.js + Express + TypeScript
  - SQLite-Datenbank (better-sqlite3)
  - JWT-Authentifizierung
  - Argon2id Passwort-Hashing
  - Express Rate Limiting
  - Winston Logging
  - Prometheus Metrics
- **Frontend**: React + TypeScript + Vite
  - Zustand State Management
  - React Router
  - Markdown-Rendering (react-markdown)
  - WYSIWYG-Editor (contentEditable)
  - PWA-Support
- **Docker**: Multi-Stage Build
  - Production-optimiert
  - Alpine Linux
  - Puppeteer für PDF-Export

### 🐛 Bugfixes
- Korrigierte Bibelstellen-Erkennung für mehrstellige Kapitelnummern
- Behobene Deep-Linking-Probleme bei Suchergebnissen
- Korrigierte "Weitere Treffer" Funktionalität in Suche
- Behobene WYSIWYG-Editor Cursor-Position beim Einfügen
- Korrigierte "Angemeldet bleiben" Funktionalität
- Behobene Markdown-Export-Funktionalität

### 🔒 Sicherheit
- Path Traversal Prevention
- Input Validation
- Rate Limiting
- JWT Token Security
- Argon2id Passwort-Hashing

### 📚 Dokumentation
- Vollständige Architektur-Dokumentation (`ARCHITEKTUR_PLANUNG.md`)
- Deployment-Checkliste (`DEPLOYMENT_CHECKLISTE.md`)
- Monitoring-Setup (`MONITORING_SETUP.md`)
- Testing-Guide (`TESTING_GUIDE.md`)
- Production-Features Übersicht (`PRODUCTION_FEATURES_COMPLETE.md`)

### 🎨 UI/UX
- Responsive Design
- iPhone-Notes-App Philosophie
- Intuitive Navigation
- Keyboard Shortcuts
- Dark/Light Theme

---

## Versionierungs-Schema

Wir folgen [Semantic Versioning](https://semver.org/lang/de/):

- **MAJOR** (X.0.0): Breaking Changes
- **MINOR** (0.X.0): Neue Features (rückwärtskompatibel)
- **PATCH** (0.0.X): Bugfixes (rückwärtskompatibel)

### Kategorien

- **✨ Features**: Neue Funktionalitäten
- **🐛 Bugfixes**: Fehlerbehebungen
- **🔒 Sicherheit**: Sicherheitsrelevante Änderungen
- **🔧 Technische Details**: Technische Verbesserungen
- **📚 Dokumentation**: Dokumentations-Updates
- **🎨 UI/UX**: UI/UX-Verbesserungen
- **♻️ Refactoring**: Code-Verbesserungen ohne Funktionsänderung
- **⚡ Performance**: Performance-Verbesserungen
- **🗑️ Deprecated**: Veraltete Features

---

## Release-Prozess

### Vor einem Release

1. **CHANGELOG.md aktualisieren**
   - Alle Änderungen seit letztem Release dokumentieren
   - Version und Datum setzen
   - Kategorien korrekt zuordnen

2. **Version in package.json aktualisieren**
   - Root `package.json`
   - `backend/package.json`
   - `frontend/package.json`

3. **Tests ausführen**
   ```bash
   npm test
   ```

4. **Build testen**
   ```bash
   npm run build
   ```

5. **Git-Tag erstellen**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

6. **Release-Notes erstellen**
   - GitHub Release (falls verwendet)
   - Zusammenfassung der wichtigsten Änderungen

### Nach einem Release

1. **Neue "Unreleased" Sektion in CHANGELOG.md**
2. **Version in package.json erhöhen** (z.B. 1.0.1 für Patch)

---

## Historische Releases

*(Wird mit jedem Release aktualisiert)*
