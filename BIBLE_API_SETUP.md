# Bibelstellen-API-Integration - Setup-Anleitung

## ✅ Implementiert

Die API-Integration für Bibelstellen ist vollständig implementiert:

1. **API.Bible Service** (`backend/src/services/bibleApi.service.ts`)
   - API.Bible (YouVersion) Integration
   - Bible SuperSearch als Fallback
   - Automatisches Caching in `bible_cache` Tabelle

2. **Erweiterte Bible Service**
   - Automatischer Fallback zu API, wenn lokale Übersetzung nicht gefunden wird
   - Unterstützung für moderne Übersetzungen (LUT, ELB, BasisBibel, NGÜ, HFA)

3. **Frontend-Integration**
   - Verfügbare Übersetzungen werden vom Backend abgerufen
   - API-Übersetzungen werden in der SettingsPage angezeigt (mit "(API)" Markierung)

## 📋 Nächste Schritte

### 1. Axios installieren

Axios wurde bereits zu `backend/package.json` hinzugefügt. Beim nächsten `npm install` wird es automatisch installiert.

**Für lokale Entwicklung:**
```bash
cd backend
npm install
```

**Hinweis:** Falls `better-sqlite3` Kompilierungsfehler auftreten (Visual Studio Build Tools fehlen), ist das ein separates Problem. Axios wird trotzdem installiert, da es eine reine JavaScript-Bibliothek ist.

### 2. API-Keys konfigurieren

In der `.env` Datei müssen folgende Variablen gesetzt werden:

```env
# API.Bible (YouVersion)
BIBLE_API_URL=https://rest.api.bible
BIBLE_API_KEY=dein-api-key-hier

# Bible SuperSearch (Optional, Fallback)
BIBLE_SUPERSEARCH_ENABLED=true
BIBLE_SUPERSEARCH_URL=https://api.biblesupersearch.com/api
```

**API-Key erhalten:**
1. Registriere dich bei https://scripture.api.bible/
2. Erstelle einen API-Key
3. Trage den Key in `.env` ein

### 3. Übersetzungs-IDs anpassen

Die Bible IDs in `backend/src/services/bibleApi.service.ts` müssen an die tatsächliche API.Bible-Instanz angepasst werden:

```typescript
const API_BIBLE_TRANSLATION_MAP: Record<string, string> = {
  'LUT': 'de4e12af7f28f599-02',  // Lutherbibel 2017 (Beispiel-ID)
  'ELB': 'de4e12af7f28f599-03',  // Elberfelder 2006 (Beispiel-ID)
  'BasisBibel': 'de4e12af7f28f599-04',
  'NGÜ': 'de4e12af7f28f599-05',  // Neue Genfer Übersetzung
  'HFA': 'de4e12af7f28f599-06'   // Hoffnung für Alle
};
```

**Wie finde ich die richtigen IDs?**
1. Rufe die API.Bible-API auf: `GET https://rest.api.bible/v1/bibles`
2. Suche nach den gewünschten Übersetzungen
3. Kopiere die `id` Werte
4. Trage sie in `API_BIBLE_TRANSLATION_MAP` ein

### 4. Testen

1. Starte den Backend-Server
2. Öffne eine Notiz mit Bibelstellen
3. Wähle eine API-Übersetzung (z.B. "BasisBibel") im Popup
4. Der Vers sollte von der API geladen werden

## 🔧 Funktionsweise

### Fallback-Kette

1. **Cache prüfen**: Zuerst wird der `bible_cache` geprüft
2. **Lokale Datenbank**: Wenn nicht im Cache, wird die lokale `bible_verses` Tabelle durchsucht
3. **API.Bible**: Wenn lokal nicht gefunden und API-Übersetzung, wird API.Bible verwendet
4. **Bible SuperSearch**: Als letzter Fallback für Public-Domain-Übersetzungen

### Caching

- API-Ergebnisse werden in `bible_cache` gespeichert
- Standard-TTL: 1 Stunde (konfigurierbar über `BIBLE_CACHE_TTL`)
- Reduziert API-Calls und schont Rate Limits

### Verfügbare Übersetzungen

- **Lokal**: LUT1912, LUT1545, ELB1905, SCH1951
- **API**: LUT, ELB, BasisBibel, NGÜ, HFA (wenn API-Key konfiguriert)

## 📝 API-Endpunkte

### GET /api/bible/translations
Gibt alle verfügbaren Übersetzungen zurück:

```json
{
  "local": ["LUT1912", "LUT1545", "ELB1905", "SCH1951"],
  "api": ["LUT", "ELB", "BasisBibel", "NGÜ", "HFA"],
  "all": ["LUT1912", "LUT1545", "ELB1905", "SCH1951", "LUT", "ELB", "BasisBibel", "NGÜ", "HFA"]
}
```

## ⚠️ Wichtige Hinweise

1. **Rate Limits**: API.Bible hat Rate Limits (Free Tier: ~1.000 Requests/Tag)
   - Caching reduziert API-Calls erheblich
   - Bei vielen gleichzeitigen Benutzern: Caching-TTL erhöhen

2. **Offline-Funktionalität**: Lokale Übersetzungen funktionieren auch ohne Internet
   - API-Übersetzungen benötigen Internetverbindung
   - Bei API-Fehler: Fallback zu lokalen Übersetzungen

3. **Bible IDs**: Die Beispiel-IDs müssen angepasst werden
   - Jede API.Bible-Instanz hat unterschiedliche IDs
   - IDs können über die API abgefragt werden

## 🐛 Troubleshooting

### API-Calls schlagen fehl
- Prüfe, ob `BIBLE_API_KEY` in `.env` gesetzt ist
- Prüfe, ob die API-URL korrekt ist
- Prüfe Browser-Console/Backend-Logs für Fehlermeldungen

### Übersetzungen werden nicht angezeigt
- Prüfe, ob `GET /api/bible/translations` funktioniert
- Prüfe, ob API-Übersetzungen in der Response enthalten sind
- Prüfe Frontend-Console für Fehler

### Verse werden nicht geladen
- Prüfe Backend-Logs für API-Fehler
- Prüfe, ob die Bible IDs korrekt sind
- Prüfe, ob die Referenz korrekt geparst wird

