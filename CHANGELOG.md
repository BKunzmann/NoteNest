# Changelog

Alle wichtigen Änderungen in diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

Zum Release-Prozess und zur Versionsverwaltung siehe [`VERSIONIERUNG.md`](VERSIONIERUNG.md).

## [Unreleased]

### Geplant
- Erweiterte Suche (Phrasen, Wildcards, Boolesche Operatoren)
- Optional Office-Dateien indexieren (`.docx`, `.pdf`, `.xlsx`)
- Erweiterte Bibelstellen-Features, LDAP/NAS, Share-Links, Tags, Notiz-Versionierung

## [1.4.1] - 2026-08-05

### 🐛 Bugfixes
- Backend-Build: implizite `any`-Typen in `bibleApi.service.ts` behoben (CI/Docker)

## [1.4.0] - 2026-08-05

### ✨ Features
- **API.Bible-Integration**: Dynamischer Übersetzungskatalog von `https://rest.api.bible`
  - Sprachfilter und Auswahl der Übersetzung in den Einstellungen
  - Vers-/Kapitelabruf über API-Passages neben lokalen Bibeln
  - Konfiguration über `BIBLE_API_KEY`, `BIBLE_API_ENABLED`, `BIBLE_API_URL`
- **Lokale Bibel-DB**: Auto-Import lokaler Bibeln, Admin-Hebel für Neuimport und Status
- **Papierkorb**: Globale Trash-Dialoge, Wiederherstellung und erweiterte Trash-Aktionen
- **Sidebar**: Einheitliche Aktionen, resizebare Sidebar, stabileres Refresh-/Loading-Verhalten

### ⚡ Performance
- Trägheit bei vielen Notizen behoben (Recent-Limit, längeres Poll-Intervall, begrenzte Stats)
- Suche mit LIMIT und max. ~50 Ergebnissen
- Debounced Undo-Historie und Offline-Pending-Dedupe
- Geteilter Cache für Bibel-Übersetzung/Settings; Autosave ~4s
- Weniger teure Listen: kein Folder-`listFiles` im Recent-Modus, günstigeres `listDirectory`
- Zustand-Selektoren, memoisiertes `FileItem`, begrenzte Recent-Gruppen
- Debounced Suchindex-Updates nach Save (~8s)

### 🐛 Bugfixes
- TypeScript: `nameLocal` in Settings-Übersetzungsauswahl korrekt typisiert (Frontend-Build)

### 🔧 Technische Details
- Setup-Branches nach `master` zusammengeführt (`AGENTS.md`, Vite/`import.meta.env`, `.gitignore`)
- Docker-Workflow nur noch bei Tags `v*` und `workflow_dispatch` (nicht bei jedem master-Push)
- CHANGELOG bereinigt und historische Releases 1.0.0–1.3.2 zugeordnet

## [1.3.2] - 2026-02-24

### 🎨 UI/UX
- Editor-Toolbar: Bezeichnungen `Aa` und `Listen` wieder im jeweiligen Auswahlfeld
- Sidebar global vereinheitlicht: `Nur Notizen / Alle Dateien` und Filter steuern private + geteilte Ansicht
- Filter berücksichtigt Dateinamen und Ordnernamen
- Sidebar aktualisiert sich zyklisch; Metadaten-Refresh auch bei aktivem Notizen-Filter
- Index-Status und optionale Server-Auslastung im User-Menü
- Papierkorb mit Wiederherstellung; resizebare Sidebar; Notiz-Auto-Umbenennung

### ✨ Features
- Zentrale Suche relevanter und schneller (Dateinamen-Priorität, begrenzte Kontext-Matches)
- Re-Indexierung direkt aus dem User-Menü anstoßbar

### ✅ Tests
- Backend Jest-Suite und Frontend Vitest erfolgreich; Builds erfolgreich

## [1.3.1] - 2026-02-16

### 🎨 UI/UX
- Automatische Listen-Erkennung im WYSIWYG in der Toolbar ein-/ausschaltbar
- Listen-Auswahl mit definierten Zwischenstufen (Ebene 1/2)

### 🐛 Bugfixes
- Bibel-Tooltip: leere Antworten und Fehlertexte nutzerfreundlich normalisiert
- Markdown-Editor: Übersetzungs-Codes normalisiert, Fallback `LUT1912`

### 🔧 Technische Details
- Projektversion auf `1.3.1` synchronisiert (Root, Backend, Frontend, `version.ts`)

## [1.3.0] - 2026-02-10

### 🎨 UI/UX
- Header: kein `0`-Artefakt mehr bei Nicht-Admins statt der Admin-Krone
- Version & Autor im Benutzer-Menü (`vX.Y.Z · © C-Autor`)
- Editor: zuverlässiges Auto-Save inkl. Flush; Undo/Redo bleibt verfügbar
- Toolbar auf kleinen Bildschirmen kompakter (scrollbar)
- „Zuletzt“-Gruppierung: Letzte 7/30 Tage und Jahre
- Ordnernavigation: stufenweise Rücknavigation (Breadcrumb + Zurück)
- Vorgeschlagener Dateiname: `YYYY-MM-DD Neu`
- Suche: Verlauf, Feld leeren per `×`, bessere Mobile-Darstellung

### 🐛 Bugfixes
- Copy/Move über FolderNavigator; Konflikt-Fallback (` (1)`, ` (2)`, …)
- Nur-Notizen-Filter zeigt Ordner mit enthaltenen Notizen
- Bibelstellen: API respektiert übergebene Übersetzung; WYSIWYG-Popup öffnet korrekt erneut

### ⚡ Performance
- Candidate-Merging aus `file_metadata` + `search_index` mit Existenzprüfung
- Schnellere Bereinigung veralteter Indexeinträge; optionaler Metadata-Refresh

## [1.2.0] - 2026-02-10

### 🐛 Bugfixes
- Admin-Navigation (Krone) wieder sichtbar und funktionsfähig
- Notizsuche repariert (SQL-Fehler in der Indexabfrage)
- Kontextmenüs (Rechtsklick/Longpress) reagieren wieder korrekt
- Bottom-Toolbar „Neu“: Standardordner in „Zuletzt“, aktueller Ordner in Ordneransicht

### ⚡ Performance
- „Zuletzt bearbeitet“ indexbasiert statt rekursivem Dateisystem-Scan
- Metadaten-Pflege bei Listen-/Create-/Update-/Move-/Copy-/Delete

### 🎨 UI/UX
- Ältere Einträge nach Jahr gruppiert
- Sidebar behält State beim Einklappen; Selektion bleibt bis zum Schließen der Notiz
- Pfadauswahl gehärtet (FolderNavigator statt Freitext in Dialogen und Settings)

## [1.1.0] - 2026-02-09

### ✨ Features
- Notiz-/Dateiaktionen per Kontextmenü (Löschen, Kopieren, Verschieben)
- Standardablage pro Benutzer (`default_note_type`, `default_note_folder_path`, `sidebar_view_mode`)
- Sidebar-Ansicht „Zuletzt bearbeitet“ (umschaltbar zur Ordneransicht)
- Datei-API: `GET /api/files/recent`, `POST /api/files/copy`, robuster Move bei `EXDEV`
- Index-basierte Volltextsuche mit Fuzzy Search (Levenshtein ≤ 2)
- Automatische Indexierung, Relevanz-Scoring, Admin-Endpoints für Re-Index und Stats
- Versteckte Ordner (Hidden Folders)
- Admin-Panel: Benutzerverwaltung (erstellen, löschen, deaktivieren, Passwort, Rechte)

### 🐛 Bugfixes
- Erstell-Dialog zeigt Zielbereich/-ordner klar und erlaubt Auswahl
- Pfad-/Einstellungsvalidierung inkl. Standardordner
- „Angemeldet bleiben“: Storage und Token-Erneuerung korrigiert
- Build-/CI-Stabilisierung (Frontend `import.meta.env`, Admin/Index-Services, `api.ts`)

### 🔧 Technische Details
- Schema: `app_config`, `search_index`, `search_tokens`
- Rate Limiting für Dev/Production angepasst
- Docker-Konfiguration vereinfacht (`.env`-Templates, Compose)

### ⚡ Performance
- Volltextsuche deutlich schneller durch Index statt Dateisystem-Scan

### 📚 Dokumentation
- `SEARCH_INDEX.md` für Index-Funktionalität

### ✅ Tests
- Backend: `file.service.copy-recent`, `settings.service.defaults`
- Frontend: `recentGrouping.test.ts`

## [1.0.0] - 2025-12-14

### ✨ Features
- JWT-Authentifizierung mit Refresh-Tokens, Login/Registrierung, „Angemeldet bleiben“
- Notizen-CRUD: private/geteilte Ordner, Markdown-, WYSIWYG- und Split-View-Editor
- Auto-Save, Undo/Redo
- Bibelstellen: Erkennung, Hover-Tooltips, Popups, lokale Übersetzungen und Favoriten
- Export: PDF (A4/A5), Word (`.docx`), Markdown
- Volltextsuche mit Live-Suche, Kontext und Deep-Linking
- Einstellungen: Theme, Bibelübersetzung, Export-Größe, Ordnerpfade
- PWA: Offline, IndexedDB-Caching, Sync
- Production: Rate Limiting, Winston-Logging, Health-Check, Prometheus, Tests

### 🔧 Technische Details
- Backend: Node.js, Express, TypeScript, SQLite, Argon2id
- Frontend: React, TypeScript, Vite, Zustand
- Docker Multi-Stage Build (Alpine, Puppeteer für PDF)

### 🐛 Bugfixes
- Bibelstellen mit mehrstelligen Kapitelnummern
- Deep-Linking und „Weitere Treffer“ in der Suche
- WYSIWYG-Cursor beim Einfügen
- „Angemeldet bleiben“ und Markdown-Export

### 🔒 Sicherheit
- Path Traversal Prevention, Input Validation, Rate Limiting, JWT, Argon2id

### 📚 Dokumentation
- Architektur, Deployment, Monitoring, Testing, Production-Features

### 🎨 UI/UX
- Responsive Design, iPhone-Notes-Philosophie, Dark/Light Theme, Shortcuts
