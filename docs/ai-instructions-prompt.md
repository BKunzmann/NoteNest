# Universeller Prompt für AI-Coding-Agenten



## Aufgabe

Erzeuge oder aktualisiere eine Datei `instructions.md` im Arbeitsverzeichnis, die AI‑Coding‑Agents sofort produktiv macht. Schreibe präzise, projektspezifische Regeln (20–50 Zeilen, Markdown) mit echten Beispielen/Kommandos aus diesem Repo. Keine Markenbegriffe. Fokus: **Architektur**, **Workflows**, **Konventionen**, **Integrationen**, **CI/CD**. 

Wenn bestehende instructions existieren, **mergen** (Wertvolles erhalten, Veraltetes aktualisieren).

---



## Projektstruktur

Projekt/
├─ instructions.md                           # Generierte KI-Anleitung für Agents
├─ docs/
│   └─ ai-instructions-prompt.md   # Vollständiger Prompt + Beispiele + Skeleton (diese Datei)
└─ ci/
    ├─ ci.yml                                         # Plattformneutraler CI-Workflow
    └─ branch-policy.md                    # Dokumentation der Branch-Regeln

---



## Quellen für Analyse

### Einmalige Glob-Suche (KI-Regeln/Readmes):

- /.github/instructions.md
- /AGENT.md
- /AGENTS.md
- /CLAUDE.md
- /.cursorrules
- /.windsurfrules
- /.clinerules
- /cursor/rules/**
- /windsurf/rules/**
- /clinerules/**
- /README.md

### Zusätzliche Quellen (Projektstruktur & Workflows):

- package-/build-/test-skripte (package.json, Makefile, scripts/*)
- src/**, apps/**, services/**, server/**
- configs (*.config.*, .env.example, env.d.ts)
- migrations/**, prisma/**, openapi/**, codegen/**, generated/**
- infra/** (Dockerfile, docker-compose*, IaC)
- .github/workflows/** oder /ci/ci.yml
- tests/** (unit/integration/e2e), templates/**
- branch-policy.md (Branch-Regeln)

---

## Vorgehen

1. **Extrahiere vorhandene KI-Regeln** aus den obigen Dateien; konsolidiere, vermeide Duplikate, vermerke stillschweigend Upgrades.
2. **Rekonstruiere das Big Picture**:
   - Hauptkomponenten/Ordner, Service-Grenzen, Datenflüsse, Gründe für die Struktur.
   - Kommunikationsmuster: HTTP/RPC, Events/Queues, Shared Packages/Types.
3. **Entwickler-Workflows**:
   - Setup/Bootstrap, Build/Lint, Test (unit/integration/e2e), Debug.
   - Migrations/Seeds, lokale Stubs/Fixtures, Skripte/Make-Ziele.
4. **Konventionen & Patterns**:
   - Namensgebung, Layering, Fehler/Result, Logging, Validierung, DI/IOC.
   - Config/Feature Flags (env), Codegenerierung, Tabuzonen (nie manuell editieren).
5. **Integrationen**:
   - AuthN/AuthZ, externe APIs/Clients (Retries/Timeouts), Messaging/Queues, Storage, DB, Observability.
6. **CI/CD & Qualitätschecks**:
   - Workflows unter `.github/workflows/*` oder `/ci/ci.yml`: Zwecke, Jobs, Runner, Caching.
   - Trigger & Branch-Policies (PR-Checks, Required Status Checks, Schutzregeln).
   - Automatische Checks (Build, Lint, Tests, Coverage-Schwellen, Security/License).
   - Deployment-Pfade (Staging/Prod), Release-/Tag-Strategie, Artefakte.
   - Do/Don’t für KI: welche Dateien nicht ändern (z. B. Workflows, Infra), wie Checks lokal reproduziert werden (Make/Scripts).
7. Schreibe kompakt (20–50 Zeilen), mit echten Pfaden/Kommandos aus diesem Repo (keine Allgemeinplätze).
8. Schlussabschnitt **„Offene Punkte“** (2–5 konkrete Fragen zu Unklarheiten).

---

## Format der Ziel-Datei

- Datei: `/instructions.md` (Markdown)
- Struktur:
  - Titel
  - Architektur & Datenfluss (3–6 Punkte)
  - Entwickler-Workflows (4–8 Befehle)
  - Konventionen & Patterns (5–10 Regeln mit Pfaden/Beispielen)
  - Integrationen (3–6 Punkte)
  - CI/CD & Qualitätschecks (3–8 Punkte)
  - Nie manuell editieren (1–3 Punkte)
  - Offene Punkte (2–5 Fragen)

---

## Qualitätskriterien

- Repo-spezifisch, knapp, handlungsorientiert.
- Beispiele/Befehle müssen im Code nachweisbar sein (scripts/Makefile/package.json).
- Keine Secrets; nur Env-Namen erwähnen.
- Wenn Merge: kurz erwähnen, was übernommen/aktualisiert wurde.

---



## Offene Punkte

* Soll die Coverage-Schwelle dokumentiert werden?
* Gibt es spezielle Feature-Flag-Regeln?

---



## Skeletons für zusätzliche Dateien

### ✅ Skeleton für `instructions.md`

```markdown
# Projekt-Instructions für AI-Coding-Agents

## Architektur & Datenfluss
- [Komponente/Ordner] → [Kommunikation] → [Komponente], Grund: [kurz]
- Shared Types: `packages/shared/*`
- Events: `services/api/src/events/*` (Publisher/Subscriber)

## Entwickler-Workflows
- Setup: `pnpm i`
- Build: `pnpm -r build`
- Test: `pnpm -r test`
- Debug: `pnpm dev --filter apps/web`
- Migrations: `pnpm db:migrate`

## Konventionen & Patterns
- Repos unter `services/api/src/repositories/*` – nur über Interfaces
- Validierung via `zod` in `src/schemas/*`
- Fehler über `Result<T,E>` (`packages/shared/result.ts`)
- Logging: `packages/shared/logger` mit `requestId`

## Integrationen
- Auth via `packages/shared/auth`
- External APIs: Clients in `packages/shared/clients/*`
- Storage: `StorageService` (S3-kompatibel)

## CI/CD & Qualitätschecks
- CI-Workflow: siehe `/ci/ci.yml`
- Required Checks: Build, Lint, Tests, Coverage ≥ 80%
- Branch-Policies: siehe `/ci/branch-policy.md`
- Deployment: Docker-Images via `infra/`

## Nie manuell editieren
- `generated/**`, `migrations/**`
```



### ✅ Skeleton für branch-policy.md

```markdown
# Branch-Policies
- Geschützte Branches: `main` (Prod), `develop` (Staging)
- PR-Flow: Feature → PR → Zielbranch; min. 1 Review; Required Checks müssen grün sein
- Verboten: Direkt-Push auf `main`
- Merge-Strategie: Squash-Merge
- Release: Tags `v*.*.*` triggern Release-Pipeline
- Siehe CI-Workflow: `/ci/ci.yml`
```

### ✅ Beispiel für ci.yml (neutral)

```yaml
name: CI

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm -r run build
      - run: pnpm -r run test -- --coverage
```

---



## Output:

* Gib nur den finalen Markdown-Inhalt für /instructions.md zurück (inkl. „Offene Punkte“).
