# Docker-Entwicklung (Kurzfassung)

Diese Datei fasst die wichtigsten Docker-Dev-Schritte zusammen. Fuer das allgemeine
Setup siehe [README.md](../README.md). Bei Problemen siehe
[TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Schnellstart

```bash
docker-compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Was passiert?

- Image via `Dockerfile.dev` (Node 18 + Build-Tools fuer `better-sqlite3`)
- `docker-entrypoint.js` erstellt `.env` aus `.env.example` und generiert JWT-Secrets
  (falls fehlend)
- Live-Reload durch gemountete Volumes (backend/, frontend/, data/, logs/, .env)

## Nuetzliche Befehle

```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f
docker exec -it notenest-dev sh
```

## Siehe auch

- [ENV_EXAMPLES.md](./ENV_EXAMPLES.md) - Environment-Variablen
- [NAS_SETUP_GUIDE.md](./NAS_SETUP_GUIDE.md) - NAS-Setup
