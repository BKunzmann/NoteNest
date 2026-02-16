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
11. [Stufenkonzept: Code-Architektur und Admin-Konfiguration](#11-stufenkonzept-code-architektur-und-admin-konfiguration)

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

---

## 11) Stufenkonzept: Code-Architektur und Admin-Konfiguration

Dieser Abschnitt beschreibt konzeptionell, wie die drei Ausbaustufen im Code strukturiert, vom Admin ueber Umgebungsvariablen gesteuert und in der Docker-Compose eingerichtet werden.

### 11.1 Zentrale Steuerung ueber eine einzelne Umgebungsvariable

Analog zum bestehenden `DEPLOYMENT_MODE` (standalone/nas) wird eine neue Variable `DOCUMENT_FEATURES` eingefuehrt, die die aktive Stufe bestimmt. Dies haelt die Konfiguration fuer den Admin minimal:

```
# .env
# ─────────────────────────────────────────────
# Dokumenten-Features (Stufen)
# ─────────────────────────────────────────────
# off      = Keine Office/PDF-Funktionen (Standard, bisheriges Verhalten)
# basic    = Stufe 1: PDF-Viewer + Office-Vorschau (nur lesen)
# enhanced = Stufe 2: PDF-Annotationen + Seitenmanagement + einfache Office-Bearbeitung
# full     = Stufe 3: Externer Office-Server (Collabora/OnlyOffice) + alles aus Stufe 2
DOCUMENT_FEATURES=off
```

Zusaetzlich gibt es stufen-spezifische Variablen, die nur gelesen werden, wenn die jeweilige Stufe aktiv ist:

```
# ─────────────────────────────────────────────
# Stufe 1+2+3: Allgemeine Dokument-Einstellungen
# ─────────────────────────────────────────────
DOCUMENT_MAX_FILE_SIZE_MB=50          # Maximale Dateigroesse (Standard: 50 MB)
DOCUMENT_ALLOWED_EXTENSIONS=.docx,.xlsx,.pptx,.pdf  # Erlaubte Erweiterungen
DOCUMENT_ANNOTATION_STORAGE=sidecar   # sidecar | database

# ─────────────────────────────────────────────
# Nur Stufe 2+3: PDF-Server-Operationen
# ─────────────────────────────────────────────
DOCUMENT_PDF_TEMP_DIR=/tmp/notenest-pdf   # Temp-Verzeichnis fuer PDF-Verarbeitung
DOCUMENT_PDF_TEMP_MAX_AGE_HOURS=2         # Auto-Cleanup nach X Stunden

# ─────────────────────────────────────────────
# Nur Stufe 3: Externer Office-Server
# ─────────────────────────────────────────────
OFFICE_SERVER_TYPE=collabora          # collabora | onlyoffice
OFFICE_SERVER_URL=http://collabora:9980
OFFICE_SERVER_SECRET=shared-secret-with-office-container
```

### 11.2 Einordnung in die bestehende Backend-Konstanten-Datei

Die Stufenlogik wird analog zu `DEPLOYMENT_MODE` und `REGISTRATION_ENABLED` in `backend/src/config/constants.ts` verankert. Konzeptionell wuerden dort folgende Konstanten entstehen:

```
# Bestehende Konstanten (unveraendert):
  DEPLOYMENT_MODE           → standalone | nas
  IS_STANDALONE_MODE        → boolean
  IS_NAS_MODE               → boolean
  REGISTRATION_ENABLED      → boolean

# Neue Konstanten:
  DOCUMENT_FEATURES         → 'off' | 'basic' | 'enhanced' | 'full'
  IS_DOCUMENTS_ENABLED      → boolean  (true wenn != 'off')
  IS_DOCUMENTS_BASIC        → boolean  (true wenn >= 'basic')
  IS_DOCUMENTS_ENHANCED     → boolean  (true wenn >= 'enhanced')
  IS_DOCUMENTS_FULL         → boolean  (true wenn == 'full')
```

Das Stufenmodell ist **kumulativ**: Stufe 2 schliesst Stufe 1 ein, Stufe 3 schliesst Stufe 1+2 ein. Jeder Code-Bereich prueft die entsprechende Konstante und aktiviert/deaktiviert sich selbst.

### 11.3 Backend: Neue Service- und Routen-Struktur

Die bestehende Projektstruktur (Controller → Route → Service) wird beibehalten. Folgende neue Module werden konzeptionell benoetigt:

```
backend/src/
├── config/
│   └── constants.ts              ← Erweitert um DOCUMENT_FEATURES
├── controllers/
│   ├── document.controller.ts    ← NEU: Datei-Vorschau, Download, Typ-Erkennung
│   ├── pdf.controller.ts         ← NEU: PDF-spezifische Operationen
│   └── office.controller.ts      ← NEU: Office-Server-Proxy (nur Stufe 3)
├── routes/
│   ├── document.routes.ts        ← NEU: Registriert Routen nur wenn Stufe >= basic
│   ├── pdf.routes.ts             ← NEU: PDF-Routen, teilweise nur ab Stufe 2
│   └── office.routes.ts          ← NEU: Office-Server-Routen, nur Stufe 3
├── services/
│   ├── document.service.ts       ← NEU: Dateityp-Erkennung, Vorschau-Generierung
│   ├── pdf.service.ts            ← NEU: PDF-Seitenmanagement, Annotation-Merge
│   ├── annotation.service.ts     ← NEU: Sidecar-Datei lesen/schreiben
│   └── office.service.ts         ← NEU: WOPI-Protokoll, Office-Server-Kommunikation
├── middleware/
│   └── documentFeature.middleware.ts  ← NEU: Gate-Middleware je Stufe
└── types/
    └── document.ts               ← NEU: Interfaces fuer Annotationen, PDF-Ops
```

**Bedingte Routen-Registrierung:** Die neuen Routen werden in `index.ts` nur registriert, wenn die jeweilige Stufe aktiv ist. Beispiel-Konzept:

```
# In index.ts (Pseudocode):

  if (IS_DOCUMENTS_ENABLED) {
    app.use('/api/documents', documentRoutes)    # Stufe 1+
  }
  if (IS_DOCUMENTS_ENHANCED) {
    app.use('/api/pdf', pdfRoutes)               # Stufe 2+
  }
  if (IS_DOCUMENTS_FULL) {
    app.use('/api/office', officeRoutes)          # Stufe 3
  }
```

**Gate-Middleware:** Zusaetzlich schuetzt eine Middleware jeden Endpunkt, falls ein Client versucht, eine Funktion aufzurufen, die auf dem Server nicht aktiviert ist. Der Server antwortet dann mit einem klaren Fehler (z. B. HTTP 403 mit Hinweis "Feature nicht aktiviert").

### 11.4 Backend: API-Endpunkte je Stufe

#### Stufe 1 (basic) – Nur lesen

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/documents/preview/:type/*path` | GET | Vorschau-Bild/Thumbnail eines Office-Dokuments |
| `/api/documents/info/:type/*path` | GET | Metadaten (Seitenzahl, Groesse, Format) |
| `/api/documents/download/:type/*path` | GET | Datei-Download (bestehender File-Service, erweitert) |
| `/api/documents/pdf-stream/:type/*path` | GET | PDF-Datei als Stream fuer clientseitigen Viewer |

#### Stufe 2 (enhanced) – Lesen + Annotieren + Seitenmanagement

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| _Alle aus Stufe 1_ | | |
| `/api/pdf/annotations/:type/*path` | GET | Annotationen (Sidecar) laden |
| `/api/pdf/annotations/:type/*path` | PUT | Annotationen speichern |
| `/api/pdf/annotations/:type/*path` | DELETE | Annotationen loeschen |
| `/api/pdf/pages/reorder` | POST | Seiten umordnen (Server-Operation) |
| `/api/pdf/pages/delete` | POST | Seiten entfernen |
| `/api/pdf/pages/rotate` | POST | Seiten drehen |
| `/api/pdf/export-annotated` | POST | PDF mit eingebrannten Annotationen exportieren |

#### Stufe 3 (full) – Alles + Office-Bearbeitung

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| _Alle aus Stufe 1+2_ | | |
| `/api/office/wopi/files/:fileId` | GET | WOPI CheckFileInfo |
| `/api/office/wopi/files/:fileId/contents` | GET | WOPI GetFile |
| `/api/office/wopi/files/:fileId/contents` | POST | WOPI PutFile |
| `/api/office/session` | POST | Office-Editing-Session erstellen |
| `/api/office/session/:sessionId` | DELETE | Session beenden |

### 11.5 Frontend: Komponentenstruktur und Feature-Gates

Das Frontend erhaelt seine Feature-Konfiguration vom Server ueber einen bestehenden oder neuen Settings-Endpunkt. Beim App-Start laedt das Frontend die aktive Stufe und blendet Komponenten entsprechend ein/aus.

#### Neue Frontend-Module (konzeptionell)

```
frontend/src/
├── components/
│   ├── DocumentViewer/
│   │   ├── DocumentRouter.tsx       ← NEU: Waehlt Viewer je nach Dateityp
│   │   ├── PdfViewer.tsx            ← NEU: PDF-Anzeige (Stufe 1+)
│   │   ├── PdfAnnotationToolbar.tsx ← NEU: Anmerkungs-Werkzeuge (Stufe 2+)
│   │   ├── PdfPageManager.tsx       ← NEU: Seiten-Grid mit Drag&Drop (Stufe 2+)
│   │   ├── OfficePreview.tsx        ← NEU: Thumbnail-Vorschau (Stufe 1)
│   │   ├── OfficeClientViewer.tsx   ← NEU: Client-Rendering (Stufe 2)
│   │   └── OfficeServerFrame.tsx    ← NEU: iframe fuer Collabora/OnlyOffice (Stufe 3)
│   ├── Editor/
│   │   └── MarkdownEditor.tsx       ← Bestehend (unveraendert)
│   └── FileManager/
│       └── FileItem.tsx             ← Erweitert: Icon/Vorschau je Dateityp
├── store/
│   ├── fileStore.ts                 ← Erweitert: Dateityp-Erkennung
│   └── documentStore.ts            ← NEU: Annotations-State, PDF-Seiten-State
├── services/
│   └── api.ts                       ← Erweitert: Document-API-Client
└── types/
    └── document.ts                  ← NEU: Annotation, PdfPage, DocumentFeatures
```

#### Feature-Erkennung im Frontend

Das Frontend fragt beim Start die Server-Konfiguration ab (z. B. ueber `/api/settings/features` oder den bestehenden Health-Endpunkt). Der Server liefert:

```
{
  "documentFeatures": "enhanced",
  "capabilities": {
    "pdfViewer": true,
    "pdfAnnotations": true,
    "pdfPageManagement": true,
    "officePreview": true,
    "officeClientEdit": true,
    "officeServerEdit": false,
    "maxFileSizeMB": 50
  }
}
```

Damit entscheidet der `DocumentRouter`, welche Komponente gerendert wird:

```
# DocumentRouter (Pseudocode):

  Wenn Dateityp == PDF:
    Wenn capabilities.pdfViewer  → zeige PdfViewer
    Wenn capabilities.pdfAnnotations → zeige PdfAnnotationToolbar
    Wenn capabilities.pdfPageManagement → zeige "Seiten verwalten"-Button

  Wenn Dateityp == Office:
    Wenn capabilities.officeServerEdit → zeige OfficeServerFrame (iframe)
    Wenn capabilities.officeClientEdit → zeige OfficeClientViewer
    Wenn capabilities.officePreview   → zeige OfficePreview + "Extern oeffnen"
    Sonst                              → zeige Download-Link
```

#### Integration in NotesPage

Die bestehende `NotesPage.tsx` rendert aktuell den `MarkdownEditor` fuer die ausgewaehlte Datei. Konzeptionell wird dies um eine Fallunterscheidung erweitert:

```
# In NotesPage.tsx (Pseudocode):

  Wenn selectedFile.fileType in ['md', 'txt']:
    → MarkdownEditor (bisheriges Verhalten)
  Wenn selectedFile.fileType in ['pdf', 'docx', 'xlsx', 'pptx']
       UND IS_DOCUMENTS_ENABLED:
    → DocumentRouter (neuer Viewer)
  Sonst:
    → Download-Ansicht (Dateiname + Groesse + Download-Button)
```

### 11.6 Docker-Compose: Konfigurationsbeispiele fuer jede Stufe

#### Stufe 1: Basis (PDF-Viewer + Office-Vorschau)

Minimalste Aenderung zur bestehenden Konfiguration – nur eine zusaetzliche Zeile in `.env`:

```yaml
# docker-compose.yml (NAS) – Stufe 1
# ──────────────────────────────────
# Keine Aenderungen an services/volumes noetig.
# Die bestehende docker-compose.yml bleibt 1:1 identisch.
# Nur in .env hinzufuegen:

# .env
DOCUMENT_FEATURES=basic
```

Kein zusaetzlicher Container, kein zusaetzliches Volume, keine Port-Aenderung. Der NoteNest-Container erkennt die Variable und aktiviert die PDF-/Office-Vorschau-Routen.

#### Stufe 2: Erweitert (Annotationen + Seitenmanagement)

Es wird ein zusaetzliches Temp-Volume empfohlen, damit PDF-Zwischendateien nicht im RAM gehalten werden muessen:

```yaml
# docker-compose.yml (NAS) – Stufe 2
# ──────────────────────────────────
services:
  notenest:
    # ... (bestehende Konfiguration unveraendert) ...
    volumes:
      # ... (bestehende Volumes) ...

      # ============================================
      # NEU: Temp-Verzeichnis fuer PDF-Verarbeitung (Stufe 2+)
      # ============================================
      - notenest-pdf-temp:/tmp/notenest-pdf

volumes:
  notenest-pdf-temp:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: size=256m    # Begrenzt auf 256 MB RAM-Disk
```

```
# .env
DOCUMENT_FEATURES=enhanced
DOCUMENT_PDF_TEMP_DIR=/tmp/notenest-pdf
DOCUMENT_PDF_TEMP_MAX_AGE_HOURS=2
```

#### Stufe 3: Vollausbau (Externer Office-Server)

Hier kommt ein zweiter Container hinzu. Der Admin waehlt zwischen Collabora und OnlyOffice:

```yaml
# docker-compose.yml (NAS) – Stufe 3 mit Collabora
# ────────────────────────────────────────────────
services:
  notenest:
    # ... (bestehende Konfiguration) ...
    volumes:
      # ... (bestehende + Stufe-2-Volumes) ...
    depends_on:
      collabora:
        condition: service_healthy
    environment:
      - DOCUMENT_FEATURES=full
      - OFFICE_SERVER_TYPE=collabora
      - OFFICE_SERVER_URL=http://collabora:9980

  # ============================================
  # NEU: Collabora Online (nur Stufe 3)
  # ============================================
  collabora:
    image: collabora/code:latest
    container_name: notenest-collabora
    restart: unless-stopped
    cap_add:
      - MKNOD
    environment:
      - aliasgroup1=https://notenest.example.com:443
      - username=admin
      - password=CHANGE-ME-STRONG-PASSWORD
      - "extra_params=--o:ssl.enable=false"
    networks:
      - notenest-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9980/hosting/discovery || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M

networks:
  notenest-network:
    driver: bridge
```

```yaml
# ALTERNATIVE: docker-compose.yml (NAS) – Stufe 3 mit OnlyOffice
# ──────────────────────────────────────────────────────────────
services:
  notenest:
    # ... (wie oben, mit angepassten Variablen) ...
    environment:
      - DOCUMENT_FEATURES=full
      - OFFICE_SERVER_TYPE=onlyoffice
      - OFFICE_SERVER_URL=http://onlyoffice:80
      - OFFICE_SERVER_SECRET=mein-geheimes-shared-secret

  onlyoffice:
    image: onlyoffice/documentserver:latest
    container_name: notenest-onlyoffice
    restart: unless-stopped
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=mein-geheimes-shared-secret
    networks:
      - notenest-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost/healthcheck || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### 11.7 Dockerfile: Bedingte Abhaengigkeiten

Das bestehende Dockerfile installiert bereits Chromium fuer Puppeteer (PDF-Export). Fuer Stufe 2 werden zusaetzliche PDF-Verarbeitungstools benoetigt. Um das Image fuer Stufe-1-Nutzer nicht unnoetig aufzublaehen, gibt es zwei Ansaetze:

**Ansatz A: Ein einziges Image mit allen Tools (einfacher)**

```
# Vorteile: Ein Image fuer alle Stufen, kein Build-Argument noetig
# Nachteil: Image-Groesse steigt um ~50-100 MB

# Im Dockerfile (zusaetzlich zu bestehenden apk-Paketen):
# PDF-Verarbeitungstools fuer Stufe 2+
RUN apk add --no-cache qpdf poppler-utils
```

Die Tools sind installiert, werden aber nur genutzt, wenn `DOCUMENT_FEATURES` auf `enhanced` oder `full` steht. Auf Stufe `off` oder `basic` verbrauchen sie keinen RAM, nur Speicherplatz im Image.

**Ansatz B: Build-Argument fuer schlankes Image (komplexer)**

```
# Dockerfile mit Build-Argument:
ARG DOCUMENT_LEVEL=basic
RUN if [ "$DOCUMENT_LEVEL" = "enhanced" ] || [ "$DOCUMENT_LEVEL" = "full" ]; then \
      apk add --no-cache qpdf poppler-utils; \
    fi
```

```yaml
# docker-compose.yml:
services:
  notenest:
    build:
      context: .
      args:
        DOCUMENT_LEVEL: enhanced
```

**Empfehlung:** Ansatz A (ein Image), da der Speicher-Overhead gering ist (~50 MB) und die Administrations-Komplexitaet deutlich niedriger bleibt. Der Admin muss nicht neu bauen, wenn er die Stufe wechselt.

### 11.8 Admin-Workflow: Stufenwechsel

Der Wechsel zwischen Stufen soll fuer den Admin so einfach wie moeglich sein:

#### Wechsel von "off" zu "basic" (Stufe 0 → 1)

```bash
# 1. .env bearbeiten
nano .env
# DOCUMENT_FEATURES=basic

# 2. Container neu starten (kein Rebuild noetig)
docker-compose restart notenest
```

Aufwand: 1 Minute, kein Rebuild, kein neuer Container.

#### Wechsel von "basic" zu "enhanced" (Stufe 1 → 2)

```bash
# 1. .env bearbeiten
nano .env
# DOCUMENT_FEATURES=enhanced
# DOCUMENT_PDF_TEMP_DIR=/tmp/notenest-pdf

# 2. Optional: tmpfs-Volume in docker-compose.yml hinzufuegen
#    (empfohlen, aber nicht zwingend)

# 3. Container neu starten
docker-compose up -d notenest
```

Aufwand: 2-5 Minuten, optional Volume-Anpassung.

#### Wechsel von "enhanced" zu "full" (Stufe 2 → 3)

```bash
# 1. .env bearbeiten
nano .env
# DOCUMENT_FEATURES=full
# OFFICE_SERVER_TYPE=collabora
# OFFICE_SERVER_URL=http://collabora:9980

# 2. Collabora-Service in docker-compose.yml hinzufuegen
#    (siehe Abschnitt 11.6, Stufe 3)

# 3. Beide Container starten
docker-compose up -d
```

Aufwand: 5-15 Minuten (Collabora-Image herunterladen: ~1-2 GB).

#### Rueckstufung (z. B. Stufe 3 → 1)

```bash
# 1. .env bearbeiten
nano .env
# DOCUMENT_FEATURES=basic

# 2. Office-Container stoppen
docker-compose stop collabora
docker-compose rm collabora

# 3. NoteNest neu starten
docker-compose restart notenest
```

Bestehende Annotationen (Sidecar-Dateien) bleiben erhalten und sind weiterhin als Dateien im Dateisystem vorhanden, werden aber nicht mehr im UI angezeigt. Beim erneuten Hochstufen sind sie sofort wieder verfuegbar.

### 11.9 Annotation-Service: Sidecar-Datei-Konzept

Das Sidecar-Modell muss im Code einheitlich implementiert werden. Konzeptionell funktioniert es so:

**Dateinamen-Konvention:**
```
Originaldatei:   /data/shared/Familie/bericht.pdf
Sidecar (global): /data/shared/Familie/.notenest-annotations/bericht.pdf.annotations.json
Sidecar (User):   /data/shared/Familie/.notenest-annotations/bericht.pdf.annotations.max.json
```

Die Annotationen werden in einem versteckten Ordner (`.notenest-annotations/`) abgelegt, analog zum bestehenden `.notenest-trash/`-Ordner. Dies haelt das Datei-Listing sauber.

**Sidecar-Dateiformat (konzeptionell):**
```
{
  "version": 1,
  "sourceFile": "bericht.pdf",
  "sourceHash": "sha256:abc123...",
  "createdAt": "2026-02-16T10:00:00Z",
  "updatedAt": "2026-02-16T14:30:00Z",
  "author": "max",
  "annotations": [
    {
      "id": "ann-uuid-1",
      "type": "highlight",
      "page": 3,
      "position": { "x": 100, "y": 200, "width": 300, "height": 20 },
      "color": "#ffff00",
      "text": "Wichtiger Absatz",
      "createdAt": "2026-02-16T10:05:00Z"
    },
    {
      "id": "ann-uuid-2",
      "type": "note",
      "page": 5,
      "position": { "x": 400, "y": 150 },
      "content": "Hier nochmal nachfragen",
      "createdAt": "2026-02-16T10:10:00Z"
    }
  ]
}
```

**Dateisystem-Filterung:** Der bestehende File-Service filtert bereits `.notenest-trash/` aus der Dateiliste. Analog wird `.notenest-annotations/` gefiltert, sodass Nutzer diese Ordner nicht in der Sidebar sehen.

### 11.10 Feature-Capabilities-Endpunkt

Damit das Frontend die aktive Stufe kennt, liefert der Server die Konfiguration ueber einen Capabilities-Endpunkt. Dieser kann in den bestehenden Health- oder Settings-Endpunkt integriert werden:

**Option A: Erweiterung des Health-Endpunkts**
```
GET /api/health

Antwort (erweitert):
{
  "status": "ok",
  "version": "1.4.0",
  "features": {
    "documentFeatures": "enhanced",
    "pdfViewer": true,
    "pdfAnnotations": true,
    "pdfPageManagement": true,
    "officePreview": true,
    "officeClientEdit": true,
    "officeServerEdit": false,
    "officeServerType": null,
    "maxFileSizeMB": 50
  }
}
```

**Option B: Eigener Endpunkt**
```
GET /api/settings/features

Antwort:
{
  "documentFeatures": "enhanced",
  "capabilities": { ... }
}
```

**Empfehlung:** Option A, da der Health-Endpunkt bereits beim App-Start abgefragt wird und keine zusaetzliche Anfrage noetig ist.

### 11.11 Zusammenfassung: Was muss der Admin je Stufe tun?

| Aktion | Stufe 1 (basic) | Stufe 2 (enhanced) | Stufe 3 (full) |
|---|---|---|---|
| `.env` aendern | `DOCUMENT_FEATURES=basic` | `DOCUMENT_FEATURES=enhanced` | `DOCUMENT_FEATURES=full` |
| Zusaetzliche `.env`-Variablen | Keine | `DOCUMENT_PDF_TEMP_DIR` (optional) | `OFFICE_SERVER_*` Variablen |
| `docker-compose.yml` aendern | Keine Aenderung | Optional: tmpfs-Volume | Office-Container hinzufuegen |
| Neuer Docker-Container | Nein | Nein | Ja (Collabora oder OnlyOffice) |
| Docker-Image neu bauen | Nein | Nein | Nein (Office-Server ist eigenes Image) |
| Zusaetzlicher RAM-Bedarf | ~0 MB | ~50-200 MB (Peak) | ~1-2 GB (dauerhaft) |
| Zusaetzlicher Speicher | ~0 MB | ~0 MB | ~1-2 GB (Office-Image) |
| Container-Restart noetig | Ja | Ja | Ja + neuer Container |
| Rueckstufung moeglich | Ja, verlustfrei | Ja, Annotationen bleiben | Ja, Office-Container stoppen |

### 11.12 Risiken der Code-Architektur

| Risiko | Beschreibung | Mitigationsstrategie |
|---|---|---|
| Feature-Creep | Stufen werden ueberladen, Grenzen verwischen | Klare Trennung in Middleware: jeder Endpunkt deklariert seine Mindeststufe |
| Frontend-Bundle-Groesse | PDF- und Office-Bibliotheken vergroessern das Bundle | Lazy Loading: Viewer-Komponenten nur laden, wenn Stufe aktiv und Datei geoeffnet |
| Konfigurationsfehler | Admin setzt `DOCUMENT_FEATURES=full` ohne Office-Container | Health-Check prueft Erreichbarkeit des Office-Servers; Fallback auf Stufe 2 mit Warnung |
| Sidecar-Verwaiste Dateien | Originaldatei wird geloescht, Sidecar bleibt | Cleanup-Job: beim Loeschen einer Datei auch `.notenest-annotations/` pruefen |
| Inkonsistenz nach Stufenwechsel | Annotationen aus Stufe 2 sind in Stufe 1 nicht sichtbar | Annotationen als Dateien erhalten; nur UI-Zugang wird eingeschraenkt |
