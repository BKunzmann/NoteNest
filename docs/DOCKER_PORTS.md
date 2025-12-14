# Docker Ports & Umgebungsvariablen - Erklärung

## Die drei verschiedenen "Port"-Konfigurationen

### 1. `ports: - "3000:3000"` (Docker Port-Mapping)

**Was ist das?**
- Docker Port-Mapping: Host-Port → Container-Port
- Format: `"HOST_PORT:CONTAINER_PORT"`

**Beispiel:**
```yaml
ports:
  - "3000:3000"           # Host:3000 → Container:3000
  - "127.0.0.1:3000:3000" # Nur localhost:3000 → Container:3000 (sicherer)
```

**Was macht es?**
- Macht den Container-Port von außen erreichbar
- **Wichtig:** Das ist NICHT dasselbe wie die PORT-Umgebungsvariable!

**Warum brauchen wir das?**
- Ohne Port-Mapping ist der Container nur intern erreichbar
- Mit Port-Mapping kann man von außen (oder localhost) auf den Container zugreifen

---

### 2. `environment: - PORT=3000` (Umgebungsvariable in docker-compose)

**Was ist das?**
- Setzt eine Umgebungsvariable direkt im Container
- Wird von der Anwendung gelesen: `process.env.PORT`

**Beispiel:**
```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
```

**Was macht es?**
- Teilt der Node.js-Anwendung mit, auf welchem Port sie lauschen soll
- Die Anwendung startet dann: `app.listen(process.env.PORT || 3000)`

---

### 3. `PORT=3000` in `.env` (Umgebungsvariable aus Datei)

**Was ist das?**
- Umgebungsvariable aus `.env` Datei
- Wird über `env_file: - .env` geladen

**Beispiel:**
```env
# .env
PORT=3000
NODE_ENV=production
```

```yaml
# docker-compose.yml
env_file:
  - .env
```

**Was macht es?**
- Lädt alle Variablen aus `.env` in den Container
- **Wichtig:** Überschreibt Werte aus `environment:`!

---

## Warum haben wir Redundanz entfernt?

### Vorher (redundant):
```yaml
environment:
  - PORT=3000        # ❌ Redundant
env_file:
  - .env             # Enthält auch PORT=3000
```

### Nachher (sauber):
```yaml
environment:
  # PORT wird aus .env geladen (env_file)
env_file:
  - .env             # Enthält PORT=3000
```

**Vorteile:**
- ✅ Keine Redundanz
- ✅ Einfacher zu ändern (nur `.env` anpassen)
- ✅ Flexibler (verschiedene Ports für verschiedene Umgebungen)

---

## Zusammenfassung

| Konfiguration | Zweck | Beispiel |
|--------------|-------|----------|
| `ports:` | Docker Port-Mapping (Host → Container) | `"3000:3000"` |
| `environment: - PORT=` | Umgebungsvariable direkt | `PORT=3000` |
| `.env PORT=` | Umgebungsvariable aus Datei | `PORT=3000` |

**Empfehlung:**
- ✅ `ports:` für Port-Mapping (immer nötig)
- ✅ `PORT` nur in `.env` (flexibler)
- ❌ `PORT` nicht in `environment:` (redundant)

---

## Beispiel: Verschiedene Ports für verschiedene Umgebungen

### Development (.env)
```env
PORT=3000
```

### Production (.env.production)
```env
PORT=3000
```

### docker-compose.yml (bleibt gleich)
```yaml
ports:
  - "3000:3000"  # Port-Mapping
env_file:
  - .env         # Lädt PORT aus .env
```

**Vorteil:** Port kann pro Umgebung unterschiedlich sein, ohne docker-compose.yml zu ändern!

