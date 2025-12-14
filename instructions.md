# Projekt-Instructions für AI-Coding-Agents

## Architektur & Datenfluss

- **Monorepo-Struktur**: Root-Workspace mit `backend/` und `frontend/` Workspaces (`package.json` workspaces)
- **Backend** (`backend/src/`): Express.js + TypeScript, SQLite (better-sqlite3), JWT-Auth
  - Layering: `routes/` → `controllers/` → `services/` → `config/database.ts`
  - Middleware: `auth.middleware.ts`, `rateLimit.middleware.ts`, `metrics.middleware.ts`
  - Logging: Winston mit täglicher Rotation (`config/logger.ts`), strukturierte JSON-Logs in `logs/`
  - Metrics: Prometheus-Metriken via `/api/metrics` (`config/metrics.ts`)
- **Frontend** (`frontend/src/`): React + TypeScript, Vite, Zustand für State-Management
  - Struktur: `components/`, `pages/`, `services/`, `store/`, `utils/`
  - PWA: Service Worker via `vite-plugin-pwa`, Offline-Support (`services/offlineStorage.ts`)
  - API-Client: `services/api.ts` mit Axios, automatische Token-Erneuerung
- **Datenbank**: SQLite in `data/database/notenest.db` (Development) oder `/data/database/notenest.db` (Production)
- **Dateisystem**: Notizen als `.md`-Dateien in `data/users/{username}/` (private) oder `data/shared/` (shared)
- **Bibelstellen**: Lokale JSON-Dateien in `data/bibles/` + API.Bible-Integration (`services/bibleApi.service.ts`)

## Entwickler-Workflows

- **Setup**: `npm install` (Root installiert beide Workspaces), dann `.env` aus `.env.example` erstellen
- **Development**: `npm run dev` (startet Backend + Frontend via concurrently)
  - Backend: `cd backend && npm run dev` (tsx watch auf Port 3000)
  - Frontend: `cd frontend && npm run dev` (Vite auf Port 5173, Proxy zu `/api`)
- **Build**: `npm run build` (baut beide Workspaces: `tsc` für Backend, `tsc && vite build` für Frontend)
- **Test**: `npm run test` (Jest für Backend, Vitest für Frontend)
  - Backend: `backend/jest.config.js`, Tests in `backend/src/tests/` (unit/integration)
  - Frontend: `frontend/vite.config.ts` mit Vitest, Tests in `frontend/src/**/*.test.ts`
- **Versionierung**: `npm run version:get|set|bump|release` (via `scripts/version.js`)
  - Aktualisiert `package.json` (Root, Backend, Frontend), `config/version.ts` (beide), `CHANGELOG.md`
- **Docker**: `docker-compose -f docker-compose.dev.yml up` (Development), `docker-compose -f docker-compose.prod.yml up` (Production)

## Konventionen & Patterns

- **TypeScript**: Strict mode (`strict: true`), `noUnusedLocals`, `noUnusedParameters` aktiviert
- **Backend-Namensgebung**: `kebab-case` für Dateien, `camelCase` für Funktionen, `PascalCase` für Klassen/Interfaces
- **Frontend-Namensgebung**: `PascalCase` für Komponenten (`.tsx`), `camelCase` für Hooks/Utils
- **Error Handling**: Try/catch in Controllern, `logError()` für strukturierte Fehlerlogs, HTTP-Status-Codes (404/403/500)
- **Logging**: `logInfo()`, `logError()`, `logWarn()`, `logDebug()` aus `config/logger.ts` (nicht `console.log` in Production-Code)
- **Pfadvalidierung**: Immer `resolveUserPath()` aus `services/file.service.ts` verwenden (Path-Traversal-Schutz)
- **Auth**: JWT-Tokens via `auth.middleware.ts`, `req.user` enthält `{ id, username }` nach Authentifizierung
- **Rate Limiting**: `apiLimiter` global auf `/api`, spezifische Limiter für `/api/auth/login` und `/api/auth/register`
- **Unused Imports/Variablen**: Mit `_` prefixen (z.B. `_unused`) oder entfernen (TypeScript-Fehler vermeiden)

## Integrationen

- **Authentifizierung**: JWT (Access + Refresh Tokens), Argon2id für Passwort-Hashing (`services/auth.service.ts`)
- **Bibelstellen-API**: API.Bible (`BIBLE_API_KEY` in `.env`), Fallback auf lokale JSON-Dateien (`data/bibles/*.json`)
- **Datenbank**: SQLite via `better-sqlite3`, Schema-Initialisierung in `config/database.ts`
- **Metrics**: Prometheus-Metriken (`httpRequestDuration`, `httpRequestTotal`, `errorCounter`) via `/api/metrics`
- **Health Check**: `/api/health` mit DB-Status, Uptime, Memory-Usage, Version
- **PWA**: Service Worker mit Workbox, Offline-First-Strategie, Cache für API-Calls (`NetworkFirst`)

## CI/CD & Qualitätschecks

- **Kein CI/CD-Workflow vorhanden** (noch nicht implementiert)
- **Linting**: `npm run lint` (ESLint für beide Workspaces)
- **Type Checking**: `tsc --noEmit` (implizit im Build-Prozess)
- **Testing**: Jest (Backend) + Vitest (Frontend), Coverage-Reports in `coverage/`
- **Docker**: Multi-Stage Build (`Dockerfile`), Production-Image mit Alpine Linux
- **Deployment**: Docker Compose (`docker-compose.prod.yml`), Umgebungsvariablen via `.env`
- **Versionierung**: Semantic Versioning (Major.Minor.Patch), `CHANGELOG.md` im "Keep a Changelog"-Format

## Nie manuell editieren

- `backend/dist/` und `frontend/build/` (Build-Artefakte, werden automatisch generiert)
- `data/database/notenest.db` (Datenbank-Schema wird automatisch initialisiert)
- `logs/*.log` (Log-Dateien werden automatisch von Winston rotiert)
- `node_modules/` (werden via `npm install` verwaltet)

## Offene Punkte

- Soll ein CI/CD-Workflow (GitHub Actions/GitLab CI) eingerichtet werden?
- Gibt es spezielle Branch-Policies (z.B. `main`/`develop`, PR-Reviews)?
- Soll die Test-Coverage-Schwelle dokumentiert werden (aktuell keine Mindestanforderung)?
- Gibt es spezielle Feature-Flag-Regeln (aktuell keine Feature-Flags implementiert)?

