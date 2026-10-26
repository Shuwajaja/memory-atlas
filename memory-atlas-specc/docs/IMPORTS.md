# Importvertrag

Stand und Quellenprüfung: **2026-10-26**. „MUSS“ bezeichnet ein Abnahmekriterium. Die genannten Profile sind beobachtete Exportstrukturen, keine garantierten Herstellerschemata. Die Fixtures und Tests dieses Dokuments sind vorgeschriebene Gates; ihre erfolgreiche Ausführung wird hier nicht behauptet.

## 1. Umfang und Phasen

**P0:** Vorhandenes HTML und vorhandenen Repository-Stack prüfen: Datenmodell, Beispieldaten, Dateizugriff, Rendering und wiederverwendbare Funktionen dokumentieren. Keine vorhandene Anwendung ungeprüft überschreiben.

**P1:** Verlässlicher offlinefähiger MVP, grundsätzlich React/TypeScript/Vite. Ein bereits geeigneter anderer Stack rechtfertigt keinen blinden Rewrite. Daten liegen im `MemoryStore`; dauerhaftes Speichern erfolgt über ein ausdrücklich ausgelöstes Projekt-Snapshot als JSON. Kein Server, keine Datenbank, kein API-Key. Ein Reload darf nicht als erfolgreiche dauerhafte Speicherung ausgegeben werden. Das Snapshot-Format ist versioniert und vom Herstellerimport getrennt erkennbar.

**P2:** Erst später SQLite über einen lokalen Python/FastAPI-Dienst; keine entsprechende Infrastruktur als P1-Voraussetzung einbauen. Gemini bleibt außerhalb des P1-Imports.

## 2. Eingabe und Grenzen

P1 akzeptiert die Mehrfachauswahl entpackter `.json`-Dateien. **Kein ZIP- oder TGZ-Import.** Bei Archiven erscheint: „Entpacke den Export auf deinem Gerät. Wähle anschließend conversations.json beziehungsweise alle nummerierten Conversation-JSON-Dateien gemeinsam aus.“ Ein importiertes `chat.html` wird weder ausgeführt noch als Ersatzformat angenommen.

| Grenze | Verbindliche Regel |
|---|---|
| Einzeldatei | Höchstens 32 MiB = 33.554.432 Bytes |
| Gesamtauswahl | Höchstens 128 MiB = 134.217.728 Bytes |
| Nachrichten | Höchstens 100.000 Nachrichtenobjekte im Batch, auch mit leerem Inhalt, vor Deduplizierung gezählt |
| Elternpfad | Höchstens 10.000 verfolgte `parent`-Kanten je Traversierung |

Grenzüberschreitungen führen zu einem Fehler mit betroffenem Dateinamen, Grenze und Handlungshinweis. Die Dateiendung ist kein Schemanachweis. JSON-Syntax, Wurzelstruktur und Profil werden geprüft. Doppelte JSON-Objektschlüssel dürfen nicht unbemerkt Daten überschreiben. Unbekannte oder mehrdeutige Formate scheitern mit Diagnose; niemals das gesamte JSON als eine Nachricht importieren. Ein leeres Array ergibt einen transparenten Nullimport.

Der Import läuft in einem Web Worker. Zustände: `validating`, `parsing`, `normalizing`, `ready`, `committing`, `completed`, `cancelled`, `failed`. Fortschritt zeigt bearbeitete Dateien/Nachrichten, ohne Prozentgenauigkeit vorzutäuschen. Abbruch beendet die Worker-Verarbeitung. Bis `ready` bleibt der bestehende Store unverändert. Die bestätigte Übernahme tauscht einen vollständig validierten Kandidaten atomar ein. Fehler oder Abbruch vor dem Commit erzeugen keine Teilimporte; während des kurzen atomaren Commits gibt es keinen behaupteten Teilabbruch.

## 3. Freigegebene Profile

### `chatgpt-mapping-v1`

Erwartet ein Array von Konversationsobjekten mit objektförmigem `mapping`. Beobachtete Felder sind `id`/`conversation_id`, `title`, `create_time`, `update_time`, `current_node`; Knoten enthalten `parent`, gegebenenfalls `children` und `message`. Nummerierte Exportdateien werden gemeinsam verarbeitet und über Identitäten zusammengeführt. Andere Hüllen benötigen einen eigenen geprüften Adapter.

Alle Knoten bleiben erhalten, einschließlich `message: null`, Systemknoten, alternativen Antworten und verwaisten Knoten. Der ausgewählte Pfad entsteht ausschließlich durch eine gültige `current_node`-Elternkette. `selected` bezeichnet diesen belegten Pfad, `alternate` einen belegten anderen Zweig, `unknown` nicht zuverlässig zuordenbare Knoten. Bei fehlendem oder defektem Auswahlpfad wird kein Zweig als ausgewählt erfunden. Zeitliches Sortieren aller Knoten ersetzt keine Baumrekonstruktion.

Elternzyklen, fehlende Eltern, ungültige Auswahlknoten und widersprüchliche `children` werden diagnostiziert. Betroffene Struktur bleibt erhalten; unsichere Zuordnungen werden `unknown`. Ein Traversierungslimit bricht den Import mit Diagnose ab. Die Darstellung darf kaputte Kanten ausblenden, muss die Einschränkung nennen und Rohreferenzen bewahren.

### `claude-chat-messages-v1`

Erwartet ein Array mit `uuid`, optionalem `name` und `chat_messages`-Arrays. Beobachtete Nachrichtenfelder: `uuid`, `sender`, `text`, `content`, `created_at`, `updated_at`. **Aktivierung erst nach Prüfung mindestens eines anonymisierten echten Kontodatenexports samt Golden-Ergebnissen.** Synthetische Fixtures allein erfüllen dieses Gate nicht. Bis dahin erklärt die Oberfläche die fehlende Freigabe.

Die Quellreihenfolge bleibt erhalten. `content[]` wird in Blockreihenfolge gelesen; `text` dient nur als Fallback, wenn keine Textblöcke vorliegen. Unterschiedliche zusätzliche Texte werden als Abweichung erhalten und diagnostiziert, nicht still verworfen. Überlappende Inhalte werden nicht doppelt angehängt. Eltern-/Leaf-Felder aktivieren Baumsemantik nur in einer zusätzlich geprüften Variante. Ohne belegte Baumsemantik ist der Branch-Status `unknown`. Claude-Code-JSONL und Browser-API-Captures sind keine automatisch unterstützten Eingaben.

## 4. Identität, Revisionen und Provenienz

IDs sind opake Strings. Eine Nachricht MUSS eine stabile `logical_id` und eine unveränderliche `revision_id` besitzen. Die logische Identität verbindet Provider, lokale Quellenidentität, Konversation und ursprünglichen Nachrichten-/Knotenschlüssel. Quellenidentität ist vom einzelnen Importlauf getrennt; Wiederimporte derselben Quelle verwenden denselben Namensraum. Gleiche IDs verschiedener Quellen werden nicht automatisch vereinigt.

Die Revision referenziert einen deterministischen Hash der kanonischen Nachrichtenfassung. Ein geänderter Inhalt erzeugt eine neue Revision derselben logischen Nachricht; bestehende Revisionen werden nicht überschrieben. Dateiname, Importzeit und JSON-Pointer sind Provenienz und dürfen allein keine Inhaltsrevision erzeugen. Branch-Zuordnung wird im jeweiligen Importsnapshot festgehalten; ein geänderter ausgewählter Zweig überschreibt keine historische Nachricht.

Original-IDs, widersprüchliche `id`-/`conversation_id`-Werte und abweichende Knotenschlüssel bleiben nachvollziehbar. Fehlende IDs erhalten deterministische synthetische Identitäten aus Inhalt und Strukturkontext sowie eine Kennzeichnung. Sichere Zuordnung später veränderter ID-loser Datensätze wird nicht versprochen.

Jede Nachricht führt Quellenreferenzen mit Importlauf, Quelldatei und eindeutigem JSON-Pointer. Verschobene Fundstellen ergänzen Provenienz. Ein identischer Wiederimport erzeugt null neue logische Nachrichten und null neue Inhaltsrevisionen. Unterschiedliche Inhalte mit kollidierender Identität werden sichtbar als Konflikt behandelt. Gleiche Texte mit verschiedenen IDs bleiben verschieden. Ein unvollständiger späterer Export löscht keine früher importierten Inhalte.

## 5. Inhalt, Zeit und Textstellen

`sent_at` ist nullable. Geprüfte ChatGPT-Zeitwerte werden als Unix-Sekunden, Claude-Zeitwerte als ISO-Zeitpunkte interpretiert. Fehlende, ungültige oder nicht eindeutig interpretierbare Werte bleiben `null`; Rohwerte und Diagnose bleiben erhalten. Weder Importzeit noch Unix-Epoche ersetzt ein fehlendes Datum. Fehlende Titel erhalten eine neutrale Anzeige.

Alle Textsegmente werden in Quellreihenfolge erhalten. Unbekannte Rollen und Inhaltstypen werden markiert, nicht verworfen. Medien-, Datei- und Tool-Blöcke erhalten typisierte Platzhalter mit Rohreferenz. Keine erfundenen Beschreibungen, keine automatische URL-Abfrage und keine behauptete Medienvollständigkeit. Nullwurzeln bleiben Graphknoten ohne künstliche Nachricht.

Textbelege binden `node_id` des geprüften Importsnapshots und `part_index`; sie verwenden halboffene Spannen `[start_cp, end_cp)` in **Unicode-Skalarwerten**, nicht UTF-16-Codeeinheiten. Sie referenzieren genau einen unveränderten Textteil dieser konkreten unveränderlichen Revision. Mehrteilige Belege benötigen mehrere Evidence-Objekte. Graphemcluster dürfen mehrere Skalarwerte umfassen. Exporttext wird für Belege nicht still normalisiert; Importer und Oberfläche müssen dieselbe Indexdefinition verwenden und Emoji-/Kombinationszeichen testen. Ungültige Surrogatfolgen erhalten eine explizite Diagnose; Belegspannen dafür werden nicht erfunden.

Der Filter „nur KI-Inhalte“ dient der Prüfung. Er garantiert keine Entfernung persönlicher Informationen: Auch KI-Antworten können persönliche Angaben wiederholen. Rollenfilter verändern keine Originaldaten und erteilen keine Freigabe zum Teilen.

## 6. Sichere Darstellung und Importbericht

Alle importierten Texte, Titel, URLs und Dateinamen sind untrusted Daten. Keine Codeausführung, keine rohen HTML-Sinks. Markdown erlaubt kein Raw HTML; gerenderte Ausgabe wird nach gepflegter Allowlist bereinigt. Gefährliche URL-Schemata, Eventhandler und eingebettete aktive Inhalte bleiben unwirksam. Externe Medien, Linkvorschauen und Telemetrie werden nicht automatisch geladen. Projektsnapshots werden ebenso validiert wie Herstellerdateien.

Vor Übernahme zeigt der Bericht Profile, Dateien, neue/unveränderte/geänderte Konversationen, logische Nachrichten, Revisionen, Branches, Platzhalter und Diagnosen. Diagnosen enthalten Code, Schweregrad und JSON-Pointer; keine unnötigen Chattexte in Konsolenlogs. Die Summen müssen auf die Quelldaten zurückführbar sein. Unbekannte Felder bleiben als Rohdaten/Provenienz erhalten; der Import darf keine verlustfreie Vollunterstützung behaupten, wenn Teile nur als Platzhalter nutzbar sind.

## 7. Erforderliche Fixtures und Gates

Geplant unter `fixtures/`:

- `chatgpt/01-linear.json`, `02-branches.json`, `03-missing-time.json`, `04-multimodal.json`.
- `chatgpt/05-cycle.json`, `06-revision.json`, `07-hostile.json`, `08-split-a.json`, `09-split-b.json`.
- `claude/01-content.json`, `02-unknown.json`.

Golden-Ergebnisse spezifizieren IDs, Revisionen, Pfade, Nullwerte, Platzhalter und Diagnosen. Ergänzende Grenztests prüfen Wiederimport, Mehrdatei-Duplikate, identische Texte mit unterschiedlichen IDs, Quellenkollisionen, Größenlimits, 100.000 Nachrichten, 10.000 Elternschritte, ungültiges JSON, doppelte Schlüssel, Unicode-Spannen und Abbruch vor Commit. Hostile-Fixtures müssen ohne Skriptausführung oder Netzabruf dargestellt werden. Vor Freigabe müssen Store und Snapshot nach Rundlauf dieselben Identitäten, Revisionen, Quellen und Inhalte besitzen. Claude benötigt zusätzlich das oben genannte reale Sample-Gate.

## Quellen

Geprüft am 2026-10-26. Herstellerhilfen belegen Exportwege; GitHub-Quellen belegen lediglich ihre beobachteten Strukturen.

- ChatGPT-Export: https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data
- ChatGPT, ausdrücklich auch nummerierte JSON-Dateien: https://help.openai.com/en/articles/9106926-transfer-exported-conversations-between-chatgpt-accounts
- Claude-Export: https://support.claude.com/en/articles/9450526-export-your-claude-data
- Gemini/Takeout, Chats unter „My Activity → Gemini Apps“, Gems separat: https://support.google.com/gemini/answer/16920332?hl=en
- Beobachteter ChatGPT-Parser: https://github.com/ehamiter/chatgpt-history/blob/main/build_db.py
- Beobachtete Claude-Exportschemata: https://github.com/osteele/claude-chat-viewer/blob/main/docs/schemas.md
- XSS-Prävention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
