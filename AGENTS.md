# AGENTS.md

## Cursor Cloud specific instructions

### Overview

NoteNest is a personal note-taking app (German UI) with Bible verse references, built as an npm workspaces monorepo (`backend/` + `frontend/`). See `README.md` and `docs/AI/instructions.md` for full architecture and conventions.

### Node.js Version

This project requires **Node.js 20** (not 22). Node 22 causes `ERR_REQUIRE_CYCLE_MODULE` errors due to stricter ESM/CJS handling in tsx. Use nvm to switch:
```
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20
```

### Starting Dev Servers

The backend requires environment variables to be loaded before startup. The `.env` file is auto-loaded by `dotenv` in `index.ts`, but when running via `tsx`, the env must be sourced first:

```bash
# Backend (port 3000):
cd /workspace/backend
set -a && source /workspace/.env && set +a
npx tsx src/index.ts

# Frontend (port 5173):
cd /workspace/frontend
npx vite --host 0.0.0.0
```

A default admin account is auto-created on first backend start: `admin` / `admin123`.

### Key Commands

Standard commands are in root `package.json` and documented in `docs/AI/instructions.md`:
- **Dev**: `npm run dev` (both), or start individually as shown above
- **Lint**: `npm run lint` (pre-existing lint errors in repo; do not fix unless specifically asked)
- **Test**: `npm run test` (Jest for backend, Vitest for frontend)
- **Build**: `npm run build`

### Puppeteer / PDF Export

PDF export uses Puppeteer (Chromium). Set `PUPPETEER_SKIP_DOWNLOAD=true` during `npm install` to skip the ~500MB Chromium download. PDF export will be unavailable but all other features work.

### Database

SQLite is embedded via `better-sqlite3` — no external DB server needed. The database file is auto-created at `./data/database/notenest.db` on first backend start.

### Environment Setup

Run `scripts/setup-env.sh` to auto-generate `.env` from `.env.example` with random JWT secrets. Bible API keys are optional (`BIBLE_API_ENABLED=false` by default).
