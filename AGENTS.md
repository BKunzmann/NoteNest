# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

NoteNest is a personal notes app (German UI) with Bible verse references, built as an npm workspaces monorepo (`backend` + `frontend`). Backend: Express/TypeScript + SQLite (embedded). Frontend: React 18 + Vite + TypeScript. No external services required.

### Running the application

- **Backend**: `cd backend && node dist/index.js` (port 3000). Build first with `npm run build --workspace=backend`. The `tsx watch` dev command may hang silently in CI-like environments; prefer running the built version.
- **Frontend**: `cd frontend && npx vite --host 0.0.0.0` (port 5173). Proxies `/api` to backend automatically.
- **Both at once** (interactive terminals only): `npm run dev` from root.
- Default admin credentials on first start: `admin` / `admin123`.
- `.env` must exist with valid `JWT_SECRET` and `JWT_REFRESH_SECRET`. Run `bash scripts/setup-env.sh` to generate from `.env.example`.

### Testing, linting, building

- See `package.json` scripts: `npm run test`, `npm run lint`, `npm run build`.
- Backend tests (Jest): `npm run test --workspace=backend` — 80 tests, all should pass.
- Frontend tests (Vitest): `npm run test --workspace=frontend` — 2 tests.
- Lint has pre-existing errors in both workspaces (mostly `@typescript-eslint/no-explicit-any`). These are known and not blocking.

### Gotchas

- Puppeteer/Chromium download during `npm install` can take a very long time or stall. Use `PUPPETEER_SKIP_DOWNLOAD=true npm install` to skip it if PDF export isn't needed. Chrome cache lives in `~/.cache/puppeteer/`.
- The backend `tsx watch` dev command may not produce output or bind its port in non-TTY environments. Use the built JS (`node dist/index.js`) instead.
- SQLite database is created automatically at `./data/database/notenest.db` on first backend startup.
