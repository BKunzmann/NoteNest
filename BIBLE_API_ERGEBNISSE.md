# API.Bible - Abgerufene Übersetzungs-IDs

## 📡 API-Aufruf

**URL**: `https://rest.api.bible/v1/bibles`  
**API Key**: Konfiguriert in `.env`

## ✅ Gefundene deutsche Übersetzungen

Die API hat **4 deutsche Übersetzungen** zurückgegeben:

### 1. Elberfelder Translation (Version of bibelkommentare.de)
- **ID**: `f492a38d0e52db0f-01`
- **Abkürzung**: `ELBBK`
- **Sprache**: German, Standard (deu)
- **Beschreibung**: Linguistically revised text of the Unrevised Elberfelder Translation with footnotes
- **Status**: ✅ **Verwendet als ELB** in `API_BIBLE_TRANSLATION_MAP`

### 2. German Luther Bible 1912 with Strong's numbers
- **ID**: `926aa5efbc5e04e2-01`
- **Abkürzung**: `deuL1912`
- **Sprache**: German, Standard (deu)
- **Status**: ℹ️ Bereits lokal als `LUT1912` verfügbar (nicht in API-Mapping)

### 3. German Unrevised Elberfelder Bible
- **ID**: `95410db44ef800c1-01`
- **Abkürzung**: `deuelo`
- **Sprache**: German, Standard (deu)
- **Status**: ℹ️ Bereits lokal als `ELB1905` verfügbar (nicht in API-Mapping)

### 4. The Holy Bible in German, translation by Kautzsch und Weizsäcker 1906
- **ID**: `542b32484b6e38c2-01`
- **Abkürzung**: `deutkw`
- **Sprache**: German (deu)
- **Status**: ⚠️ Nicht verwendet (historische Übersetzung)

## ❌ Nicht verfügbare moderne Übersetzungen

Die folgenden modernen Übersetzungen sind **NICHT** über diese API verfügbar:

- ❌ **Lutherbibel 2017** (LUT)
- ❌ **Elberfelder 2006** (ELB - verwenden wir stattdessen die Elberfelder Translation von bibelkommentare.de)
- ❌ **BasisBibel**
- ❌ **Neue Genfer Übersetzung** (NGÜ)
- ❌ **Hoffnung für Alle** (HFA)

## 📝 Aktualisiertes Mapping

```typescript
const API_BIBLE_TRANSLATION_MAP: Record<string, string> = {
  // Elberfelder Translation (Version of bibelkommentare.de) - linguistisch überarbeitete Version
  'ELB': 'f492a38d0e52db0f-01',  // Elberfelder Translation (Version of bibelkommentare.de)
};
```

## 🔄 Funktionsweise

1. **ELB wird angefordert**:
   - Zuerst wird lokal nach `ELB1905` gesucht
   - Wenn nicht gefunden, wird die API verwendet (`f492a38d0e52db0f-01`)
   - Ergebnis wird in `bible_cache` gespeichert

2. **LUT wird angefordert**:
   - Wird lokal als `LUT1912` gesucht
   - API wird nicht verwendet (Luther 2017 nicht verfügbar)

3. **Andere Übersetzungen**:
   - BasisBibel, NGÜ, HFA: Nicht verfügbar über API
   - Fallback zu lokalen Übersetzungen oder Fehler

## 💡 Hinweise

- Die API hat insgesamt **224 Bibeln** in **128 Sprachen**
- Moderne deutsche Übersetzungen sind möglicherweise über eine andere API verfügbar
- Die Elberfelder Translation von bibelkommentare.de ist eine linguistisch überarbeitete Version der unrevidierten Elberfelder Bibel

## 🎯 Nächste Schritte (Optional)

Falls moderne Übersetzungen benötigt werden:
1. Prüfe alternative APIs (z.B. Bible Gateway API, andere Bibel-APIs)
2. Prüfe, ob die Übersetzungen über eine andere API.Bible-Instanz verfügbar sind
3. Erwäge, die Übersetzungen lokal zu importieren (falls lizenzrechtlich möglich)

