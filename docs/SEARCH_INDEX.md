# Volltextsuche mit Index

## Übersicht

NoteNest verwendet einen **invertierten Index** für schnelle Volltextsuche über alle Notizen. Die Suche ist **10-100x schneller** als die vorherige Dateisystem-basierte Suche und skaliert auch bei tausenden Dateien.

## Features

### ✨ Index-basierte Suche
- **Schnelle Suche**: O(log n) statt O(n) - Suche im Index statt Dateisystem-Scan
- **Fuzzy Search**: Findet auch bei Tippfehlern (Levenshtein-Distanz ≤ 2)
- **Relevanz-Scoring**: Ergebnisse werden nach Relevanz sortiert
- **Unterstützte Dateitypen**: Alle Markdown-Varianten (`.md`, `.markdown`, `.mdown`, `.mkd`, `.mkdn`, `.mkdown`, `.mdwn`, `.mdtxt`, `.mdtext`) und `.txt`

### 🔄 Automatische Indexierung
- **Automatisch**: Dateien werden beim Erstellen, Aktualisieren oder Verschieben automatisch indexiert
- **Inkrementell**: Nur geänderte Dateien werden neu indexiert (Content-Hash Prüfung)
- **Parallele Verarbeitung**: Mehrere Dateien werden gleichzeitig indexiert (konfigurierbar)

### 👨‍💼 Admin-Funktionen
- **Re-Indexierung**: Admin kann manuell eine vollständige Re-Indexierung aller Dateien starten
- **Index-Statistiken**: Übersicht über indexierte Dateien, Tokens und Dateigrößen

## Technische Details

### Datenbank-Schema

#### `search_index` Tabelle
Speichert Metadaten für jede indexierte Datei:
- `user_id`, `file_path`, `file_type` (private/shared)
- `content_hash` (SHA-256) für Änderungserkennung
- `file_size`, `word_count`, `last_modified`

#### `search_tokens` Tabelle
Invertierter Index - speichert jedes Wort mit Position:
- `token` (normalisiertes Wort, lowercase)
- `file_id` (Referenz zu search_index)
- `line_number`, `position`, `context` (50 Zeichen vor/nach)

#### `app_config` Tabelle
Globale Konfiguration:
- `index_parallel_workers`: Anzahl paralleler Worker (Standard: 4)
- `index_notes_only`: Nur Notizen indexieren (Standard: true)
- `index_max_file_size_mb`: Maximale Dateigröße (Standard: 50 MB)

### Tokenisierung

Text wird in Wörter aufgeteilt:
- **Unicode-fähig**: Unterstützt Umlaute und Sonderzeichen
- **Normalisierung**: Alle Wörter werden lowercase
- **Kontext**: 50 Zeichen vor und nach jedem Token werden gespeichert

### Fuzzy Search

Verwendet **Levenshtein-Distanz** für Tippfehler-Toleranz:
- **Exakter Match**: Höchste Relevanz (+10 Punkte)
- **Teilstring-Match**: Mittlere Relevanz
- **Fuzzy Match**: Distanz ≤ 2, nur für Wörter ≥ 3 Zeichen

### Relevanz-Scoring

Ergebnisse werden nach Relevanz sortiert:
- Anzahl der Matches
- Exakter Match vs. Fuzzy Match
- Dateiname-Match (Bonus +5 Punkte)

## API-Endpunkte

### Suche
```
GET /api/search?q=suchbegriff&type=private|shared
```
- `q`: Suchbegriff (mindestens 2 Zeichen)
- `type`: Optional - nur 'private' oder 'shared' durchsuchen

**Response:**
```json
{
  "query": "suchbegriff",
  "results": [
    {
      "path": "/notizen.md",
      "type": "private",
      "name": "notizen.md",
      "matches": [
        {
          "line": 5,
          "text": "Vollständige Zeile mit Match",
          "context": "50 Zeichen vor und nach dem Match"
        }
      ],
      "relevance": 15
    }
  ],
  "count": 1
}
```

### Admin: Re-Indexierung
```
POST /api/admin/search/reindex?userId=123&type=private
```
- `userId`: Optional - nur für einen bestimmten Benutzer
- `type`: Optional - nur 'private' oder 'shared'

**Response:**
```json
{
  "message": "Re-indexing started",
  "userId": 123,
  "folderType": "private"
}
```

### Admin: Index-Statistiken
```
GET /api/admin/search/index-status
```

**Response:**
```json
{
  "totalFiles": 150,
  "totalTokens": 45230,
  "totalSize": 5242880,
  "byType": {
    "private": 120,
    "shared": 30
  },
  "topExtensions": [
    { "file_extension": ".md", "count": 140 },
    { "file_extension": ".txt", "count": 10 }
  ]
}
```

## Performance

### Vorher (Dateisystem-Scan)
- **100 Dateien**: ~5-10 Sekunden
- **1000 Dateien**: ~30-60 Sekunden
- **Skalierung**: Linear (O(n))

### Jetzt (Index-basiert)
- **100 Dateien**: ~0.1-0.3 Sekunden
- **1000 Dateien**: ~0.2-0.5 Sekunden
- **Skalierung**: Logarithmisch (O(log n))

**Verbesserung: 10-100x schneller** 🚀

## Konfiguration

### Admin-Konfiguration

Die Index-Einstellungen können über die `app_config` Tabelle konfiguriert werden:

```sql
-- Anzahl paralleler Worker (Standard: 4)
UPDATE app_config SET value = '8' WHERE key = 'index_parallel_workers';

-- Maximale Dateigröße in MB (Standard: 50)
UPDATE app_config SET value = '100' WHERE key = 'index_max_file_size_mb';
```

### Automatische Indexierung

Die Indexierung erfolgt automatisch bei:
- ✅ Datei erstellen (`createFile`)
- ✅ Datei aktualisieren (`updateFile`)
- ✅ Datei löschen (`removeFromIndex`)
- ✅ Datei verschieben (`moveFile` - alter Eintrag wird entfernt, neuer erstellt)

## Wartung

### Manuelle Re-Indexierung

Falls der Index inkonsistent ist, kann ein Admin eine vollständige Re-Indexierung starten:

1. **Alle Benutzer**: `POST /api/admin/search/reindex`
2. **Einzelner Benutzer**: `POST /api/admin/search/reindex?userId=123`
3. **Nur private Dateien**: `POST /api/admin/search/reindex?type=private`

### Index-Validierung

Der Index wird automatisch validiert:
- Content-Hash wird bei jeder Datei-Operation geprüft
- Unveränderte Dateien werden übersprungen
- Gelöschte Dateien werden automatisch entfernt

## Zukünftige Erweiterungen

Geplant für zukünftige Versionen:
- 🔍 **Phrasensuche**: Exakte Wortfolgen finden (`"exakte phrase"`)
- 🌐 **Wildcard-Suche**: `projekt*` oder `*planung`
- 🔗 **Boolesche Operatoren**: `projekt AND planung`, `projekt OR plan`
- 📄 **Office-Dateien**: Optional `.docx`, `.pdf`, `.xlsx` indexieren
- 🎯 **Erweiterte Relevanz**: TF-IDF für bessere Sortierung

## Troubleshooting

### Index ist leer
- Prüfe, ob Dateien indexierbar sind (`.md`, `.txt`)
- Starte manuelle Re-Indexierung als Admin
- Prüfe Logs auf Fehler

### Suche findet nichts
- Prüfe, ob Suchbegriff mindestens 2 Zeichen hat
- Prüfe, ob Dateien indexiert sind (Index-Statistiken)
- Versuche Re-Indexierung

### Performance-Probleme
- Reduziere `index_parallel_workers` in `app_config`
- Prüfe Datenbank-Indizes
- Prüfe Dateigrößen (große Dateien können langsam sein)

