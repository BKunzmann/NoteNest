# Status der Architektur-Planung

**Letzte Aktualisierung**: 2024

## ✅ Vollständig implementiert

### 1. Authentifizierung (Basis)
- ✅ Lokale Benutzerverwaltung (Registrierung, Login)
- ✅ Passwort-Hashing mit Argon2id
- ✅ JWT-Token-System (Access + Refresh Tokens)
- ✅ Token-Refresh-Mechanismus
- ✅ "Angemeldet bleiben" Funktionalität
- ✅ Auth-Modus-Abfrage (`/api/auth/mode`)
- ✅ Datenbank-Schema: `auth_type`, `auth_source` Felder vorhanden
- ✅ Session-Management (`sessions` Tabelle)

### 2. Dateiverwaltung
- ✅ CRUD-Operationen (Create, Read, Update, Delete)
- ✅ Ordner erstellen/löschen
- ✅ Dateien verschieben/umbenennen
- ✅ Pfadvalidierung (Path-Traversal-Schutz)
- ✅ Private & Geteilte Ordner (`type: 'private' | 'shared'`)
- ✅ Dateisystem-Berechtigungen werden respektiert
- ✅ Unterstützung bereits vorhandener Dateien
- ✅ Dateityp-Erkennung (bearbeitbar vs. read-only)
- ✅ Deep-Linking (`/notes/:type/:path/*`)
- ✅ URL-basierte Dateizugriffe mit Backend-Validierung

### 3. Bibelstellen-Referenzen
- ✅ Automatische Erkennung von Bibelstellen in Markdown
- ✅ Hover-Tooltip mit Vers-Text
- ✅ Popup mit vollständigem Vers/Kapitel
- ✅ Übersetzungswechsel im Popup
- ✅ Lokale Public-Domain-Übersetzungen (LUT1912, LUT1545, ELB1905, SCH1951)
- ✅ Bibelstellen-Favoriten-Verwaltung
- ✅ Standard-Übersetzung (immer oben in Favoriten)
- ✅ "In Notiz übernehmen" Funktionalität
- ✅ Datenbank-Schema: `bible_verses`, `user_bible_favorites`, `bible_cache`
- ✅ API.Bible Integration (`bibleApi.service.ts`)
- ✅ Bible SuperSearch API als Fallback
- ✅ API-Caching mit TTL
- ✅ Verfügbare Übersetzungen werden dynamisch geladen (lokal + API)
- ✅ Bibelstellen in WYSIWYG-Editor funktionieren
- ✅ Bibelstellen in Export (PDF/Word) integriert

### 4. PDF-Export
- ✅ Puppeteer-Integration
- ✅ Markdown-zu-HTML-Konvertierung
- ✅ A4/A5-Format-Unterstützung
- ✅ Professionelle CSS-Formatierung
- ✅ API-Endpoint: `/api/export/pdf`
- ✅ Frontend-Integration (Bottom Toolbar)
- ✅ Bibelstellen-Links im PDF

### 5. Word-Export
- ✅ `docx` Library Integration
- ✅ Markdown-zu-DOCX-Konvertierung
- ✅ API-Endpoint: `/api/export/word`
- ✅ Frontend-Integration (Bottom Toolbar)
- ✅ Bibelstellen-Links im Word-Dokument

### 6. Markdown-Export
- ✅ Direkter Download als `.md` Datei
- ✅ Frontend-Integration (Bottom Toolbar)

### 7. PWA (Vollständig)
- ✅ Manifest.json vorhanden
- ✅ VitePWA Plugin konfiguriert
- ✅ Service Worker wird generiert (durch VitePWA)
- ✅ Icons vorhanden
- ✅ Installierbarkeit möglich
- ✅ **Offline-Funktionalität vollständig implementiert**:
  - ✅ IndexedDB-Integration für lokales Caching (`offlineStorage.ts`)
  - ✅ Sync-Logik beim Wieder-Online-Gehen (`syncService.ts`)
  - ✅ Erweiterte Caching-Strategien (NetworkFirst für API, CacheFirst für statische Ressourcen)
  - ✅ Offline-Indikator in der UI (`OfflineIndicator.tsx`)
  - ✅ Automatisches lokales Speichern bei Offline-Modus
  - ✅ Sync-Queue für ausstehende Änderungen
  - ✅ Auto-Save funktioniert im Hintergrund (silent)

### 8. Volltextsuche
- ✅ Volltextsuche über alle Notizen (private + shared)
- ✅ Such-API-Endpoint (`/api/search`)
- ✅ Frontend-Suchkomponente (`SearchBar.tsx`) mit Dropdown-Ergebnissen
- ✅ Suche in Header integriert
- ✅ Relevanz-basierte Sortierung
- ✅ Zeilen-Kontext in Suchergebnissen
- ✅ Keyboard-Navigation (Pfeiltasten, Enter, Escape)
- ✅ Erweiterte Ergebnisse ("X weitere Treffer")
- ✅ Deep-Linking zu Suchergebnissen

### 9. Editor
- ✅ Markdown-Editor mit Live-Vorschau
- ✅ Split-View (Editor + Vorschau)
- ✅ WYSIWYG-Editor (`WysiwygEditor.tsx`)
- ✅ WYSIWYG als Standard-Ansicht
- ✅ Toolbar mit Formatierungs-Buttons
- ✅ Auto-Save (silent, im Hintergrund)
- ✅ Undo/Redo Funktionalität
- ✅ Bibelstellen-Erkennung in allen Modi (Editor, Split, WYSIWYG, Preview)
- ✅ Bibelstellen-Links funktionieren in WYSIWYG (Hover + Klick)

### 10. Einstellungen
- ✅ Settings-Seite
- ✅ Basisordner konfigurieren (privat & geteilt)
- ✅ Theme-Auswahl (Light/Dark)
- ✅ Standard Bibel-Übersetzung
- ✅ Bibelübersetzungs-Favoriten verwalten
- ✅ Export-Größe (A4/A5)
- ✅ Sticky Success/Error-Messages
- ✅ Automatisches Hinzufügen der Standard-Übersetzung zu Favoriten

### 11. Frontend-Architektur
- ✅ React + TypeScript
- ✅ Zustand für State Management
- ✅ React Router für Navigation
- ✅ API-Client mit Axios
- ✅ Error-Handling
- ✅ Responsive Design
- ✅ iPhone-Notes-App Design-Philosophie
- ✅ Komponenten-Struktur (Layout, Editor, FileManager, Auth, Settings)

### 12. Backend-Architektur
- ✅ Node.js + Express + TypeScript
- ✅ SQLite-Datenbank
- ✅ RESTful API
- ✅ Middleware (Auth, Error-Handling)
- ✅ Service-Layer-Architektur
- ✅ Controller-Service-Pattern
- ✅ Route-Organisation

### 13. Docker & Deployment
- ✅ Dockerfile (Multi-Stage Build)
- ✅ docker-compose.yml für Production
- ✅ docker-compose.dev.yml für Development
- ✅ Volume-Mounts konfiguriert
- ✅ Environment-Variablen über `.env`

### 14. Datenbank-Schema
- ✅ `users` Tabelle (mit `auth_type`, `auth_source`)
- ✅ `user_settings` Tabelle
- ✅ `user_bible_favorites` Tabelle
- ✅ `sessions` Tabelle
- ✅ `bible_verses` Tabelle
- ✅ `bible_cache` Tabelle
- ✅ `file_metadata` Tabelle
- ✅ Indizes für Performance

### 15. Sicherheit
- ✅ Pfadvalidierung (Path-Traversal-Schutz)
- ✅ JWT-Token-Validierung
- ✅ Passwort-Hashing (Argon2id)
- ✅ Input-Validierung
- ✅ URL-basierte Zugriffe werden validiert
- ✅ Dateisystem-Berechtigungen werden respektiert

---

## ⚠️ Teilweise implementiert / Verbesserungsbedarf

### 1. Rate Limiting
**Status**: Nicht implementiert
- ❌ Login-Versuche: 5 pro 15 Minuten pro IP
- ❌ API-Calls: 100 pro Minute pro User
- ❌ PDF-Export: 10 pro Stunde pro User

**Priorität**: Mittel (für Production wichtig)

### 2. Logging & Monitoring
**Status**: Basis vorhanden
- ✅ Console-Logging
- ❌ Strukturiertes Logging (Winston)
- ❌ Log-Rotation
- ❌ Health-Check-Endpoint (`/api/health`)
- ❌ Metriken (Prometheus)

**Priorität**: Mittel (für Production wichtig)

### 3. Testing
**Status**: Nicht implementiert
- ❌ Unit-Tests
- ❌ Integration-Tests
- ❌ E2E-Tests
- ❌ Test-Coverage

**Priorität**: Mittel (für Code-Qualität wichtig)

### 4. Code-Qualität
**Status**: Gut, aber verbesserungsfähig
- ✅ Klare Struktur
- ✅ TypeScript-Typisierung
- ⚠️ JSDoc-Kommentare fehlen teilweise
- ⚠️ Code-Review-Prozess nicht etabliert

**Priorität**: Niedrig (kontinuierliche Verbesserung)

---

## ❌ Noch nicht implementiert

### 1. LDAP/NAS-Integration
**Status**: Datenbank-Schema vorhanden, aber keine Implementierung
- ✅ Datenbank-Schema: `auth_type`, `auth_source` Felder vorhanden
- ✅ `.env` Variablen für LDAP-Konfiguration vorhanden
- ❌ Keine LDAP-Authentifizierung implementiert
- ❌ Keine Synology-spezifische Integration
- ❌ Kein Hybrid-Modus (LDAP + lokale Auth)

**Benötigt**:
- `ldapjs` Package installieren (bereits in package.json, aber nicht verwendet)
- LDAP-Service implementieren (`backend/src/services/ldap.service.ts`)
- Login-Flow erweitern (LDAP-Fallback)
- Benutzer-Synchronisation (optional)

**Priorität**: Niedrig (nur wenn NAS-Integration gewünscht)

### 2. Share-Links
**Status**: Nicht im MVP geplant
- ❌ Keine Share-Link-Generierung
- ❌ Keine Token-basierte Freigabe
- ❌ Keine temporären Zugriffslinks

**Priorität**: Niedrig (zukünftige Erweiterung)

### 3. Tags & Kategorien
**Status**: Nicht implementiert
- ❌ Keine Tag-Verwaltung
- ❌ Keine Kategorisierung
- ❌ Keine Filterung nach Tags

**Priorität**: Niedrig (zukünftige Erweiterung)

### 4. Versionierung
**Status**: Nicht implementiert
- ❌ Keine Versionshistorie
- ❌ Keine Git-ähnliche Versionskontrolle
- ❌ Keine Wiederherstellung alter Versionen

**Priorität**: Niedrig (zukünftige Erweiterung)

### 5. Erweiterte Bibelstellen-Features
**Status**: Basis vorhanden, Erweiterungen fehlen
- ✅ Basis-Funktionalität vorhanden
- ❌ Vergleichsansicht (mehrere Übersetzungen nebeneinander)
- ❌ Konkordanz (Suche nach Wörtern)
- ❌ Studien-Tools (Kommentare, Querverweise)
- ❌ Lesepläne
- ❌ Notizen zu Versen

**Priorität**: Niedrig (zukünftige Erweiterung)

### 6. Passwort ändern
**Status**: API-Endpoint fehlt
- ❌ `PUT /api/auth/password` nicht implementiert
- ❌ Frontend-UI fehlt

**Priorität**: Niedrig (kann über Registrierung/Login umgangen werden)

---

## 📋 Zusammenfassung

### ✅ MVP-Ready (Kernfunktionalität vollständig)
- ✅ Multi-User-System
- ✅ Private & Geteilte Ordner
- ✅ Markdown-Editor (mit WYSIWYG)
- ✅ Bibelstellen-Referenzen (vollständig)
- ✅ PDF/Word/Markdown-Export
- ✅ Einstellungen
- ✅ Volltextsuche
- ✅ PWA mit Offline-Funktionalität
- ✅ Docker-Deployment

### ⚠️ Für Production empfohlen
- ⚠️ Rate Limiting
- ⚠️ Strukturiertes Logging
- ⚠️ Health-Check-Endpoint
- ⚠️ Testing (Unit, Integration, E2E)

### ❌ Optionale Erweiterungen
- ❌ LDAP/NAS-Integration
- ❌ Share-Links
- ❌ Tags & Kategorien
- ❌ Versionierung
- ❌ Erweiterte Bibelstellen-Features

---

## 📊 Fortschritt

### Gesamt-Fortschritt: ~85%

**Kernfunktionalität**: ✅ 100% (MVP vollständig)
**PWA & Offline**: ✅ 100%
**Bibelstellen**: ✅ 100%
**Export**: ✅ 100% (PDF, Word, Markdown)
**Suche**: ✅ 100%
**Editor**: ✅ 100% (Markdown + WYSIWYG)

**Production-Ready**: ⚠️ 70%
- Fehlt: Rate Limiting, Logging, Testing

**Optionale Features**: ❌ 0%
- LDAP, Share-Links, Tags, Versionierung

---

## 🎯 Empfohlene nächste Schritte

### Für Production (Priorität: Hoch)
1. **Rate Limiting implementieren**
   - Express Rate Limit Middleware
   - Login-Versuche limitieren
   - API-Calls limitieren

2. **Strukturiertes Logging**
   - Winston integrieren
   - Log-Rotation einrichten
   - Log-Levels konfigurieren

3. **Health-Check-Endpoint**
   - `/api/health` implementieren
   - Datenbank-Status prüfen
   - System-Informationen zurückgeben

4. **Testing einrichten**
   - Jest konfigurieren
   - Unit-Tests für kritische Funktionen (Pfadvalidierung, Auth)
   - Integration-Tests für API-Endpoints

### Optionale Erweiterungen (Priorität: Niedrig)
1. **LDAP/NAS-Integration** (nur wenn benötigt)
2. **Passwort ändern** Feature
3. **Share-Links** (zukünftige Erweiterung)
4. **Tags & Kategorien** (zukünftige Erweiterung)
5. **Versionierung** (zukünftige Erweiterung)

---

## 📝 Notizen

- **WYSIWYG-Editor**: Vollständig implementiert und als Standard gesetzt
- **Auto-Save**: Funktioniert silent im Hintergrund, ohne Undo/Redo zu beeinträchtigen
- **Bibelstellen-API**: API.Bible Integration vorhanden, aber nur ältere Übersetzungen verfügbar (keine modernen wie HFA, NGÜ)
- **Offline-Funktionalität**: Vollständig implementiert mit IndexedDB und Sync-Mechanismus
- **Volltextsuche**: Vollständig implementiert mit Relevanz-Sortierung und Deep-Linking
