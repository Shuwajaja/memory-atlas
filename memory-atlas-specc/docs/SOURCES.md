# Quellenverzeichnis

**Alle Quellen geprüft am 2026-10-26.** Ausschließlich offizielle Projektdokumentation und Repositories. Die Kennungen werden in [RESEARCH_AND_REUSE.md](RESEARCH_AND_REUSE.md) verwendet. Angaben beschreiben den abgerufenen Stand; bewegliche Branch- und Dokumentationslinks können sich ändern. Produktanforderungen und Architekturentscheidungen sind eigene Festlegungen dieser SPECC.

| ID | Primärquelle | Belegt | Unsicherheit / Grenze | Geprüft |
|---|---|---|---|---|
| S01 | [SQLite Copyright](https://www.sqlite.org/copyright.html) | Public Domain des SQLite-Kerns. | Bindings separat prüfen. | 2026-10-26 |
| S02 | [SQLite Release History](https://sqlite.org/changes.html) | 3.54.1, 2026-10-16. | Kein ausgelieferter Versionsnachweis. | 2026-10-26 |
| S03 | [FTS5](https://sqlite.org/fts5.html) | Volltext, BM25, Snippets, Integration. | Runtime-Fähigkeit prüfen. | 2026-10-26 |
| S04 | [SQLite Serverless](https://sqlite.org/serverless.html) | Kein separater DB-Server. | Gesamtanwendung gesondert testen. | 2026-10-26 |
| S05 | [xyflow LICENSE](https://github.com/xyflow/xyflow/blob/main/LICENSE) | MIT. | Gepinnte Version prüfen. | 2026-10-26 |
| S06 | [xyflow Releases](https://github.com/xyflow/xyflow/releases) | React 12.12.0, „24 Sep“. | Anzeige ohne Jahr. | 2026-10-26 |
| S07 | [React Flow Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) | Interaktive React-Knoten. | Kein Archiv-/Fachmodell. | 2026-10-26 |
| S08 | [Cytoscape.js Docs](https://js.cytoscape.org/) | MIT, Kernabhängigkeiten, Graphfunktionen. | Drittanbieter-Erweiterungen separat. | 2026-10-26 |
| S09 | [Cytoscape.js Releases](https://github.com/cytoscape/cytoscape.js/releases) | 3.34.4, „15 Oct“. | Anzeige ohne Jahr. | 2026-10-26 |
| S10 | [Graphiti LICENSE](https://github.com/getzep/graphiti/blob/main/LICENSE) | Apache-2.0. | Backend-Lizenzen separat. | 2026-10-26 |
| S11 | [Graphiti README](https://github.com/getzep/graphiti) | Zeitmodell, Backends, lokale LLMs, Kuzu-Abkündigung, Telemetrie. | Windows-Paket nicht getestet. | 2026-10-26 |
| S12 | [Graphiti Releases](https://github.com/getzep/graphiti/releases) | 0.31.2, „20 Oct“; Fehlerkorrekturen. | Anzeige ohne Jahr. | 2026-10-26 |
| S13 | [Honcho LICENSE](https://github.com/plastic-labs/honcho/blob/main/LICENSE) | AGPL-3.0. | Integrationsfolgen separat beurteilen. | 2026-10-26 |
| S14 | [Honcho README](https://github.com/plastic-labs/honcho) | Gedächtnisinfrastruktur und Lizenzhinweis. | Kein Qualitätsnachweis. | 2026-10-26 |
| S15 | [Honcho Self-hosting v3](https://honcho.dev/docs/v3/contributing/self-hosting) | Infrastruktur, manuelle Einrichtung, lokale Modelle, Mock. | Mock nicht semantisch aussagekräftig. | 2026-10-26 |
| S16 | [Honcho Releases](https://github.com/plastic-labs/honcho/releases) | 3.4.0, „22 Oct“. | Anzeige ohne Jahr. | 2026-10-26 |
| S17 | [Viewer Enhanced](https://github.com/Notesong/ChatGPT-Export-Viewer---Enhanced) | Einzeldatei, lokale Funktionen, sieben Commits. | Parser und Pflege nicht vollständig geprüft. | 2026-10-26 |
| S18 | [Viewer LICENSE](https://github.com/Notesong/ChatGPT-Export-Viewer---Enhanced/blob/main/LICENSE) | MIT. | Übernommene Bestandteile einzeln prüfen. | 2026-10-26 |
| S19 | [Python 3.12 sqlite3](https://docs.python.org/3.12/library/sqlite3.html) | Python-Schnittstelle zu SQLite. | Verbundene SQLite-Version variabel. | 2026-10-26 |
| S20 | [FastAPI Static Files](https://fastapi.tiangolo.com/tutorial/static-files/) | Statische UI-Dateien ausliefern. | Routing konkret testen. | 2026-10-26 |
| S21 | [Uvicorn Settings](https://uvicorn.dev/settings/) | Host-/Portkonfiguration. | Loopback ausdrücklich konfigurieren. | 2026-10-26 |
| S22 | [FastAPI LICENSE](https://github.com/fastapi/fastapi/blob/master/LICENSE) | MIT. | Transitive Lizenzen separat. | 2026-10-26 |
| S23 | [React LICENSE](https://github.com/react/react/blob/main/LICENSE) | MIT. | Kein Versionspin festgelegt. | 2026-10-26 |
| S24 | [TypeScript LICENSE](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt) | Apache-2.0. | Kein Versionspin festgelegt. | 2026-10-26 |
| S25 | [Vite LICENSE](https://github.com/vitejs/vite/blob/main/LICENSE) | MIT. | Kein Versionspin festgelegt. | 2026-10-26 |

## Methodische Grenzen

Die Recherche prüft Dokumentation, Lizenztexte und sichtbare Releases, nicht den vollständigen Quellcode oder jede transitive Abhängigkeit. Es wurden keine Laufzeitbenchmarks, Sicherheitstests oder Windows-Installationen ausgeführt. Die Grenze von 150 sichtbaren Graphknoten ist eine Architektur-/Bedienentscheidung. Aus Commitzahlen und Releases wird keine garantierte zukünftige Pflege abgeleitet. Lizenztexte sind vor der konkreten Codeübernahme erneut gegen die ausgewählte Version zu prüfen.
