# Recherche und Wiederverwendung

**Stand und Quellenabruf: 2026-10-26.** Dieses Dokument begründet die Stackentscheidung dieser SPECC. Der Phasenplan ist eine Architekturentscheidung dieses Pakets, keine nachträglich behauptete frühere Nutzerfreigabe. Quellenkennungen verweisen auf [SOURCES.md](SOURCES.md). Upstream-Angaben sind von Empfehlungen und noch ausstehenden Abnahmetests zu unterscheiden. Die Auswahl soll spätere Änderungen begründbar halten.

## 1. Entscheidung und Phasengrenzen

**P0 erhält und prüft den vorhandenen Offline-HTML-Prototyp.** Zunächst tatsächlichen Repository-Inhalt, Startweg und funktionierende Abläufe feststellen. Ein guter bestehender Einstieg wird nicht allein wegen einer Graph-Bibliothek neu geschrieben. Ein leerer Repository-Stand gilt nicht als Beleg, dass der erwähnte Prototyp bereits vorliegt. Fehlende Originaldateien und überprüfte Funktionen werden ausdrücklich dokumentiert.

**P1 wird ein wartbares Offline-MVP.** Bei leerer Ausgangsbasis sind React, TypeScript und Vite der Standard. Bestehende geeignete App-Strukturen können erhalten bleiben; die fachlichen und visuellen Anforderungen gelten unabhängig vom Framework. Die Wahl begründen wir mit wiederverwendbaren UI-Komponenten, expliziten Typen an Datenübergängen und einem nachvollziehbaren Build. Das ist eine Wartbarkeitsentscheidung, kein belegter Geschwindigkeitsvorteil gegenüber Vanilla-JavaScript. Die geprüften Projektlizenzen sind MIT für React und Vite sowie Apache-2.0 für TypeScript. [S23–S25]

P1 arbeitet mit `MemoryStore` und explizitem Speichern/Laden einer versionierten `.atlas.json`-Datei. Es benötigt kein Backend, keine Datenbank und keinen API-Schlüssel. Browserzustand allein gilt nicht als dauerhaftes Backup. Für die Graphansicht wird ausschließlich `@xyflow/react` vorgesehen, mit höchstens **150 gleichzeitig sichtbaren Knoten** und vollständiger Listenalternative. Diese Grenze ist eine Produktentscheidung zur Übersichtlichkeit und noch kein gemessener Leistungswert.

**P2 ergänzt ein dauerhaftes lokales Archiv:** Python 3.12+, das Standardmodul `sqlite3`, SQLite/FTS5 und ein FastAPI-Dienst ausschließlich auf Loopback. Derselbe Dienst liefert die gebaute UI aus. **P3 ergänzt KI-Extraktion nach ausdrücklicher Aktivierung**, lokal oder über einen gewählten Cloud-Anbieter; Graphiti, Honcho und MCP folgen bei konkretem Bedarf als getrennte Adapter.

## 2. Wiederverwendbare Bausteine im Vergleich

| Baustein | Belegte Eigenschaften und Pflegehinweis | Entscheidung für dieses Paket |
|---|---|---|
| SQLite + FTS5 | SQLite-Kern Public Domain; offizielle Version 3.54.1 vom 2026-10-16. FTS5 unterstützt Volltextsuche, BM25 und Fundstellenauszüge. [S01–S03] | In P2 übernehmen; Archiv und Suchindex ohne separaten Datenbankserver. |
| React Flow | MIT; beim Abruf React-Release 12.12.0 sichtbar, Anzeige „24 Sep“. Custom Nodes können React-Komponenten mit Eingaben und Interaktionen enthalten. [S05–S07] | Einzige vorgesehene Graph-Bibliothek; passend zu interaktiven Karten in der P1-React-UI. |
| Cytoscape.js | MIT für Kern und eigene Erweiterungen; laut Dokumentation keine externen Kernabhängigkeiten. Release 3.34.4 sichtbar, Anzeige „15 Oct“. [S08–S09] | Vergleichskandidat für eine reine Netzwerkansicht; nicht zusätzlich installieren. |
| Graphiti | Apache-2.0; Release 0.31.2 sichtbar, Anzeige „20 Oct“. Zeitliche Fakten und hybride Suche, mit eigener Modell- und Graphinfrastruktur. [S10–S12] | Optionaler P3-Adapter; kein Bestandteil des Offline-Kerns. |
| Honcho | AGPL-3.0; Release 3.4.0 sichtbar, Anzeige „22 Oct“. Eigenständige Gedächtnisinfrastruktur mit Server und Hintergrundverarbeitung. [S13–S16] | Optionales späteres Ziel; Integrationsform und Lizenzfolgen vor Übernahme prüfen. |
| ChatGPT Export Viewer Enhanced | MIT; einzelne HTML-Datei für lokalen JSON-Import, Suche, Tags und Notizen. Repository zeigt sieben Commits, aber keine belastbar ausgewertete Releasehistorie. [S17–S18] | Leichte Referenz für Import-/Archivbedienung; kein Nachweis vollständiger Formatunterstützung. |

Die GitHub-Anzeigen nennen teilweise keinen Jahreswert. Deshalb werden ihre sichtbaren Angaben zusammen mit dem Abrufdatum dokumentiert. Releaseaktivität ist ein Pflegehinweis, keine Garantie für Fehlerfreiheit oder langfristigen Support. Sterne, Marketingbenchmarks und unbelegte Größenversprechen gehen nicht in die Entscheidung ein.

## 3. React Flow bleibt eine Ansicht

React Flow übernimmt Auswahl, Positionierung, Verbindungen und Darstellung interaktiver Knoten. Die offizielle Dokumentation beschreibt Custom Nodes als React-Komponenten mit solchen Interaktionen. [S07] Die Anwendung behält jedoch Datenmodell, Speicherung und Zustandsübergänge außerhalb der Bibliothek. Eine gezeichnete Kante begründet keine inhaltliche Beziehung; Layoutdaten dürfen keine fachlichen Datensätze überschreiben.

Die sichtbare Teilmenge wird durch Filter und Nachladen begrenzt. Eine Liste bietet denselben Zugang zu den relevanten Einträgen. Cytoscape.js bleibt eine dokumentierte Alternative aus der Recherche; zwei Graph-Bibliotheken würden zusätzliche Anpassungs- und Pflegearbeit schaffen. Falls ein geeigneter P0-Prototyp ohne React vorliegt, wird seine Weiterentwicklung zunächst bewertet. Die bloße Verfügbarkeit von React Flow löst keinen Umbau aus.

## 4. SQLite als spätere lokale Archivbasis

SQLite liest und schreibt Dateien ohne separaten Datenbankserver; Python stellt dafür `sqlite3` bereit. [S04, S19] Die P2-Architektur nutzt dieses Modell bewusst: Daten liegen in einem benutzereigenen Verzeichnis, der Anwendungsprozess läuft mit normalen Benutzerrechten. FastAPI unterstützt die Auslieferung statischer Dateien; Uvicorn dokumentiert die Hostbindung. [S20–S21] Der Starter setzt `127.0.0.1` ausdrücklich und prüft den belegten Port. Er richtet keinen Windows-Dienst und keine LAN-Freigabe ein.

FastAPI steht unter MIT. [S22] Das Gesamtpaket muss mit seiner konkreten Laufzeit auf Windows überprüft werden: Start und Beenden, Dateirechte, Datenwiederherstellung, UI-Auslieferung und FTS5-Verfügbarkeit. Eine Python-Versionsnummer allein beweist nicht die Fähigkeiten der verbundenen SQLite-Bibliothek. Vor der Archivmigration muss ein tatsächliches `CREATE VIRTUAL TABLE ... USING fts5(...)` im ausgelieferten Runtime funktionieren. Die vorhandene `.atlas.json`-Sicherung bleibt als Migrations- und Wiederherstellungsweg erhalten.

FTS5 liefert zunächst lexikalische Suche. Semantische Ähnlichkeit und eine zusätzliche Vektordatenbank werden erst geprüft, wenn dokumentierte eigene Suchfälle einen Bedarf zeigen. Es gibt keinen vorsorglichen Embedding-Job und keine unbelegte Zusage einer bestimmten Archivgröße.

## 5. Grenzen der optionalen Memory-Systeme

Graphiti unterstützt lokale OpenAI-kompatible Modellendpunkte. Sein README nennt aber zusätzliche Backend-Anforderungen und markiert **Kuzu als deprecated**. Kuzu wird deshalb nicht als neue lokale Basis eingeplant. Die dokumentierte opt-out-Telemetrie muss für den Adapter mit `GRAPHITI_TELEMETRY_ENABLED=false` deaktiviert werden. [S11]

Honchos dokumentierter Komfortstart nutzt Docker; manuelle Installation ist möglich. Der lokale Standardaufbau umfasst PostgreSQL/pgvector, Redis und Hintergrundverarbeitung. Lokale kompatible Modelle sind möglich, sodass eine grundsätzliche Cloud-Pflicht falsch wäre. Der dokumentierte Mock-Provider erzeugt synthetische Inhalte und ersetzt kein brauchbares semantisches Gedächtnis. [S15]

Beide Systeme dürfen Auswertungsvorschläge oder begrenzte Exporte verarbeiten. Sie sind keine Wahrheitsautorität für Memory Atlas. Automatische Invalidierung, abgeleitete Erinnerungen oder Modellantworten dürfen den lokal freigegebenen Stand nicht stillschweigend verändern. Adapter bleiben standardmäßig ausgeschaltet und dürfen den Offline-Kern bei Ausfall nicht blockieren. Eine spätere MCP-Anbindung erhält denselben expliziten Datenumfang und dieselbe Freigabegrenze.

## 6. Übernahmeregeln

Vor jeder tatsächlichen Übernahme werden konkrete Version, Lizenzdatei, erforderliche Hinweise und transitive Abhängigkeiten dokumentiert. Die genannten Upstream-Releases sind Recherchebefunde, keine pauschale Installationsanweisung. Dieses Paket führt **keine automatischen Abhängigkeitsinstallationen** aus.

Der Windows-Abnahmetest erfolgt unter einem normalen Benutzerkonto. P0/P1 bleiben ohne Backend, Datenbank und Schlüssel benutzbar; P2 benötigt weder Docker noch Administratorrechte noch eine separate Datenbankinstallation. Einmalige Einrichtung und danach netzwerkloser Betrieb werden getrennt geprüft. Offene Installations- oder Kompatibilitätsfragen werden als solche festgehalten, bis der konkrete Lieferumfang getestet ist.
