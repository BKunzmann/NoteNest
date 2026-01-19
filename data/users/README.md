# Benutzer-Notizen

Dieser Ordner enthält private Notizen der Benutzer.

## Struktur

```
data/users/
  └── {username}/
      ├── note1.md
      ├── note2.md
      └── subfolder/
          └── note3.md
```

## Verwendung

- Jeder Benutzer hat einen eigenen Unterordner
- Nur der jeweilige Benutzer hat Zugriff auf seine Dateien
- Unterstützte Formate: `.md` (Markdown)

## Produktion

In der Produktionsumgebung wird dieser Ordner typischerweise auf NAS-Home-Verzeichnisse gemountet:
- Synology: `/volume1/homes` → `/data/homes`
- QNAP: `/share/homes` → `/data/homes`

