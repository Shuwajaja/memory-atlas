# Memory Atlas — Design und Bedienung

## Richtung

**FQL Research Editorial:** dunkle, ruhige Rechercheoberfläche, lesbare Inhalte, präzise Quellen und klare Aktionen. Visuelle Priorität: Quelle und Aussage; Status und Gültigkeit; anschließend Beziehungen. Ein animierter Graph darf die Arbeit unterstützen, aber keine geprüfte Aussage vortäuschen.

## Tokens

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#0B1117` | Seitenhintergrund |
| `--surface` | `#121C24` | Karten/Panel |
| `--surface-raised` | `#192630` | Dialoge/aktive Zeilen |
| `--text` | `#E9F0F4` | Haupttext |
| `--muted` | `#AAB8C2` | Sekundärtext |
| `--accent` | `#74DEC1` | Hauptaktion/Selektion |
| `--warning` | `#F5C17A` | offen/prüfen |
| `--danger` | `#FF8D99` | Konflikt/Fehler |
| `--info` | `#92BBFF` | Quelle/Information |
| `--border` | `#31434F` | Trennlinien |
| `--radius-card` | `16px` | Karten |
| `--radius-control` | `10px` | Eingaben/Buttons |
| `--space-unit` | `4px` | Abstände 4/8/12/16/24/32 |

Text: Inter lokal bündeln, mit vorhandener Lizenzdatei. Display: Editorial New nur bei vorhandener passender Lizenz; sonst `Georgia, serif`. Kein automatischer Kauf und kein externer Font-Request. Fließtext 16px/1.55, Metadaten ≥13px, UI 14–16px, Überschriften 24–36px. Monospace nur für IDs und technische Details. Kontraste mit realen Kombinationen messen; Werte hier sind Designvorgaben, kein Accessibility-Testbericht.

Glaseffekte zurückhaltend: leichte transparente Flächen, klare Textkontraste, kein flächiges Blur über großen Textblöcken. Animationen 120–180ms; `prefers-reduced-motion` vollständig respektieren. Keine dauerhaften Partikel, blinkenden Diagramme oder Fortschrittsanzeigen ohne echten Job.

## Grundlayout

Desktop: Navigation links (208px), Arbeitsbereich flexibel, einklappbarer Quelleninspektor rechts (360–440px). Kopfzeile: Workspace, Suche, Zeitraum, Speicherstatus. Workspace ist ein Daten-/Freigabebereich, kein zusätzlicher Chatkanal. Tabs erhalten Scrollposition und Auswahl. URL-Hash darf Ansichten und nicht-sensitive Filter enthalten, keine Chattexte oder Geheimnisse.

Ab 1024px Inspektor als Drawer; auf 390px Navigation als Menü, Listen als Karten und Detailansicht vollflächig. Keine horizontale Pflichtscrollleiste für die Kernactions. Graph auf Mobil optional öffnen; Liste ist immer verfügbar.

## Ansichten

| Ansicht | Inhalt | Primäre Aktion | Wichtiger Zustand |
|---|---|---|---|
| Übersicht | Importabdeckung, offene Konflikte, freigegebene Karten, Speicherhinweis | „Dateien importieren“ / „Prüfung fortsetzen“ | Leerer Workspace mit Demo-Option |
| Gespräche | Suchbare Gesprächsliste, Nachrichten, Zweigwechsel, Themen-/Datumsfilter | „Aus Auswahl Wissenskarte erstellen“ | Alternative Antwort / Datum unbekannt |
| Wissen | Karten oder Tabelle, Art/Projekt/Kategorie/Statusfilter | „Quelle prüfen“ | Noch ungeprüft ist sichtbar |
| Änderungen | Alt/Neu nebeneinander, Quellen, Gültigkeitsgrenzen | „Ersetzt ab …“ / „Beide behalten“ | Unterschiedliche Umgebungen ≠ Konflikt |
| Zeitreise | Zeitachse; „Gültig am“ und „Damals bekannt“ | Zeitpunkt wählen | Rückwirkende Korrektur kenntlich |
| Beziehungen | Projekt-, Karten- und Themenknoten, benannte Kanten | Knoten → Detail | „150 von … Knoten“ statt verstecktem Abschneiden |
| Prüflabor | Konflikte, fehlende Quellen, Datenlücken, fällige Überprüfungen | „Prüfen“ | Grund + Quelle + mögliche Aktion |
| Quellen | Dateien, Profile, Prüfsummen, Importdiagnosen | Importbericht ansehen | Teilweise unterstützt / abgelehnt |
| Memory-Sets | Auswahl, Empfänger-Scope, Grenzen, Vorschau, Ausschlüsse | „Diesen Stand freigeben“ → „Exportieren“ | Freigabe nach Änderung ungültig |
| Einstellungen | Zeitzone, private Kategoriegrenzen, Review-Fristen | „Projekt speichern“ | Kein geheimer automatischer Cloud-Modus |

## Wissenskarte

Titel ≤100 Zeichen; Aussage möglichst ein Gedanke. Darunter vier beschriftete Merkmale: **Herkunft**, **Prüfung durch dich**, **Gültigkeit**, **Belegstatus**. Beispiel: „Nutzerentscheidung · angenommen · aktuell · mit Quelle abgeglichen“. Grün bedeutet nur die ausdrücklich daneben beschriebene Eigenschaft.

Die Karte zeigt Projekt/Umgebung, Aussagedatum, Gültigkeit und Review-Fälligkeit. Die Quelle öffnet direkt den genauen Ausschnitt, nicht nur den gesamten Chat. Technische IDs werden über „Details“ sichtbar. Wiederholte Kopien derselben Aussage bekommen keine vermeintlich höhere Wahrheitspunktzahl.

## Alt/Neu-Dialog

Beide Aussagen mit Quelle und Originalrolle. Ein Kopf zeigt, ob Projekt/Umgebung/Prädikat gleich sind. Mögliche Aktionen: „Ersetzt ab Datum“, „Widerspruch offen lassen“, „Unterschiedlicher Geltungsbereich“, „Doppelte Aussage“, „Vorschlag verwerfen“. Für Ersetzung sind Datum und kurze Begründung Pflicht. Die Vorschau zeigt, welche Memory-Sets dadurch ungültig werden. Kein vorselektierter destruktiver Klick.

## Import und Speicherung

Dateiauswahl erlaubt mehrere JSON-Dateien. ZIP wird in P1 mit klarer Entpackanleitung abgewiesen. Nach Parsing: Zählwerte, Profile, Zweige, unbekannte Datumswerte, abgelehnte Konversationen, Größenlimits. Commit des Imports erst nach Vorschau. Abbrechen verwirft die Staging-Daten.

Status oben: „Nicht gespeichert“ / „Projektdatei heruntergeladen um …“. Ein Browserdownload ist keine Garantie, dass der Mensch ihn an einem dauerhaften Ort abgelegt hat. Vor Tab-Verlassen bei Änderungen warnen. Keine stillschweigende Behauptung „automatisch gesichert“. P2 ersetzt dies durch echte Archivtransaktionen und einen getrennten Backupstatus.

## Export

„Projekt sichern“ und „Memory exportieren“ sind verschiedene Buttons. Exportdialog zeigt ausgewählte Aussagen, Empfänger, Projekt/Umgebung, Stichtag, Ablaufdatum, ausgeschlossene Karten samt Grund, Zeichen-/Tokenabschätzung. Verbindlich sind max. 50 Karten und 16.000 UTF-8-Bytes für den eigentlichen Memory-Text; eine Tokenanzeige heißt „Schätzung“.

Die abschließende Freigabe bindet den exakten Preview-Digest. Ändert sich eine Karte, Policy, Gültigkeit, Empfängerwahl oder Auswahl, wird der Button wieder „Neu prüfen“. Keine verdeckte Kürzung; ein Überlauf blockiert und bietet kleinere Auswahl an.

## Accessibility und Qualität

Semantische Buttons/Headings/Labels, Tastaturrouten für alle Aktionen, Fokusfalle und Fokus-Rückgabe bei Dialogen, `Escape` schließt nicht-destruktive Dialoge. Fehler neben dem betroffenen Feld plus Live-Region. Status nie nur farblich. Hit-Flächen mindestens 44×44px für zentrale Touch-Aktionen. Prüfziel WCAG 2.2 AA; automatisierte axe-Prüfung plus manuelle Tastaturprüfung. Ein automatischer Test ersetzt keinen vollständigen Screenreader-Test.

Leer-, Lade-, Fehler-, Teilimport-, Offline- und Nichtgespeichert-Zustände gehören zur Abnahme. Demo-Daten haben dauerhaft „Demo · synthetisch“ im Workspace-Kopf. Graphbeziehungen ohne Datenbasis werden nicht dargestellt.
