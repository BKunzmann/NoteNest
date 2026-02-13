# NoteNest: Konzept zu HIG, Feedback, Sync und Shared-Freigaben

## Ziel und Rahmen

Dieses Dokument beschreibt **konzeptionelle Vorschlaege ohne Implementierungsdetails** fuer folgende offene Punkte:

1. Apple Human Interface Guidelines (HIG) konsistent anwenden
2. Benutzerfeedback sehr einfach, aber administrierbar erfassen
3. Synchronisation transparent erklaeren
4. Speicherpfad-Interaktion im Editor bewerten (Variante A vs. B)
5. Fullscreen-Strategie fuer Vorschau/Editor bewerten
6. Mehrere Shared-Ordner in Docker und pro Benutzerfreigabe

---

## 1) Apple HIG: pragmatischer Compliance-Ansatz

Vollstaendige HIG-Compliance ist kein einzelner Schalter, sondern ein laufender UX-Standard. Fuer NoteNest ist ein **"HIG-Basisprofil"** sinnvoll:

### 1.1 Interaktion und Navigation
- Primare Aktionen immer an konsistenten Positionen (z. B. neue Notiz/Ordner oben in der Sidebar)
- Sekundaere/risikobehaftete Aktionen (Loeschen, Verschieben) in Menues oder Dialogen, mit klarer Rueckmeldung
- Keine versteckten Zustandswechsel ohne visuelle Indikatoren (z. B. Sync, Offline, Speichern)

### 1.2 Klarheit und Hierarchie
- Reduzierte Toolbar mit gruppierten Funktionen (bereits in Richtung "Auswahlfeld + Aktionen")
- Lesbare Typografie-Hierarchie (H1/H2/H3/Normaltext) ohne visuelle Ueberladung
- Metadaten dezent unter Titel oder im Info-Bereich, nicht im Primarfokus

### 1.3 Feedback und Fehlertoleranz
- Sofortiges UI-Update nach Dateioperationen (Loeschen/Umbenennen), damit keine "toten Eintraege" entstehen
- Fehlermeldungen immer mit naechster Handlung ("Erneut versuchen", "Ordner oeffnen", "Support kontaktieren")
- Offline- und Sync-Zustaende eindeutig, nicht nur generisch ("1 fehlgeschlagen")

### 1.4 Konsistente Standards
- Kontextmenue per Re-Click schliessbar
- Standard-Editormodus bei Neustart konsistent (WYSIWYG als Default)
- Keine Verlaufselemente, wenn Produktvorgabe das explizit ausschliesst

**Empfehlung:** HIG-Compliance als Release-Checkliste in QA aufnehmen (Visibility of state, Consistency, Error recovery, Touch targets, Typographic hierarchy).

---

## 2) Benutzerfeedback: sehr einfaches, administrierbares Modell

### 2.1 Ein einziger Einstieg
Ein einziger Menuepunkt: **"Feedback senden"** mit 4 Kategorien:
- Feature-Wunsch
- Fehlermeldung
- Problemanfrage
- Allgemeines Feedback

### 2.2 Minimales Formular
Pflichtfelder:
- Kategorie
- Titel
- Beschreibung

Optionale Felder:
- "Was erwartet?"
- "Was ist passiert?"
- Anhang/Screenshot

Automatisch beifuellen:
- App-Version
- Plattform/Browser
- User-ID (intern)
- Zeitstempel

### 2.3 Admin-/Dev-Sicht (einfach)
Interne Statusstufen:
- Neu
- In Pruefung
- Geplant
- Umgesetzt
- Abgelehnt

Zusatz:
- Filter nach Kategorie/Status
- Duplikat-Markierung
- Export als CSV fuer Auswertung

### 2.4 Warum dieses Modell?
- Niedrige Huerde fuer Benutzer
- Sofort triagierbar fuer Admin/Dev
- Keine komplexe Ticketlogik noetig

---

## 3) Synchronisation transparent machen

### 3.1 Was wird synchronisiert?
Fuer Nutzer eindeutig benennen:
- Lokale/offline erfasste Aenderungen an Notizen
- Ausstehende Schreibvorgaenge (Queue)
- Konflikt-/Fehlversuche

### 3.2 Wo sieht man Details?
Empfehlung:
- Kompakte Statusanzeige (Online/Offline/Synchronisiere)
- Aufklappbare Details mit:
  - Anzahl gesamt
  - Erfolgreich
  - Fehlgeschlagen
  - Betroffene Pfade
  - Letzter erfolgreicher Sync-Zeitpunkt

### 3.3 PWA-Bezug verstaendlich kommunizieren
- **Manifest**: Installation/Startverhalten/Icons
- **Service Worker**: Caching, Offline-Verfuegbarkeit, Hintergrund-Sync-Logik
- **IndexedDB/Queue**: Zwischenablage ausstehender Aenderungen

Kurztext fuer UI-Hilfe:
"Offline-Aenderungen werden lokal vorgemerkt und bei Verbindung automatisch an den Server uebertragen."

---

## 4) Speicherpfad im Editor: Variante A vs. B

## Variante A: klickbarer Pfad
**Vorteile**
- Sehr direkt fuer Power-User
- Schnell fuer tiefe Ordnernavigation

**Nachteile**
- Kleine Klickziele (Touch/Barrierefreiheit)
- Hohe Interaktionsdichte im Header
- Erhoehtes Risiko von Fehlklicks

## Variante B: "Im Ordner anzeigen" ueber Kontextmenue
**Vorteile**
- HIG-naher: kontextbezogene Sekundaeraktion
- Ruhiger Header, weniger visuelle Last
- Bessere Fehlertoleranz

**Nachteile**
- Ein Klick mehr

**Empfehlung:** **Variante B als Standard** (HIG- und Usability-freundlicher).  
Optional kann A spaeter als erweiterte Einstellung fuer Power-User hinzukommen.

---

## 5) Fullscreen-Empfehlung (Vorschau/Editor)

### Vorschau
- Fullscreen fuer Vorschau ist sinnvoll bei laengeren Dokumenten und Ablenkungsfreiheit.
- Klarer Exit ("Vollbild verlassen") muss immer sichtbar bleiben.

### Editor
- Editor-Fullscreen optional anbieten, aber nicht als erzwungener Standard.
- Default sollte beim normalen Layout bleiben, damit Navigation/Kontext verfuegbar ist.

**Empfehlung:**  
1. Vorschau-Fullscreen als primaeren Lesemodus beibehalten  
2. Editor-Fullscreen als optionale Expertenfunktion (spaeter), nicht als Default

---

## 6) Mehrere Shared-Ordner in Docker und individuelle Zuweisung

### 6.1 Machbarkeit
Ja, mehrere Shared-Ordner koennen in Docker Compose gemountet werden:
- Entweder mehrere konkrete Volumes
- Oder ein gemeinsamer Root mit Unterordnern

### 6.2 Empfohlenes Betriebsmodell
- Ein technischer Shared-Root im Container
- Darunter logisch getrennte Team-/Bereichsordner
- Freigabe erfolgt pro Benutzer ueber explizite Zuordnungen (z. B. Mapping-Tabelle)

### 6.3 Sicherheits-/UX-Regeln
- Kein Shared-Bereich sichtbar, solange keine Zuweisung existiert
- Listing und Direktzugriff immer gegen Benutzerzuweisungen pruefen
- Bei Entzug von Rechten sofortige Ausblendung im UI

---

## 7) Konkrete Produktentscheidungen (kurz)

1. **HIG:** als QA-Checkliste je Release verankern  
2. **Feedback:** ein einfaches 4-Kategorien-Formular mit internem Statusfluss  
3. **Sync:** Status + aufklappbare technische Details fuer Transparenz  
4. **Pfad im Editor:** Standardmaessig Kontextmenue-Variante B  
5. **Fullscreen:** Vorschau priorisieren, Editor optional spaeter  
6. **Shared in Docker:** Mehrfach-Mounts sind moeglich; Rechte streng benutzerbasiert

