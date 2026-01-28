# NoteNest - Erster Start (Kurz)

Kurze Checkliste fuer NAS/Server-Deployments. Diese Datei liegt bewusst im Root
neben `docker-compose.example.yml` und `.env.example`.

## 1) Dateien vorbereiten

```bash
cp docker-compose.example.yml docker-compose.yml
cp .env.example .env
```

## 2) .env anpassen (Minimal)

Empfohlen fuer NAS:

```
DEPLOYMENT_MODE=nas
REGISTRATION_ENABLED=false
AUTH_MODE=hybrid
```

JWT-Secrets kannst du **leer lassen** (werden beim ersten Start generiert).

Falls dein Reverse Proxy `X-Forwarded-For` setzt, fuege in `.env` hinzu:
```
TRUST_PROXY=1
```

## 3) Volumes/UID/GID pruefen

- Passe in `docker-compose.yml` die NAS-Pfade an (homes/shared).
- Pruefe UID/GID auf der NAS: `id <benutzername>` und trage sie in `user:` ein.

## 4) Host-Verzeichnisse anlegen

```bash
mkdir -p ./data/database
mkdir -p ./data/bibles
mkdir -p ./logs
```

## 5) Container starten

```bash
docker-compose pull
docker-compose up -d
```

## 6) Healthcheck

```bash
curl http://localhost:3100/api/health
```

Extern erreichst du die App (bei Standard-Mapping) unter:
`http://<nas-ip>:3100`

Hinweis: Wenn auf dem NAS Port 3000 bereits belegt ist, liefert
`http://localhost:3000/api/health` die Antwort eines anderen Dienstes.

Direkt im Container kannst du immer pruefen:
```bash
docker exec notenest sh -c "wget -qO- http://localhost:3000/api/health"
```

## 7) Admin-Login

Wenn noch kein Admin existiert, wird automatisch einer erstellt:

- Username: `admin`
- Password: `admin123`

Du kannst die Werte via `.env` setzen:

```
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
ADMIN_EMAIL=...
```

**Wichtig:** Passwort nach dem ersten Login aendern.

**Falls Login nicht klappt:** Einmal `docker-compose down`, dann
`docker-compose pull` und `docker-compose up -d` ausfuehren und erneut testen.

---

Weitere Infos:
- `docs/NAS_SETUP_GUIDE.md`
- `docs/ENV_EXAMPLES.md`
