# NoteNest

Persönliche Notizen-App mit Bibelstellen-Referenzen, Multi-User-Support und NAS-Integration.

## Features

- 📝 Markdown-Editor mit Live-Vorschau
- 📖 Automatische Bibelstellen-Erkennung und -Referenzen
- 👥 Multi-User-System mit Authentifizierung
- 📁 Private und geteilte Ordner
- 🐳 Docker-Deployment für NAS/Server
- 📱 PWA-Support (Progressive Web App)
- 📄 PDF-Export (A4/A5)

## Schnellstart

### Voraussetzungen

- Node.js 18+ und npm
- Docker Desktop
- Git

### Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd NotizenApp
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

### NAS Deployment

```bash
# Auf der NAS ausführen
./scripts/deploy-nas.sh  # Linux/Mac
# oder
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-nas.ps1  # Windows
```

**Hinweis:** Beim ersten Start auf der NAS werden JWT-Secrets automatisch generiert.

## Dokumentation

- Vollständige Architektur-Dokumentation: [ARCHITEKTUR_PLANUNG.md](./ARCHITEKTUR_PLANUNG.md)
- Reverse Proxy Setup (für externe Erreichbarkeit): [REVERSE_PROXY.md](./REVERSE_PROXY.md)
- Deployment-Anleitung: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Lizenz

[Lizenz hier eintragen]

