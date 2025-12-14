# YouVersion API - Abfrageergebnisse

## 📡 API-Endpunkt
**URL**: `https://rest.api.bible/v1/bibles`  
**API Key**: Konfiguriert in `.env`  
**Datum**: 2024

## ✅ Verfügbare deutsche Übersetzungen

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
- **Status**: ℹ️ Bereits lokal als `LUT1912` verfügbar (optional über API)

### 3. German Unrevised Elberfelder Bible
- **ID**: `95410db44ef800c1-01`
- **Abkürzung**: `deuelo`
- **Sprache**: German, Standard (deu)
- **Status**: ℹ️ Bereits lokal als `ELB1905` verfügbar (optional über API)

### 4. The Holy Bible in German, translation by Kautzsch und Weizsäcker 1906
- **ID**: `542b32484b6e38c2-01`
- **Abkürzung**: `deutkw`
- **Sprache**: German (deu)
- **Status**: ⚠️ Historische Übersetzung (optional verfügbar)

## ❌ Nicht verfügbare moderne Übersetzungen

Die folgenden modernen Übersetzungen sind **NICHT** über diese API verfügbar:

- ❌ **Lutherbibel 2017** (LUT)
- ❌ **Elberfelder 2006** (ELB - verwenden wir stattdessen die Elberfelder Translation von bibelkommentare.de)
- ❌ **BasisBibel**
- ❌ **Neue Genfer Übersetzung** (NGÜ)
- ❌ **Hoffnung für Alle** (HFA)
- ❌ **Neues Leben** (NL) ⚠️ **Gewünscht, aber nicht verfügbar**

## 🔍 Suche nach "Neues Leben"

Die Suche nach "Neues Leben" in der gesamten API (alle Sprachen) ergab:
- ❌ Keine deutsche "Neues Leben" Übersetzung gefunden
- ⚠️ Nur eine niederländische Übersetzung mit ähnlichem Namen gefunden (nicht relevant)

## 📝 Aktuelles Mapping

```typescript
const API_BIBLE_TRANSLATION_MAP: Record<string, string> = {
  'ELB': 'f492a38d0e52db0f-01',  // Elberfelder Translation (Version of bibelkommentare.de)
};
```

## 💡 Optionen für "Neues Leben" und andere moderne Übersetzungen

### Option 1: API.Bible Support kontaktieren
- **E-Mail**: support@api.bible
- **Anfrage**: Zugriff auf "Neues Leben" und andere moderne deutsche Übersetzungen
- **Hinweis**: Möglicherweise benötigen diese Übersetzungen spezielle Lizenzvereinbarungen

### Option 2: Alternative APIs prüfen
- **Bible Gateway API**: Möglicherweise haben sie "Neues Leben"
- **Andere Bibel-APIs**: Verschiedene Anbieter haben unterschiedliche Übersetzungen
- **YouVersion App API**: Möglicherweise gibt es eine andere API-Instanz mit mehr Übersetzungen

### Option 3: Lokale Importe
- Falls lizenzrechtlich möglich, könnten die Übersetzungen lokal importiert werden
- Erfordert JSON-Dateien im Format wie die anderen lokalen Übersetzungen
- Müsste in `backend/data/bibles/` abgelegt werden

### Option 4: Kombinierter Ansatz
- Lokale Übersetzungen für die häufigsten (LUT1912, ELB1905, SCH1951)
- API für weniger häufige (ELB über API)
- Lokale Importe für moderne Übersetzungen (falls verfügbar)

## 🔧 Nächste Schritte

1. **Kontakt mit API.Bible Support**:
   - E-Mail an support@api.bible senden
   - Nach "Neues Leben" und anderen modernen deutschen Übersetzungen fragen
   - Informationen über Lizenzanforderungen einholen

2. **Alternative APIs recherchieren**:
   - Bible Gateway API prüfen
   - Andere Bibel-API-Anbieter recherchieren
   - Vergleich der verfügbaren Übersetzungen

3. **Lokale Importe prüfen**:
   - Verfügbarkeit von "Neues Leben" JSON-Daten prüfen
   - Lizenzrechtliche Situation klären
   - Falls möglich, Import-Script erweitern

## 📊 API-Statistiken

- **Gesamtanzahl Bibeln**: 224
- **Deutsche Übersetzungen**: 4
- **Verfügbare moderne Übersetzungen**: 0
- **API-Status**: ✅ Funktioniert (mit konfiguriertem API-Key)

## ⚠️ Wichtige Hinweise

1. **API-Key**: Der API-Key funktioniert nur für `https://rest.api.bible`
   - Die alternative API `https://api.scripture.api.bible` gibt 401 zurück
   - Möglicherweise benötigt diese eine andere Art von API-Key

2. **Rate Limits**: API.Bible hat Rate Limits (Free Tier: ~1.000 Requests/Tag)
   - Caching reduziert API-Calls erheblich
   - Bei vielen gleichzeitigen Benutzern: Caching-TTL erhöhen

3. **Lizenzierung**: Moderne Übersetzungen sind oft urheberrechtlich geschützt
   - Erfordern möglicherweise spezielle Lizenzvereinbarungen
   - Kontakt mit API.Bible Support ist notwendig

