# Memory Atlas — SPECC für Cursor

**Version:** 1.0 · **Stand:** 26. Oktober 2026 · **Lieferung:** Spezifikation, Verträge, synthetische Beispieldaten und Umsetzungsplan. Eine fertige Anwendung ist nicht enthalten.

Memory Atlas macht aus exportierten KI-Gesprächen nachvollziehbares Projektwissen: Gespräche ansehen, Aussagen mit Originalstellen verbinden, Widersprüche und Änderungen prüfen und ein bewusst ausgewähltes Memory-Paket für einen Agenten exportieren.

## In deinem vorhandenen Repository verwenden

1. Dieses ZIP **im Repository entpacken**. Der Ordner `memory-atlas-specc/` liegt danach neben der vorhandenen README. Vorhandene Dateien werden dadurch nicht ersetzt.
2. Das Repository in Cursor öffnen.
3. Den Auftrag aus [CURSOR_START.md](CURSOR_START.md) an Cursor geben. Kurzfassung: „Lies `memory-atlas-specc/CURSOR_START.md`, prüfe den bestehenden Stand und setze P0 und P1 anhand des Plans um.“
4. Cursor soll den vorhandenen Code zuerst prüfen, anschließend den ersten nutzbaren Ablauf bauen: **Import → Quelle ansehen → Wissenskarte prüfen → Alt/Neu entscheiden → Memory freigeben → exportieren**.

Die Repo-URL und der tatsächliche Inhalt des vorhandenen Repositories waren bei der Erstellung dieses Pakets nicht verfügbar. Es wird deshalb kein vorhandener Build, Branch oder Prototyp als geprüft ausgegeben. Der frühere HTML-Prototyp ist ein Hinweis aus der bisherigen Planung; Cursor muss feststellen, ob er im Repo liegt.

## Lesereihenfolge

| Datei | Zweck |
|---|---|
| [CURSOR_START.md](CURSOR_START.md) | Ausführbarer Arbeitsauftrag, Umfang und erste Schritte |
| [SPECC.md](SPECC.md) | Verbindlicher Produktumfang und Anforderungen MA-001 bis MA-030 |
| [DESIGN.md](DESIGN.md) | FQL Research Editorial, Ansichten, Bedienung und Zustände |
| [docs/KNOWLEDGE_RULES.md](docs/KNOWLEDGE_RULES.md) | Alte/neue Aussagen, Quellen, Konflikte, Freigaben |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Kanonisches Modell und Zeitsemantik |
| [docs/IMPORTS.md](docs/IMPORTS.md) | Konkrete Importprofile und Fehlerverhalten |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Offline-MVP und späteres lokales Archiv |
| [docs/superpowers/plans/2026-10-26-memory-atlas-p0-p1.md](docs/superpowers/plans/2026-10-26-memory-atlas-p0-p1.md) | Erster verbindlicher Implementierungsplan |
| [docs/superpowers/plans/2026-10-26-memory-atlas-p2-p3.md](docs/superpowers/plans/2026-10-26-memory-atlas-p2-p3.md) | Getrennte spätere Ausbauaufträge |
| [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) | Abnahmefälle und messbare Release-Gates |
| [docs/TRACEABILITY.md](docs/TRACEABILITY.md) | Anforderung → Aufgabe → Abnahmefall |
| [docs/RESEARCH_AND_REUSE.md](docs/RESEARCH_AND_REUSE.md) | Wiederverwendung und begründete Bausteinauswahl |

## Umfang der ersten Umsetzung

**P0:** vorhandene Vorschau prüfen und weiterverwenden. **P1:** zuverlässiger Offline-MVP mit echten Parsern, Quelleninspektor, manueller Wissenspflege, Zeitvergleich, begrenztem Graphen und überprüfbarem Export. Sitzungsdaten werden bewusst als `.atlas.json` gespeichert; ein offener Browser-Tab ist kein dauerhaftes Archiv.

**P2:** lokales SQLite-Archiv, Wiederaufnahme, Backups, größere Bestände. **P3:** optionale KI-Extraktion, Gemini-Adapter und kontrollierte Agenten-/Memory-Anbindungen. P2/P3 sind spezifiziert, werden durch den ersten Cursor-Auftrag aber nicht automatisch aktiviert.

Die erste Version ist bereits ohne KI-Schlüssel nützlich. Eine automatische semantische Auswertung sämtlicher sechs Monate ist erst nach dem P3-Extraktionsmodul vorgesehen. P1 stellt Quellen, Auswahl, Regeln und Prüfung bereit, auf denen diese Automatisierung aufbaut.

## Was ausdrücklich getrennt bleibt

- Eine Quellstelle beweist zunächst, **dass etwas gesagt wurde**.
- Menschliche Freigabe ist eine Kuratierungsentscheidung.
- Ein tatsächlicher Ausführungsnachweis braucht einen passenden unabhängigen Prüfer.
- Ein Memory-Export ist eine begrenzte, versionierte Auswahl; ein Projekt-Backup enthält wesentlich mehr und bleibt privat.

Alle Fixtures und Demo-Aussagen im Paket sind **synthetisch**. Persönliche Chatverläufe, API-Schlüssel und das vorhandene Honcho-Wissen sind nicht enthalten. Dieses Paket verändert weder Honcho noch Mausbot, Agent Zero, TruthLens oder ein GitHub-Repository.

## Technische Vertragsdateien

- [schemas/atlas.schema.json](schemas/atlas.schema.json): Projekt-Snapshot und Kernobjekte.
- [schemas/memory-export.schema.json](schemas/memory-export.schema.json): begrenzter freigegebener Export.
- [contracts/domain.ts](contracts/domain.ts): Signaturen der Kernfunktionen; keine fertige Implementierung.
- [examples/demo.atlas.json](examples/demo.atlas.json): vollständiger synthetischer Snapshot.
- [fixtures/expected/import-cases.json](fixtures/expected/import-cases.json): erwartete Importergebnisse.
- [checks/check_bundle.py](checks/check_bundle.py): Struktur-/Konsistenzprüfung dieses Übergabepakets; ersetzt keine App-Tests.

Details zur Prüfung dieser Lieferung stehen in [docs/PACKAGE_REVIEW.md](docs/PACKAGE_REVIEW.md).
