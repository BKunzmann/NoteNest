# AGENTS.md

## Cursor Cloud specific instructions

### Overview

NoteNest is a personal note-taking web app (German UI) with Bible verse references. It is a npm workspaces monorepo with two packages: `backend/` (Express + SQLite + TypeScript) and `frontend/` (React + Vite + TypeScript). No external database is needed — SQLite is embedded via `better-sqlite3`.

### Starting the development servers

The backend requires `dotenv` to be preloaded before `tsx` so that JWT secrets from `.env` are available when modules initialize. The standard `npm run dev` from root may fail on Node.js 22+ due to dynamic `import()` resolution issues with tsx.

**Recommended backend start command (from `/workspace/backend`):**

```sh
DOTENV_CONFIG_PATH=/workspace/.env node --require dotenv/config --require tsx/cjs --import tsx/esm src/index.ts
```

**Frontend start command (from `/workspace`):**

```sh
npm run dev --workspace=frontend
```

The backend runs on port 3000, the frontend Vite dev server on port 5173. The Vite proxy forwards `/api` requests to the backend.

### Default admin credentials

On first database initialization, the backend creates a default admin user: `admin` / `admin123`.

### Key commands

| Action | Command |
|--------|---------|
| Install deps | `npm install` (from root; use `PUPPETEER_SKIP_DOWNLOAD=true` if Chromium is already cached in `~/.cache/puppeteer/`) |
| Lint | `npm run lint` (pre-existing warnings/errors in both workspaces) |
| Backend tests | `npm run test --workspace=backend` (Jest, 80 tests) |
| Frontend tests | `npm run test --workspace=frontend` (Vitest, 2 tests) |
| Create .env | `bash scripts/setup-env.sh` (generates JWT secrets) |

### Gotchas

- **Node.js 22 + tsx dynamic imports**: The backend `index.ts` uses `import('./config/database')` for lazy initialization. When running via CJS require, this dynamic `import()` needs the ESM loader registered too. Always include both `--require tsx/cjs` and `--import tsx/esm`.
- **Puppeteer / Chromium**: `npm install` downloads ~500 MB of Chromium for Puppeteer (PDF export). Set `PUPPETEER_SKIP_DOWNLOAD=true` if it's already cached at `~/.cache/puppeteer/`.
- **Native modules**: `better-sqlite3` and `argon2` compile native addons. If you switch Node.js versions, run `npm rebuild`.
- **Data directories**: The backend expects `./data/database/`, `./data/users/`, `./data/shared/`, and `./logs/` to exist. They are created as needed, but ensure the `.env` file has correct paths.
