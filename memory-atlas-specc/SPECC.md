# SPECC MA-001 — Memory Atlas

**Version 1.0 · 26.10.2026 · Ziel: Cursor-Übergabe für ein vorhandenes Repository**

## 1. Produktziel

Memory Atlas ist ein lokal arbeitender Wissens-Explorer für exportierte KI-Gespräche. Ein Mensch soll erkennen können: **Was wurde besprochen? Was gilt heute? Was wurde geändert? Welche Quelle trägt eine Aussage? Welches Wissen darf mein Agent bekommen?**

Der Ausgangsfall sind die letzten sechs Monate eigener ChatGPT-Gespräche. Claude kommt über einen abgegrenzten Exportadapter hinzu, Gemini über eine spätere Ausbaustufe. Die Anwendung bleibt als eigenständiges Open-Source-Projekt betreibbar. Mausbot, Agent Zero, Honcho, TruthLens und Artifact Hub sind mögliche spätere Integrationen, keine Betriebsbedingungen.

Der persönliche Standard ist **KI-/Projektwissen**: Agenten, Harnesses, Modelle, MCP, Skills, Architektur, Research, Kosten, Projektentscheidungen und überprüfbare Arbeitsergebnisse. Ein generischer Themenfilter ist technisch möglich; private Themen sind im Standard-Workflow von Kandidaten und Memory-Ausgaben ausgeschlossen. Ein Themenklassifikator ist keine verlässliche Datenschutzgrenze.

## 2. Ausgangslage und Entscheidungen

Aus der bisherigen Planung übernommen: Projektname Memory Atlas; Offline-Vorschau; JSON-Import; Wissenskarten, Bibliothek, Zeitreise/Alt-Neu, Graph, Kategorien, Quelleninspektor und Prüflabor; ausgewählter freigegebener Memory-Export; später SQLite, KI und optionale Memory-Adapter.

Neu konkretisierte Designentscheidungen dieses Pakets: vier getrennte Zustandsachsen, versionierter Snapshot, konkrete Limits, Signaturen, Tests, React/TypeScript/Vite als Standard bei leerem Repo und Python/SQLite für das spätere lokale Archiv. Diese Entscheidungen sind fachliche Vorgaben dieses Entwurfs, keine Behauptung, dass der Nutzer jede Bibliothek einzeln ausgewählt hätte.

Nicht verifiziert: Repo-URL, Branch, bestehender Quellcode, realer Exportbestand, aktuelle Deployments. Die beiliegenden Daten sind synthetisch. Es wurde kein sechsmonatiger Verlauf verarbeitet.

## 3. Anwender und Hauptablauf

Primärnutzer ist eine Person mit eigenen KI-Chats und einem oder mehreren Coding-/Arbeitsagenten. Die Person importiert selbst ausgewählte Dateien, grenzt Zeitraum und Themen ein, prüft vorgeschlagene oder manuell erstellte Wissenskarten und exportiert ein bewusst gewähltes Memory-Set.

1. **Import prüfen:** Anbieterprofil, Dateien, erkannte Gespräche, Zeitraum, fehlende Daten und Warnungen sehen.
2. **Material entdecken:** Volltext, Projekte, Kategorien und Zeitfilter benutzen. Original und abgeleitete Aussage sind unterscheidbar.
3. **Wissen bearbeiten:** Eine genaue Quellstelle als Karte übernehmen; Aussage atomar formulieren; Art, Projekt, Umgebung und Gültigkeit zuordnen.
4. **Änderungen klären:** Dubletten zusammen anzeigen; Vorschläge für Widerspruch/Ersetzung prüfen; beide Quellen nebeneinander sehen.
5. **Memory freigeben:** Aktuelle, gültige, passende Karten auswählen; Vorschau und Ausschlussgründe sehen; exakten Export freigeben.
6. **Weiterverwenden:** JSON und Markdown herunterladen. Später kann ein eng begrenzter Adapter denselben Vertrag lesen.

## 4. Phasen und harte Grenzen

| Phase | Ergebnis | Technischer Umfang | Nicht enthalten |
|---|---|---|---|
| P0 — Bestand/Referenz | Vorhandene HTML-Vorschau geprüft und bewahrt; echter Startzustand dokumentiert | Vorhandene Dateien, synthetischer Smoke-Test | Vorgetäuschter Repo-/Produktionsstatus |
| P1 — Offline-MVP | Vollständiger Import-/Review-/Export-Ablauf, Projektdatei, UI und Regeln | React/TS/Vite bei leerem Repo; MemoryStore; lokale Assets; optionales gebündeltes React Flow für den Graph | Datenbank, Server, automatische semantische Vollanalyse, Netzwerkanfragen |
| P2 — Lokales Archiv | Dauerhafte SQLite-Speicherung, Volltext, Backups, größere Bestände | Python 3.12+, sqlite3/FTS5, FastAPI auf Loopback; P1-UI als lokale Assets | Öffentlicher Server, Mehrbenutzerbetrieb, Cloud-Sync |
| P3 — Assistierte Pflege | KI-Kandidaten, weitere Adapter, gezielte externe Prüfung und scoped Agenten-Zugriff | Austauschbare optionale Adapter mit Budget und expliziter Datenfreigabe | Blind-Sync, automatisches Überschreiben freigegebener Entscheidungen |

Der erste Cursor-Auftrag umfasst **P0/P1**. P2/P3 werden als eigene Folgeaufträge aktiviert. Ein MVP-Release darf die in dieser Tabelle ausgeschlossenen Funktionen nicht als fertig darstellen.

## 5. Anforderungen

„MUSS“ ist Abnahmekriterium. „SOLL“ darf mit dokumentierter Begründung abweichen.

| ID | Phase | Anforderung |
|---|---|---|
| MA-001 | P0 | Vorhandenes Repo, Regeln, Arbeitsstand und Prototyp prüfen; keine ungeprüften Bestandannahmen. |
| MA-002 | P1 | Laufzeit vollständig offline, ohne API-Schlüssel, Konto, Telemetrie oder extern nachgeladene Assets. |
| MA-003 | P1 | Mehrere ChatGPT-JSON-Dateien nach Inhalt erkennen; beobachtetes Profil `chatgpt-mapping-v1` separat testen. |
| MA-004 | P1 | Claude-Profil `claude-chat-messages-v1` begrenzt implementieren; reale Kompatibilitätsfreigabe nur nach datensparsamem lokalen Fixture-Gate. |
| MA-005 | P1 | Verzweigungen, Originalrollen, Original-IDs, Nullwurzeln und alternative Antworten erhalten; ausgewählten Pfad rekonstruieren. |
| MA-006 | P1 | Import idempotent und atomar; geänderte Nachricht bei gleicher Anbieter-ID als Revision erhalten. |
| MA-007 | P1 | Fehlende Zeiten/Medien/unsupported Blocks sichtbar machen; nichts erfinden; Quelle exakt referenzieren. |
| MA-008 | P1 | Zeitraum frei wählbar; Preset „Letzte 6 Monate“ mit sichtbarer Zeitzone und Grenzen; undatierte Inhalte getrennt. |
| MA-009 | P1 | KI-/Projektfilter und manuelle Ausschlüsse; nur zugelassene Inhalte für Karten/Exporte auswählbar. |
| MA-010 | P1 | Wissenskarte mit atomarer Aussage, Quelle, Aussagetyp, Scope, Kategorie und Gültigkeit manuell erstellen. |
| MA-011 | P1 | Herkunft, Kuratierung, zeitlicher Zustand und Evidenz separat darstellen; keine Wahrheits-Prozentzahl. |
| MA-012 | P1 | Quelleninspektor mit Originaltext, Rolle, Datum, Zweig, Auswahlspanne und Importdiagnose. |
| MA-013 | P1 | Alt/Neu-Vergleich und Konfliktwarteschlange; keine automatische Ersetzung nur wegen Aktualität/Ähnlichkeit. |
| MA-014 | P1 | Änderungen und Reviews als nachvollziehbare Ereignisse; Quelltexte und Claim-Inhalt versionieren. |
| MA-015 | P1 | Zeitreise unterscheidet fachliche Gültigkeit und damaligen Kenntnisstand. |
| MA-016 | P1 | Graph aus realen Beziehungen ableiten, max. 150 sichtbare Knoten; gleichwertige Listenbedienung. |
| MA-017 | P1 | Versionierten `.atlas.json`-Snapshot speichern/öffnen; Dirty-State, Dateigrößen und private Inhalte kenntlich machen. |
| MA-018 | P1 | Memory-Set mit expliziter Auswahl, Empfänger-Scope, exakter Inhaltsfreigabe und anschließender erneuter Prüfung. |
| MA-019 | P1 | Export nur gültige, angenommene, aktuelle, frische, konfliktfreie und datensparsame Karten; begrenztes JSON + Markdown. |
| MA-020 | P1 | Manipulierte Snapshots, XSS, Prompt-Injection, gefährliche URLs und übergroße Importe sicher behandeln. |
| MA-021 | P1 | Tastaturbedienung, Screenreader-Beschriftungen, sichtbarer Fokus, reduzierte Bewegung und responsive Ansichten. |
| MA-022 | P1 | Grenzen/Fehler/Teilunterstützung im Produkt sichtbar; keine Demos als echte Analysewerte ausgeben. |
| MA-023 | P2 | SQLite-Archiv mit Migrationen, Transaktionen, FTS5, Single-Writer und kontrollierter Wiederaufnahme. |
| MA-024 | P2 | Backup/Restore, Löschung abhängiger Ableitungen und Schutz vor unbeabsichtigtem Wiederimport gelöschter Daten. |
| MA-025 | P3 | KI extrahiert nur Kandidaten mit Quellen; Prompt-/Modell-/Policy-Version und Kostenbudget dokumentieren. |
| MA-026 | P3 | Gemini über eigenes geprüftes Takeout-Profil; kein Umbenennen in einen bestehenden JSON-Adapter. |
| MA-027 | P3 | Optionale Memory-/MCP-Adapter lesen ausschließlich passende freigegebene Sets; Ausfall beeinflusst Kern nicht. |
| MA-028 | P3 | Prüfung externer Tatsachen und ausgeführter Aktionen mit zeitlich gebundenen, unabhängigen Belegen. |
| MA-029 | Alle | Persönliche Daten außerhalb des Git-Repos; synthetische CI-Fixtures, minimale Logs und keine automatische Veröffentlichung. |
| MA-030 | Alle | Requirements, Plan und Tests verfolgen; jede Fertigmeldung durch tatsächlich ausgeführte Prüfung belegen. |

## 6. Zeitfenster „letzte sechs Monate“

Kalendermonate, keine pauschalen 180 Tage. Für das am 26.10.2026 gewählte Preset in `Europe/Berlin` lautet die sichtbare Auswahl **26.04.2026, 00:00 bis 27.10.2026, 00:00 exklusiv**. Ein anderer Ausführungstag berechnet andere Grenzen. DST mit IANA-Zeitzone berücksichtigen; intern UTC verwenden. Nutzer kann die Grenzen ändern.

Gesprächsfilter beruhen auf enthaltenen Nachrichten, nicht nur auf der Anlagezeit des Chats. Zur Interpretation nötige Elternnachrichten außerhalb des Fensters dürfen als gekennzeichneter Kontext angezeigt werden; sie werden nicht stillschweigend neue Kandidaten. Die Anwendung zeigt Abdeckung, frühesten/spätesten bekannten Zeitpunkt und Anzahl undatierter Nachrichten. Sie behauptet keine Vollständigkeit allein aus dem gewählten Datumsbereich.

## 7. Nichtziele und bewusst verworfene Ansätze

P1 ist kein Agent-Harness, kein Ersatz für Honcho und keine universelle Wahrheitserkennung. Ein Graph allein ist keine Wissensdatenbank. Konten werden nicht per Scraping ausgelesen; Browser-Cookies und Anbieterzugänge werden nicht übernommen. Kein Embedding jedes Rohchats, keine automatische Installation schwerer Graph-Backends, kein automatisches Veröffentlichen von Chats.

Drei Architekturansätze wurden verglichen: eine reine Offline-UI, ein sofortiger lokaler Komplettdienst und eine sofortige Graph-/Memory-Plattform. Gewählt ist ein **schrittweiser Ausbau vom Offline-Ablauf zum lokalen Archiv**, weil der Mensch die Quellen- und Freigaberegeln zuerst prüfen kann. SQLite und spätere Adapter kommen hinzu, ohne den fachlichen Vertrag zu ersetzen. Dies ist die begründete Designwahl des Pakets.

## 8. Erfolgskriterien

Eine neue Person kann mit Demo- oder eigenem freigegebenem Export eine Aussage finden, deren Herkunft verstehen, einen veralteten Stand markieren und ein korrekt begrenztes Memory-Set exportieren. Für die erste Usability-Prüfung ist ≤10 Minuten bis zum ersten korrekten Export ein **Zielwert**, kein bereits gemessener Wert.

Release-Gates: P1-Tests AC01 bis AC24 aus `docs/ACCEPTANCE.md`, echte Browserprüfung, kein ausgehender Request im fertigen Offline-Build, dokumentierte Profilunterstützung, keine unbelegten Erfolgsmeldungen. P2/P3-Gates sind getrennt aufgeführt. Windows-Kompatibilität wird erst nach tatsächlichem Test auf einem normalen Benutzerkonto zugesagt.

## 9. Dokumentenhierarchie

Die Produktanforderungen stehen hier. Fachsemantik in `docs/KNOWLEDGE_RULES.md`, Felder in `schemas/atlas.schema.json`, Funktionsgrenzen in `contracts/domain.ts`, Importprofile in `docs/IMPORTS.md`. Bei Widerspruch: keine spontane stille Entscheidung; die betroffenen Dokumente in einem lokalen Änderungsset konsistent korrigieren und den Grund in `docs/implementation/STATE.md` festhalten. Bestehende Nutzeranweisungen haben Vorrang.

Quellen für externe Sachangaben und Bausteine: [docs/SOURCES.md](docs/SOURCES.md). Ein Quellenverweis belegt die genannte Bibliotheks-/Export-Eigenschaft, nicht die korrekte Implementierung von Memory Atlas.
