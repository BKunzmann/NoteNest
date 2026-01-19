# NoteNest

Persönliche Notizen-App mit Bibelstellen-Referenzen, Multi-User-Support und NAS-Integration.

[![GitHub release](https://img.shields.io/github/release/BKunzmann/NoteNest.svg)](https://github.com/BKunzmann/NoteNest/releases/latest)
[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](LICENSE)

## Features

- 📝 **Markdown-Editor** mit Live-Vorschau und WYSIWYG-Modus
- 📖 **Bibelstellen-Integration** - Automatische Erkennung und interaktive Popups
- 👥 **Multi-User-System** mit sicherer JWT-Authentifizierung
  - "Angemeldet bleiben" Funktionalität (7 Tage Gültigkeit)
  - Automatische Token-Erneuerung
  - Rate Limiting zum Schutz vor Brute-Force-Angriffen
- 🔐 **Admin-Panel** - Benutzerverwaltung für Administratoren
- 📁 **Private und geteilte Ordner** mit NAS-Integration
- 🐳 **Docker-Deployment** für NAS/Server (Synology, QNAP)
- 📱 **PWA-Support** - Offline-Funktionalität
- 📄 **PDF-Export** (A4/A5, Word, Markdown)

## Schnellstart

### Voraussetzungen

- Node.js 18+ und npm
- Docker Desktop
- Git

### Installation

1. Repository klonen:
```bash
git clone https://github.com/BKunzmann/NoteNest.git
cd NoteNest
```

2. Umgebungsvariablen konfigurieren:
```bash
# Automatisch (empfohlen)
./scripts/setup-env.sh  # Linux/Mac
# oder
powershell -ExecutionPolicy Bypass -File .\scripts\setup-env.ps1  # Windows

# Oder manuell
cp .env.example .env
# .env bearbeiten und API-Keys eintragen
# JWT-Secrets werden automatisch generiert (beim ersten Docker-Start)
```

3. Dependencies installieren:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

4. Entwicklung starten:
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

### Docker-Entwicklung

```bash
docker-compose -f docker-compose.dev.yml up
```

**Hinweis:** JWT-Secrets werden beim ersten Start automatisch generiert, falls sie in `.env` fehlen.

### Production Build & Deployment

```bash
# Build
docker build -t notenest:latest .

# Oder mit docker-compose
docker-compose build

# Start
docker-compose up -d
```

### NAS Deployment (Synology, QNAP, TrueNAS)

NoteNest kann auf verschiedenen NAS-Systemen deployed werden:

**Schnellstart:**
```bash
# 1. Beispiel-Konfiguration kopieren
cp docker-compose.synology.example.yml docker-compose.yml

# 2. Environment-Variablen aus docs/ENV_EXAMPLES.md kopieren
nano .env  # JWT-Secrets generieren!

# 3. Container starten
docker-compose up -d
```

**Ausführliche Anleitung:** Siehe [NAS Setup Guide](docs/NAS_SETUP_GUIDE.md)

#### Wichtige Konzepte:

1. **Private Ordner:** Jeder User sieht sein NAS-Home-Verzeichnis
   - Synology: `/volume1/homes/username/`
   - Automatisch als "Privat (username)" in NoteNest

2. **Shared-Ordner:** Admin kann mehrere Shared-Ordner freigeben
   - Beispiel: Familie, Projekte, Arbeit
   - Admin entscheidet, welcher User welche Shared-Ordner sieht
   - NAS-Permissions werden respektiert

3. **Pfad-Konfiguration:**
   - `docker-compose.yml`: Mountet NAS-Pfade IN den Container
   - `.env`: Definiert Pfade INNERHALB des Containers

Siehe auch:
- [ENV_EXAMPLES.md](docs/ENV_EXAMPLES.md) - Environment-Variablen Beispiele
- [NAS_SETUP_GUIDE.md](docs/NAS_SETUP_GUIDE.md) - Schritt-für-Schritt Setup
- [DEPLOYMENT_MODES.md](docs/DEPLOYMENT_MODES.md) - Deployment-Modi erklärt

**Hinweis:** Beim ersten Start auf der NAS werden JWT-Secrets automatisch generiert.

## Dokumentation

- **Authentifizierung**: [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) - Login, "Angemeldet bleiben", Token-Management
- **Architektur**: [ARCHITEKTUR_PLANUNG.md](./ARCHITEKTUR_PLANUNG.md) - Vollständige System-Dokumentation
- **Deployment**: [DEPLOYMENT_ANLEITUNG.md](./DEPLOYMENT_ANLEITUNG.md) - Installation auf NAS/Server
- **Reverse Proxy**: [REVERSE_PROXY.md](./REVERSE_PROXY.md) - HTTPS-Setup für externe Erreichbarkeit
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md) - Versionshistorie
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - Problemlösungen
- **AI-Instructions**: [instructions.md](./instructions.md) - Für Entwickler

## Releases

- **Aktuelle Version**: [v1.0.0](https://github.com/BKunzmann/NoteNest/releases/tag/v1.0.0) - Initial Release
- Alle Releases: [GitHub Releases](https://github.com/BKunzmann/NoteNest/releases)

## Lizenz

[Lizenz hier eintragen]

