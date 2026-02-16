# NoteNest: Konzept zur Office-Dokumentenbearbeitung und PDF-Anzeige/-Kommentierung

## Ziel und Rahmen

Dieses Dokument beschreibt ein **reines Konzept ohne technische Implementierung** fuer die Erweiterung von NoteNest um folgende Faehigkeiten:

1. Bearbeiten von Office-Dokumenten (Word, Excel, PowerPoint) innerhalb der Anwendung
2. Anzeigen und Kommentieren von PDF-Dateien (Anmerkungen, Hervorhebungen, Seitenmanagement)
3. Bewertung der Auswirkungen auf die Ressourcenlast des NAS-Systems
4. Empfehlung einer geeigneten Gesamtstrategie

**Abgrenzung:** Es handelt sich ausdruecklich um ein Konzept. Codeaenderungen, Konfigurationsdetails und konkrete API-Spezifikationen sind nicht Gegenstand dieses Dokuments.

---

## Inhaltsverzeichnis

1. [Ausgangslage und Motivation](#1-ausgangslage-und-motivation)
2. [Anforderungsuebersicht](#2-anforderungsuebersicht)
3. [Office-Dokumente: Strategien im Vergleich](#3-office-dokumente-strategien-im-vergleich)
4. [PDF-Anzeige und -Kommentierung: Strategien im Vergleich](#4-pdf-anzeige-und--kommentierung-strategien-im-vergleich)
5. [Ressourcenlast auf dem NAS-System](#5-ressourcenlast-auf-dem-nas-system)
6. [Datei- und Speicherverwaltung](#6-datei--und-speicherverwaltung)
7. [Berechtigungs- und Sicherheitskonzept](#7-berechtigungs--und-sicherheitskonzept)
8. [Benutzererfahrung und UI-Integration](#8-benutzererfahrung-und-ui-integration)
9. [Risiken und offene Punkte](#9-risiken-und-offene-punkte)
10. [Empfehlung und Fazit](#10-empfehlung-und-fazit)

---

## 1) Ausgangslage und Motivation

NoteNest ist eine Markdown-basierte Notizen-App mit NAS-Integration. Nutzer speichern ihre Dateien auf dem NAS-Dateisystem, das haeufig auch Office-Dokumente und PDFs enthaelt. Derzeit koennen diese Dateitypen nur heruntergeladen, aber nicht innerhalb von NoteNest betrachtet oder bearbeitet werden.

### Warum ist diese Erweiterung sinnvoll?

- **Medienbruch vermeiden:** Nutzer muessen derzeit die App verlassen, um Office-/PDF-Dateien zu oeffnen. Ein integrierter Viewer/Editor reduziert diesen Bruch.
- **Kollaboration verbessern:** Geteilte Ordner enthalten haeufig Office-Dateien. Die Moeglichkeit, diese direkt zu kommentieren, steigert den Mehrwert der Sharing-Funktion.
- **PDF-Workflow:** Bibelkommentare, Predigtnotizen und aehnliche Inhalte liegen oft als PDF vor. Anmerkungen und Seitenmanagement direkt in NoteNest wuerden den Arbeitsfluss erheblich verbessern.
- **Wettbewerbsfaehigkeit:** Vergleichbare Self-Hosted-Loesungen (z. B. Nextcloud) bieten Office- und PDF-Integration. Eine zumindest rudimentaere Unterstuetzung ist ein erwartetes Feature.

---

## 2) Anforderungsuebersicht

### 2.1 Office-Dokumente (Word, Excel, PowerPoint)

| Anforderung | Prioritaet | Beschreibung |
|---|---|---|
| Dokumente anzeigen | Hoch | Vorschau von .docx, .xlsx, .pptx ohne externen Download |
| Dokumente bearbeiten | Mittel | Grundlegende Bearbeitungsfunktionen (Text, Zellen, Folien) |
| Format-Treue | Mittel | Moeglichst originalgetreue Darstellung von Formatierungen |
| Gleichzeitige Bearbeitung | Niedrig | Mehrere Nutzer arbeiten am selben Dokument (Co-Editing) |
| Neue Dokumente erstellen | Niedrig | Leeres Word/Excel/PowerPoint-Dokument aus NoteNest heraus anlegen |

### 2.2 PDF-Dateien

| Anforderung | Prioritaet | Beschreibung |
|---|---|---|
| PDF anzeigen | Hoch | Seitenweise Darstellung mit Zoom, Scrollen, Seitennavigation |
| Anmerkungen hinzufuegen | Hoch | Textmarkierungen, Freihand-Zeichnungen, Textnotizen, Stempel |
| Kommentare | Hoch | Kommentare an bestimmten Stellen im PDF hinterlassen |
| Seiten neu anordnen | Mittel | Drag-and-Drop-Umsortierung von Seiten |
| Seiten hinzufuegen/entfernen | Mittel | Einzelne Seiten loeschen oder aus anderen PDFs einfuegen |
| PDF-Export | Mittel | Bearbeitetes PDF (mit Anmerkungen) wieder als PDF speichern |
| Offline-Faehigkeit | Niedrig | Anzeige und einfache Anmerkungen auch offline (PWA) |

---

## 3) Office-Dokumente: Strategien im Vergleich

Fuer die Office-Bearbeitung gibt es grundsaetzlich drei Ansaetze. Jeder hat signifikant unterschiedliche Auswirkungen auf Ressourcen, Komplexitaet und Benutzererfahrung.

### Strategie A: Integrierter Office-Server (z. B. Collabora Online / OnlyOffice)

**Beschreibung:** Ein separater Docker-Container stellt einen vollstaendigen Office-Rendering-Service bereit. NoteNest bindet diesen ueber ein eingebettetes iframe/WOPI-Protokoll ein.

**Vorteile:**
- Vollstaendige Format-Treue und Bearbeitungsfaehigkeit (nahezu identisch mit Desktop-Office)
- Unterstuetzung fuer Co-Editing (gleichzeitige Bearbeitung)
- Bewaehtere Loesung in der Self-Hosting-Community (Nextcloud, Seafile nutzen dies)
- Benutzer erhalten eine vertraute Office-Oberflaeche

**Nachteile:**
- **Hohe Ressourcenlast:** Collabora/OnlyOffice benoetigen eigenstaendig 1-2 GB RAM und signifikante CPU-Leistung
- Separater Docker-Container erhoet die Deployment-Komplexitaet
- Lizenzfragen bei OnlyOffice (Community-Edition auf 20 gleichzeitige Verbindungen limitiert)
- WOPI-Protokoll-Integration ist nicht trivial
- Start des Office-Containers kann 30-60 Sekunden dauern (Cold-Start)

**Ressourcen-Einschaetzung:**
- RAM: +1.0 - 2.0 GB (zusaetzlich zum NoteNest-Container)
- CPU: +0.5 - 2.0 Kerne unter Last
- Speicher: +500 MB - 2 GB fuer Container-Image
- Netzwerk: Moderate Bandbreite fuer Dokument-Rendering

### Strategie B: Clientseitige Vorschau mit begrenzter Bearbeitung

**Beschreibung:** Office-Dokumente werden im Browser des Nutzers dargestellt. Die Konvertierung oder das Rendering findet clientseitig (im Frontend) oder durch leichtgewichtige Backend-Konvertierung statt.

**Vorteile:**
- **Minimale NAS-Belastung:** Die Hauptarbeit findet im Browser statt
- Kein zusaetzlicher Docker-Container noetig
- Einfacheres Deployment
- Funktioniert auch bei schwacher Internetverbindung (nach initialem Laden)

**Nachteile:**
- Eingeschraenkte Format-Treue (komplexe Formatierungen, Makros, Diagramme koennen verloren gehen)
- Bearbeitungsfunktionen sind stark limitiert (nur einfache Textaenderungen realistisch)
- Kein Co-Editing moeglich
- Verschiedene Bibliotheken fuer .docx, .xlsx, .pptx noetig

**Ressourcen-Einschaetzung:**
- RAM: +0 - 50 MB (nur fuer optionale Backend-Konvertierung)
- CPU: Minimal auf dem Server; Last liegt beim Client
- Speicher: Kein zusaetzlicher Container
- Netzwerk: Dokument wird einmal uebertragen, danach Client-only

### Strategie C: Nur-Vorschau mit Verweis auf externe Bearbeitung

**Beschreibung:** NoteNest zeigt eine Vorschau/Thumbnail von Office-Dokumenten an und bietet einen "In externer App oeffnen"-Button. Bearbeitung erfolgt ausserhalb von NoteNest.

**Vorteile:**
- **Geringste Ressourcenlast:** Nur Vorschaugenerierung auf dem Server
- Kein Risiko fuer Format-Verlust bei Bearbeitung
- Einfachste Implementierung
- Nutzer verwenden die ihnen vertraute Desktop-Office-Software

**Nachteile:**
- Kein integrierter Bearbeitungs-Workflow
- Medienbruch bleibt bestehen (Nutzer wechselt in externe App)
- Vorschau-Generierung auf dem Server benoetigt trotzdem Konvertierungstools (z. B. LibreOffice-Headless fuer Thumbnails)

**Ressourcen-Einschaetzung:**
- RAM: +100 - 300 MB (nur bei Vorschau-Generierung, nicht permanent)
- CPU: Nur bei Thumbnail-Erstellung, Peak-basiert
- Speicher: +200 MB fuer Konvertierungstools im Container
- Netzwerk: Minimal

### Bewertungsmatrix Office-Strategien

| Kriterium | Strategie A (Office-Server) | Strategie B (Client-Rendering) | Strategie C (Nur-Vorschau) |
|---|---|---|---|
| Benutzererfahrung | Hervorragend | Maessig | Gering |
| Format-Treue | Hoch | Niedrig-Mittel | Nur Vorschau |
| NAS-Ressourcenlast | **Hoch** | **Gering** | **Sehr gering** |
| Deployment-Komplexitaet | Hoch | Niedrig | Niedrig |
| Wartungsaufwand | Hoch | Mittel | Gering |
| Co-Editing | Ja | Nein | Nein |
| Offline-Faehigkeit | Nein | Teilweise | Nein |

---

## 4) PDF-Anzeige und -Kommentierung: Strategien im Vergleich

### Strategie P1: Vollstaendig clientseitiger PDF-Viewer mit Annotationen

**Beschreibung:** Ein JavaScript-basierter PDF-Viewer im Frontend uebernimmt Rendering, Anmerkungen und Seitenmanagement. Annotationen werden entweder direkt in die PDF eingebettet oder als separater Datensatz (JSON/Datenbank) gespeichert.

**Vorteile:**
- **Minimale Serverlast:** Alles findet im Browser statt
- Hervorragende Reaktionsgeschwindigkeit (kein Server-Roundtrip fuer jede Aktion)
- Gut mit PWA und Offline-Modus vereinbar
- Reife Bibliotheken verfuegbar (PDF.js-basiert)

**Nachteile:**
- Seitenmanagement (Umordnen, Entfernen) erfordert letztlich eine serverseitige Zusammenstellung der endgueltigen PDF
- Bei sehr grossen PDFs (>100 MB) kann die Browser-Performance leiden
- Annotationen muessen in ein speicherbares Format ueberfuehrt werden (Flatten in PDF oder separater Store)

**Ressourcen-Einschaetzung:**
- RAM: +0 MB auf dem Server (rein clientseitig)
- CPU: Nur beim finalen Speichern/Zusammenfuehren kurzzeitig
- Speicher: Minimal (nur Annotationsdaten)

### Strategie P2: Serverseitiges PDF-Processing mit Client-Darstellung

**Beschreibung:** Der Server uebernimmt das PDF-Rendering (als Bilder oder aufbereitetes HTML), der Client zeigt das Ergebnis an. Annotationen werden serverseitig in die PDF eingebrannt.

**Vorteile:**
- Konsistente Darstellung unabhaengig vom Browser
- Server kann komplexe PDF-Operationen (Seiten umordnen, Zusammenfuehren) nativ ausfuehren
- Client muss keine grossen PDF-Dateien im Speicher halten

**Nachteile:**
- **Hohe Serverlast:** Jede PDF-Seite muss serverseitig gerendert werden
- Langsamer bei vielen gleichzeitigen Nutzern
- Mehr Bandbreite (Bild-Uebertragung statt komprimierter PDF-Daten)
- Hoehere Latenz bei Interaktionen (Zoom, Scrollen)

**Ressourcen-Einschaetzung:**
- RAM: +200 - 500 MB unter Last (abhaengig von PDF-Groesse und Nutzeranzahl)
- CPU: Signifikant bei Rendering und Konvertierung
- Speicher: Temporaere Dateien fuer gerenderte Seiten

### Strategie P3: Hybrid-Ansatz (Client-Viewer + Server-Operationen)

**Beschreibung:** PDF-Anzeige und einfache Annotationen laufen clientseitig. Komplexe Operationen (Seiten umordnen, Annotationen in PDF einbrennen, PDF zusammenfuehren) werden an den Server delegiert.

**Vorteile:**
- **Optimales Gleichgewicht:** Leichtgewichtige Interaktionen belasten den Server nicht
- Server wird nur fuer rechenintensive Operationen beansprucht
- Gute Offline-Faehigkeit fuer Grundfunktionen (Anzeige, einfache Anmerkungen)
- Skaliert besser als rein serverseitiges Rendering

**Nachteile:**
- Hoehere Architektur-Komplexitaet (Logik auf Client und Server verteilt)
- Annotationsformat muss zwischen Client und Server kompatibel sein
- Serverseitige PDF-Tools muessen trotzdem im Container vorhanden sein

**Ressourcen-Einschaetzung:**
- RAM: +50 - 200 MB (nur bei aktiven Operationen)
- CPU: Peak-basiert, nicht dauerhaft
- Speicher: +50 - 200 MB fuer PDF-Verarbeitungstools im Container

### Bewertungsmatrix PDF-Strategien

| Kriterium | P1 (Client-only) | P2 (Server-Rendering) | P3 (Hybrid) |
|---|---|---|---|
| Anzeige-Qualitaet | Hoch | Hoch | Hoch |
| Annotations-Komfort | Gut | Maessig (Latenz) | Gut |
| Seitenmanagement | Eingeschraenkt | Gut | Gut |
| NAS-Ressourcenlast | **Sehr gering** | **Hoch** | **Gering-Mittel** |
| Offline-Faehigkeit | Gut | Keine | Teilweise |
| Grosse PDFs (>50 MB) | Problematisch | Gut | Gut |
| Deployment-Komplexitaet | Gering | Mittel | Mittel |

---

## 5) Ressourcenlast auf dem NAS-System

Dieser Abschnitt bewertet die Gesamtauswirkung auf typische NAS-Hardware und gibt Empfehlungen fuer verschiedene Szenarien.

### 5.1 Typische NAS-Hardware-Profile

| Profil | Beispiel-Geraete | RAM | CPU | Beschreibung |
|---|---|---|---|---|
| **Einsteiger-NAS** | Synology DS220+, QNAP TS-230 | 2 GB | 2-Kern Celeron/ARM | Minimale Ressourcen, fuer Dateiablage optimiert |
| **Mittelklasse-NAS** | Synology DS920+, QNAP TS-464 | 4-8 GB | 4-Kern Celeron/Pentium | Kann mehrere Docker-Container betreiben |
| **High-End-NAS** | Synology DS1621+, Custom-Build | 16-32 GB | 6+ Kerne (AMD/Intel) | Betreibt problemlos mehrere Services |

### 5.2 Aktueller NoteNest-Ressourcenverbrauch

NoteNest benoetigt derzeit:
- **RAM:** ca. 200-512 MB (Node.js-Backend + SQLite)
- **CPU:** Gering (hauptsaechlich I/O-gebunden)
- **Speicher:** Abhaengig von Nutzerdaten, Container-Image ca. 300 MB

### 5.3 Auswirkung der Strategien auf verschiedene NAS-Profile

#### Szenario 1: Office-Server (Strategie A) + Server-PDF-Rendering (P2)
| Ressource | Einsteiger-NAS | Mittelklasse-NAS | High-End-NAS |
|---|---|---|---|
| RAM gesamt | ~2.5-3.0 GB | ~2.5-3.0 GB | ~2.5-3.0 GB |
| Bewertung | **Nicht machbar** (uebersteigt RAM) | **Grenzwertig** (50-75% RAM) | **Machbar** |

#### Szenario 2: Client-Rendering (Strategie B) + Hybrid-PDF (P3)
| Ressource | Einsteiger-NAS | Mittelklasse-NAS | High-End-NAS |
|---|---|---|---|
| RAM gesamt | ~300-700 MB | ~300-700 MB | ~300-700 MB |
| Bewertung | **Machbar** | **Komfortabel** | **Optimal** |

#### Szenario 3: Nur-Vorschau (Strategie C) + Client-PDF (P1)
| Ressource | Einsteiger-NAS | Mittelklasse-NAS | High-End-NAS |
|---|---|---|---|
| RAM gesamt | ~300-500 MB | ~300-500 MB | ~300-500 MB |
| Bewertung | **Optimal** | **Optimal** | **Optimal** |

### 5.4 Empfehlung zur Ressourcenstrategie

**Grundprinzip:** NoteNest ist als NAS-Anwendung konzipiert. Die Ressourcenlast muss so gering wie moeglich gehalten werden, da NAS-Systeme typischerweise mehrere Services gleichzeitig betreiben (Medienserver, Backup, Surveillance, etc.).

**Empfehlung: Modularer Ansatz mit konfigurierbaren Stufen**

- **Basisstufe (Standard):** Keine Office-Bearbeitung, nur Vorschau. PDF-Anzeige clientseitig. Minimale Ressourcen.
- **Erweiterte Stufe (optional):** Clientseitige Office-Vorschau mit begrenzter Bearbeitung. Hybrid-PDF mit servergestuetztem Seitenmanagement.
- **Vollausbau (optional, nur fuer leistungsstarke NAS):** Externer Office-Server (Collabora/OnlyOffice als optionaler Container). Volles PDF-Processing.

Jede Stufe wird ueber Konfigurationsvariablen aktiviert, sodass der Nutzer selbst entscheidet, welche Ressourcen er fuer NoteNest bereitstellen moechte.

---

## 6) Datei- und Speicherverwaltung

### 6.1 Dateierkennung und -typen

NoteNest muss Dateitypen zuverlaessig erkennen, um die passende Ansicht zu waehlen:

| Dateityp | Erweiterungen | Aktion |
|---|---|---|
| Markdown | .md, .markdown | Bestehender Editor (unveraendert) |
| Word | .docx, .doc | Office-Viewer/Editor |
| Excel | .xlsx, .xls, .csv | Office-Viewer/Editor (CSV ggf. speziell) |
| PowerPoint | .pptx, .ppt | Office-Viewer/Editor |
| PDF | .pdf | PDF-Viewer mit Annotationen |
| Bilder | .jpg, .png, .gif, .webp | Bildvorschau (ggf. bestehend) |
| Sonstige | * | Download-Link |

### 6.2 Speicherung von Annotationen

Fuer PDF-Annotationen und Office-Kommentare gibt es zwei Speichermodelle:

**Modell A: Inline-Speicherung (in der Datei selbst)**
- Annotationen werden direkt in die PDF/Office-Datei eingebettet
- Vorteil: Datei ist eigenstaendig und portabel
- Nachteil: Originaldatei wird veraendert; Konfliktpotenzial bei geteilten Ordnern

**Modell B: Sidecar-Speicherung (separate Metadaten-Datei)**
- Annotationen werden als `.annotations.json` neben der Originaldatei gespeichert (z. B. `bericht.pdf` → `bericht.pdf.annotations.json`)
- Vorteil: Originaldatei bleibt unberuehrt; leichter aufloesbar bei Konflikten
- Nachteil: Zwei Dateien gehoeren zusammen; Sidecar kann verloren gehen

**Modell C: Datenbank-Speicherung**
- Annotationen werden in der SQLite-Datenbank gespeichert, referenziert ueber Dateipfad und Datei-Hash
- Vorteil: Saubere Trennung; keine Aenderung am Dateisystem
- Nachteil: Annotationen gehen verloren, wenn Datei verschoben wird (ohne Pfad-Update)

**Empfehlung:** Modell B (Sidecar) als Standard mit optionalem "Export als annotierte PDF" (Modell A als Exportfunktion). Dies respektiert die bestehende Dateisystem-Philosophie von NoteNest und erhalt die Originaldateien.

### 6.3 Umgang mit grossen Dateien

Office-Dokumente und PDFs koennen erheblich groesser sein als Markdown-Dateien:

- **Markdown:** Typisch 1-100 KB
- **Office-Dokumente:** Typisch 100 KB - 50 MB
- **PDFs:** Typisch 100 KB - 500 MB (bei Scans/Bildern)

**Massnahmen:**
- Dateigroessen-Limit konfigurierbar (z. B. Standard: 50 MB, Maximum: 200 MB)
- Grosse Dateien werden nicht automatisch in die Sidebar-Vorschau geladen
- Streaming/Chunk-basiertes Laden fuer grosse PDFs
- Zwischenspeicherung (Cache) fuer generierte Vorschauen

---

## 7) Berechtigungs- und Sicherheitskonzept

### 7.1 Erweiterung des bestehenden Berechtigungsmodells

Das bestehende NoteNest-Berechtigungsmodell (Private/Geteilte Ordner, NAS-Permissions) bleibt unveraendert. Fuer Office/PDF-Dateien gelten dieselben Regeln:

- **Private Ordner:** Nur der Eigentuemer kann Office/PDF-Dateien sehen, bearbeiten und annotieren
- **Geteilte Ordner:** Alle berechtigten Nutzer koennen Dateien sehen; Bearbeitungs-/Annotationsrechte folgen den NAS-Dateisystem-Berechtigungen (read-only vs. read-write)
- **Annotation in geteilten Ordnern:** Bei Sidecar-Speicherung (Modell B) koennten nutzerspezifische Annotationen eingefuehrt werden (z. B. `bericht.pdf.annotations.username.json`), um Konflikte zu vermeiden

### 7.2 Sicherheitsaspekte

- **Eingabevalidierung:** Hochgeladene/bearbeitete Office-Dateien muessen validiert werden (Makros deaktivieren, Script-Injection verhindern)
- **Sandbox-Rendering:** Office-Viewer im iframe mit restriktiver Content-Security-Policy
- **Temporaere Dateien:** Zwischendateien (z. B. bei PDF-Seitenumordnung) muessen nach Abschluss geloescht werden
- **Kein serverseitiges Ausfuehren von Makros:** Office-Makros werden grundsaetzlich nicht ausgefuehrt

---

## 8) Benutzererfahrung und UI-Integration

### 8.1 Einbettung in die bestehende Oberflaeche

Die Integration sollte nahtlos in das bestehende NoteNest-UI erfolgen:

```
┌──────────────────────────────────────────────────────────┐
│  Sidebar                │  Hauptbereich                  │
│                         │                                │
│  📁 Meine Notizen      │  ┌──────────────────────────┐  │
│    📄 notiz.md          │  │  [Tab: Editor / Viewer]  │  │
│    📊 tabelle.xlsx  ←───┼──│                          │  │
│    📑 bericht.pdf   ←───┼──│  Office-Viewer           │  │
│    📝 praesentation.pptx│  │  oder                    │  │
│                         │  │  PDF-Viewer + Toolbar     │  │
│  📁 Geteilte Ordner    │  │                          │  │
│    📁 Familie           │  │  [Annotationsleiste]     │  │
│      📄 einkauf.docx    │  │                          │  │
│                         │  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Kontextabhaengige Toolbar

Abhaengig vom geoeffneten Dateityp zeigt die Toolbar unterschiedliche Aktionen:

**Markdown (bestehend):** Formatierung, Vorschau, Export
**Office-Dokument:** Zoom, Seitennavigation, Download, "Extern oeffnen"
**PDF:** Zoom, Seitennavigation, Anmerkungswerkzeuge, Seitenmanagement, Download

### 8.3 PDF-Anmerkungswerkzeuge

Die PDF-Toolbar sollte folgende Werkzeuge anbieten:

| Werkzeug | Beschreibung | Prioritaet |
|---|---|---|
| Textmarkierung | Ausgewaehlten Text gelb/gruen/rot hervorheben | Hoch |
| Textnotiz | Klebezettel-artige Notiz an einer Stelle platzieren | Hoch |
| Freihand-Zeichnung | Mit Stift/Finger auf dem PDF zeichnen | Mittel |
| Textfeld | Freies Textfeld an beliebiger Stelle einfuegen | Mittel |
| Stempel | Vordefinierte Stempel ("Geprueft", "Wichtig", "Entwurf") | Niedrig |
| Formular-Ausfuellung | Bestehende PDF-Formularfelder ausfuellen | Niedrig |

### 8.4 Seitenmanagement-Ansicht

Fuer das Neuanordnen von PDF-Seiten wird eine separate Ansicht vorgeschlagen:

- **Miniaturansicht:** Alle Seiten als Thumbnails in einem Grid
- **Drag-and-Drop:** Seiten per Drag-and-Drop verschieben
- **Kontextmenue:** Seite loeschen, Seite drehen (90°/180°/270°), Seite duplizieren
- **Speichern:** Aenderungen explizit bestaetigen (keine Auto-Save bei Strukturaenderungen)

---

## 9) Risiken und offene Punkte

### 9.1 Identifizierte Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Mitigationsstrategie |
|---|---|---|---|
| NAS-Ueberlastung durch Office-Server | Hoch (bei Strategie A) | Hoch | Modularer Ansatz; Office-Server nur optional |
| Format-Verlust bei clientseitiger Office-Vorschau | Mittel | Mittel | Nutzer explizit informieren; "Extern oeffnen" als Fallback |
| Annotationskonflikte in geteilten Ordnern | Mittel | Mittel | Nutzerspezifische Sidecar-Dateien |
| Grosse PDF-Dateien beeintraechtigen Browser-Performance | Mittel | Niedrig | Seitenweises Laden; Dateigroessen-Warnung |
| Sicherheitsluecken durch Office-Makros | Niedrig | Hoch | Makro-Ausfuehrung generell deaktivieren |
| Inkompatibilitaet mit aelteren Office-Formaten (.doc, .xls, .ppt) | Mittel | Niedrig | Nur moderne Formate (.docx, .xlsx, .pptx) vollstaendig unterstuetzen; Legacy-Formate als Download |

### 9.2 Offene Konzeptfragen

1. **Versionierung:** Sollen bearbeitete Office-/PDF-Dateien versioniert werden? Wie interagiert dies mit dem bestehenden Dateisystem-Ansatz?
2. **Synchronisation:** Wie verhaelt sich die Offline-PWA bei lokal annotierten PDFs, die spaeter synchronisiert werden muessen?
3. **Drittanbieter-Lizenzen:** Welche Lizenzbedingungen gelten fuer eingesetzte Viewer-/Editor-Komponenten? Sind diese mit der NoteNest-Lizenz kompatibel?
4. **Mobile Nutzung:** Wie gut funktionieren PDF-Annotationen auf Touch-Geraeten (Tablets, Smartphones)?
5. **Migrationspfad:** Wenn spaeter von Strategie C auf Strategie A (Office-Server) gewechselt wird – wie reibungslos ist dieser Uebergang?

---

## 10) Empfehlung und Fazit

### Empfohlene Gesamtstrategie

Basierend auf der Analyse der Anforderungen, Ressourcenauswirkungen und der NAS-zentrierten Ausrichtung von NoteNest wird folgender stufenweiser Ansatz empfohlen:

### Phase 1: Grundlagen (PDF-Viewer + Office-Vorschau)

- **PDF:** Clientseitiger Viewer mit grundlegenden Annotationen (Strategie P1/P3-Hybrid)
  - Seitennavigation, Zoom, Textmarkierung, Textnotizen
  - Annotationen als Sidecar-Dateien gespeichert
  - Minimale Serverlast
- **Office:** Nur-Vorschau mit "Extern oeffnen"-Button (Strategie C)
  - Serverseitige Thumbnail-Generierung fuer die Sidebar
  - Kein vollstaendiger Office-Editor
- **Ressourcen-Impact:** Gering (~100-300 MB zusaetzliches RAM bei Bedarf)
- **NAS-Kompatibilitaet:** Alle NAS-Profile, einschliesslich Einsteiger-Geraete

### Phase 2: Erweiterte PDF-Funktionen

- **PDF:** Seitenmanagement (Umordnen, Loeschen, Drehen) als servergestuetzte Operation
  - Drag-and-Drop-Seitenansicht
  - Erweiterte Annotationswerkzeuge (Freihand, Textfelder)
  - Export als annotiertes PDF
- **Office:** Clientseitige Vorschau mit verbesserter Darstellung (Strategie B)
  - Einfache Textbearbeitung in Word-Dokumenten
  - Tabellenansicht fuer Excel
- **Ressourcen-Impact:** Moderat (~200-500 MB zusaetzliches RAM bei Bedarf)
- **NAS-Kompatibilitaet:** Mittelklasse- und High-End-NAS

### Phase 3: Vollausbau (optional)

- **Office:** Optionaler externer Office-Server (Strategie A) als separater Docker-Container
  - Vollstaendige Bearbeitungsfaehigkeit
  - Co-Editing
  - Nur fuer Nutzer mit ausreichender Hardware
- **Konfigurierbar:** Aktivierung ueber Umgebungsvariable (z. B. `OFFICE_SERVER_ENABLED=true`, `OFFICE_SERVER_URL=http://collabora:9980`)
- **Ressourcen-Impact:** Hoch (+1-2 GB RAM, separater Container)
- **NAS-Kompatibilitaet:** Nur High-End-NAS oder dedizierte Server

### Zusammenfassung

| Aspekt | Empfehlung |
|---|---|
| Office-Bearbeitung | Stufenweise: Vorschau → Client-Rendering → Opt. Office-Server |
| PDF-Anzeige | Clientseitig (Browser-basiert) |
| PDF-Annotationen | Clientseitig mit Sidecar-Speicherung |
| PDF-Seitenmanagement | Hybrid (Client-UI + Server-Verarbeitung) |
| Annotationsspeicherung | Sidecar-Dateien (.annotations.json) |
| NAS-Ressourcenschonung | Modularer Ansatz mit konfigurierbaren Stufen |
| Sicherheit | Kein Makro-Ausfuehren; iframe-Sandbox; Eingabevalidierung |

**Kernaussage:** Die empfohlene Strategie priorisiert clientseitige Verarbeitung, um die NAS-Ressourcen zu schonen, und bietet gleichzeitig einen klaren Erweiterungspfad fuer Nutzer mit leistungsfaehigerer Hardware. Die modulare Konfiguration stellt sicher, dass NoteNest auf allen NAS-Profilen performant bleibt.
