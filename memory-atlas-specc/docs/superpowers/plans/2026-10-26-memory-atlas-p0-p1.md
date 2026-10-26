# Memory Atlas P0/P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Wenn diese Skills nicht installiert sind, gelten dieselben Schritte für den normalen Cursor-Workflow; keine Skill-Installation ist Voraussetzung.

**Goal:** Einen vollständigen lokalen Ablauf von Chat-JSON über beleggebundene Wissenskarten bis zu explizit freigegebenem Memory liefern.

**Architecture:** Reine TypeScript-Domain-Funktionen und ein austauschbarer `AtlasStore`; Import im Worker; Oberfläche greift ausschließlich über den Service auf denselben Projektor zu. P1 speichert ausdrücklich eine Projektdatei und benötigt keinen Dienst.

**Tech Stack:** Vorhandenen geeigneten Stack erhalten; bei leerem Repo React/TypeScript/Vite, Vitest, Playwright, axe, React Flow nur für die begrenzte Graphansicht. JSON-Schema-Validierung mit lokal gebündeltem Draft-2020-12-Validator.

**Spec:** `memory-atlas-specc/SPECC.md`, `docs/DATA_MODEL.md`, `docs/KNOWLEDGE_RULES.md` und `contracts/domain.ts` im selben Paket.

## Global Constraints

- P0/P1 aktiv; P2/P3 bleiben eigene Folgeaufträge.
- P1 ohne Server, Datenbank, API-Schlüssel, Konto, Telemetrie oder externe Laufzeit-Assets.
- Mehrere JSON-Dateien; maximal 32 MiB pro Datei, 128 MiB pro Batch, 500 Dateien, 100.000 Nachrichten vor Deduplizierung, JSON-Tiefe 128 und 10.000 Elternkanten je Traversierung.
- Projekt-Snapshot maximal 256 MiB, 100.000 Nachrichtenrevisionen und 100.000 Review-Ereignisse; auch der nächste Commit muss speicherbar bleiben.
- Evidence-Spannen 0-basiert/halboffen in Unicode-Codepoints innerhalb genau eines `parts[part_index].text`.
- Kein `execution_verified` in P1; aktueller Memory-Export verwendet tatsächliches Jetzt, maximal 50 Claims und 16.000 UTF-8-Bytes Memory-Text.
- Bestehende Regeln, fremde Änderungen und Repo-Lizenz bewahren; persönliche Daten außerhalb von Git.
- Referenzbefehle unten gelten für den gewählten Zielaufbau. Bei bestehendem anderen Aufbau exakt entsprechende Befehle in `docs/implementation/STATE.md` mappen.

## Review Focus

- Ein späterer Export wählt einen anderen Gesprächszweig, während alte Belege noch auf die bisherige Revision zeigen → T2/T3.
- Emoji und kombinierte Zeichen machen DOM-Auswahl, UTF-16-Offsets und Codepoint-Spannen verschieden → T4.
- Eine rückwirkende Entscheidung wurde erst später importiert; historisches Wissen darf nicht rückwirkend entstehen → T5.
- Ein ablaufender Reviewtermin oder ein neuer Konflikt zwischen Vorschau und Download invalidiert die Freigabe → T8.
- Ein handveränderter Snapshot behauptet `execution_verified` oder gültige Freigaben → T3/T8.

## Geplanter Dateiaufbau

Die Pfade gelten relativ zur Repo-Wurzel. Die SPECC selbst bleibt im Unterordner `memory-atlas-specc/`.

- `apps/web/src/domain/`: `models.generated.ts`, `canonical.ts`, `provenance.ts`, `projection.ts`, `conflicts.ts`, `export.ts`.
- `apps/web/src/importers/`: `detect.ts`, `json-scan.ts`, `chatgpt.ts`, `claude.ts`, `normalize.ts`, `worker.ts`.
- `apps/web/src/store/`: `memory-store.ts`, `snapshot.ts`; `apps/web/src/services/atlas-service.ts`.
- `apps/web/src/features/`: `import`, `conversations`, `knowledge`, `changes`, `timeline`, `graph`, `review`, `sources`, `memory-sets`, `settings`.
- `apps/web/src/styles/tokens.css`; `apps/web/src/App.tsx`; `apps/web/src/main.tsx`.
- `apps/web/tests/`: `unit/`, `integration/`, `e2e/`; `tests/fixtures/` enthält ausschließlich synthetische Daten.
- `scripts/build-offline.mjs`; `docs/implementation/STATE.md`, `VALIDATION.md`, `VERSIONS.md`.

## T0 — Bestand und Umsetzungsbasis

**Files:** Lesen: vorhandene README/AGENTS/Manifeste/Lockfiles/Tests/HTML. Erstellen: `docs/implementation/STATE.md`.

**Interfaces:** Consumes tatsächlicher Repo-Stand. Produces nachvollziehbares Mapping „vorhanden / geprüft / fehlt“, Zielpfade und gewählter Stack.

- [ ] `git status --short`, Repo-Regeln und relevante Dateien lesen. Nicht existierende Artefakte als fehlend markieren.
- [ ] Vorhandene App mit ihren dokumentierten Befehlen starten, sofern ohne Eingriff möglich; Ergebnis festhalten. Ohne App keine Erfolgsbehauptung.
- [ ] Zielstruktur dieses Plans auf tatsächliche Pfade mappen, brauchbaren Prototyp erhalten, fremde Änderungen unangetastet lassen.
- [ ] AC23 erfüllen: dokumentierter Bestand und keine überschriebenen fremden Dateien. Optional lokaler Commit nur der eigenen Dokumentation.

## T1 — Verträge, Offline-Shell und erste Runde

**Files:** `apps/web/package.json`, Lockfile, `src/domain/models.generated.ts`, `src/domain/canonical.ts`, `src/store/memory-store.ts`, `src/store/snapshot.ts`, `src/App.tsx`, `scripts/build-offline.mjs`; Tests `unit/snapshot.test.ts`, `unit/canonical.test.ts`, `e2e/offline.spec.ts`.

**Interfaces:** Consumes JSON-Schemas und Vertragssignaturen. Produces `AtlasSnapshot`, `validateSnapshot(input)`, `MemoryStore.read/replace`, `canonicalize(value):string`, `sha256(bytes):Promise<string>`.

- [ ] Tests zuerst: synthetischer Snapshot validiert; unbekannte Major-Version und fremdes privilegiertes Feld werden abgewiesen; gleiche Schlüssel mit unterschiedlicher Einfügereihenfolge ergeben denselben Digest; Emoji-String bleibt exakt erhalten.
- [ ] Tests ausführen: `npm --prefix apps/web run test -- --run tests/unit/snapshot.test.ts tests/unit/canonical.test.ts`; fehlende Funktionen müssen scheitern, kein absichtlich dauerhaft roter Test.
- [ ] Schema-Typen generieren, referenzielle Prüfung anlegen, Store per Compare-and-Swap ersetzen. `JsonObject`-Platzhalter aus dem Vertragsdokument nicht als reale Modeltypen übernehmen.
- [ ] Leeren Workspace und Demo-Schalter bauen. Offline-Build als einzelne HTML-Datei mit lokalem Worker/Assets realisieren; Blob-Worker-CSP gezielt ermöglichen, keine beliebigen externen Quellen erlauben.
- [ ] Tests erneut grün und `npm --prefix apps/web run build:offline`; Playwright öffnet `file://.../dist-offline/index.html`, keine Console-Fehler und null ausgehende App-Requests. AC01/AC16, dann lokaler Commit.

## T2 — Robuster ChatGPT-Import

**Files:** `src/importers/{detect,json-scan,chatgpt,normalize,worker}.ts`, `src/services/atlas-service.ts`; Tests `unit/import-chatgpt.test.ts`, `integration/import-atomic.test.ts`.

**Interfaces:** Consumes `InputFile[]`, Snapshot, `ImportOptions`, Clock und AbortSignal. Produces `parseImport(...):Promise<NormalizedImport>`, `commitImport(store,staged):void` gemäß Vertrag.

- [ ] Golden-Fixtures aus dem Paket in die Teststruktur übernehmen. Test: 01-linear hat zwei logische Nachrichten und Nullwurzel; 02-branches hat beide Antworten, nur die ausgewählte auf `selected`; 08+09 gemeinsam verlieren keinen Chat.
- [ ] Test: doppelter Import erzeugt null neue logische Nachrichten/Revisionen; 06-revision verändert dieselbe logische Nachricht und bewahrt die frühere Revision. Abbruch/Fehler lässt Store-Digest unverändert.
- [ ] Tests zunächst ausführen; dann inhaltserkennenden Decoder, sicheren JSON-Scanner, Größenprüfung, Branch-Traversierung und immutable Revisionen implementieren.
- [ ] Nullzeiten/Platzhalter/unklare Branches als Diagnosen erhalten; alternative Auswahl in neuem Import verändert keine alten Evidence-Referenzen. Serialized Snapshot vor Commit gegen 256-MiB-Limit prüfen.
- [ ] `npm --prefix apps/web run test -- --run tests/unit/import-chatgpt.test.ts tests/integration/import-atomic.test.ts`; AC02/03/05/06/07/08 grün, dann Commit.

## T3 — Claude-Profil, Projektroundtrip und ungültige Eingaben

**Files:** `src/importers/claude.ts`, `src/store/snapshot.ts`; Tests `unit/import-claude.test.ts`, `unit/import-invalid.test.ts`, `integration/project-roundtrip.test.ts`.

**Interfaces:** Consumes dieselbe Importgrenze. Produces Claude-Normalisierung bei freigegebenem Profil; Projektöffnung über `validateSnapshot`, keine Wiederverwendung von Herstellerdecoder für Atlas-Dateien.

- [ ] Tests: `text` plus gleiche `content[]`-Blöcke wird nicht doppelt gezählt; unbekannte Hülle scheitert; `claude_profile_approved=false` meldet die fehlende Profilfreigabe. Synthetische Tests alleine setzen das Flag nicht.
- [ ] Roundtrip-Test: Quellen, IDs, Revisionen, Inhalte, Belege und Reviews bleiben gleich; importierte Exporthistorie erzeugt keine aktive Sessionfreigabe.
- [ ] Tests für duplicate keys, `__proto__`, Tiefe 129, ungültiges UTF-8, beschädigte Spannen und gefälschte `execution_verified`-Felder hinzufügen; Fehler ohne Teilimport.
- [ ] Implementieren und `npm --prefix apps/web run test -- --run tests/unit/import-claude.test.ts tests/unit/import-invalid.test.ts tests/integration/project-roundtrip.test.ts` ausführen. AC04/07/16; reales Claude-Sample-Gate ausdrücklich offen lassen, wenn kein zulässiges Sample vorliegt. Commit.

## T4 — Quelleninspektor und beleggebundene Karten

**Files:** `src/domain/provenance.ts`, `src/features/conversations/*`, `src/features/knowledge/*`, `src/features/sources/*`; Tests `unit/evidence.test.ts`, `e2e/source-card.spec.ts`.

**Interfaces:** Consumes immutable `Message.parts` und Evidence-Schema. Produces `validateEvidence(snapshot,evidence)`, neue Claim-Versionen und `confirm_source`-Ereignisse.

- [ ] Test: Text `A😀éB` (e + kombinierter Akzent) liefert für `[1,2)` exakt das Emoji; um einen Codepoint verschobene Spanne wird abgelehnt. Nicht über Textteile hinweg zitieren.
- [ ] Browser-Test: Originalrolle/Datum/Branch sichtbar; Auswahl erzeugt Kandidat mit genauer Quelle; „angenommen“ allein erhöht den Belegstatus nicht.
- [ ] Quellansicht inerte Texte, Medienplatzhalter und Branch-Umschaltung implementieren. Kartendialog für atomaren Text, Typ, Scope, Prädikat, Gültigkeit und Kategorie.
- [ ] `npm --prefix apps/web run test -- --run tests/unit/evidence.test.ts` und `npm --prefix apps/web run test:e2e -- tests/e2e/source-card.spec.ts`; AC10/11/22 grün, dann Commit.

## T5 — Zustände, Zeit und Konfliktregeln

**Files:** `src/domain/projection.ts`, `conflicts.ts`, `src/features/changes/*`, `src/features/timeline/*`, `src/features/review/*`; Tests `unit/projection.test.ts`, `unit/conflicts.test.ts`.

**Interfaces:** Produces `appendReview`, `projectClaim`, `detectConflicts` exakt gemäß Vertrag. Consumes QueryTime `{valid_at,known_at}`, Claims, Evidence, Reviews, Relations.

- [ ] Tests: neue Empfehlung ersetzt Nutzerentscheidung nicht; konkurrierende Single-Slot-Werte mit Überlappung werden disputed; anderes Projekt/Umgebung bleibt getrennt.
- [ ] Tests: bei bestätigter Ersetzung ab T gilt vor T die alte, ab T die neue Aussage; im Oktober erfasstes Wissen erscheint nicht in Kenntnisstand September; Review-Fälligkeit ist `due`, nicht automatisch `expired`.
- [ ] Tests: Änderungen erzeugen neue Claim-ID; revidierte Ereignisse werden ergänzt; `execution_verified` bleibt in P1 unerreichbar. Relation-Zyklus scheitert.
- [ ] Projektor/Checker zuerst implementieren, dann Alt/Neu-Dialog und zwei Zeitfilter. Konfliktauflösung muss alle wirksamen Widerspruchsrelationen berücksichtigen.
- [ ] `npm --prefix apps/web run test -- --run tests/unit/projection.test.ts tests/unit/conflicts.test.ts`; AC11/12/13/14 grün, dann Commit.

## T6 — Navigation, Datumsfilter und visuelle Oberfläche

**Files:** `src/styles/tokens.css`, `src/App.tsx`, `src/features/{import,knowledge,settings}/*`; Tests `unit/date-window.test.ts`, `e2e/navigation.spec.ts`.

**Interfaces:** Consumes derselbe Snapshot/Projektor; produziert Ansichten und kontrollierte Filter ohne neue Datenwahrheitslogik.

- [ ] Test sechs Kalendermonate Europe/Berlin: am 26.10.2026 Beginn 26.04.2026 00:00 lokal, Ende 27.10.2026 00:00 exklusiv; unbekannte Zeiten separat, Chats nach enthaltenen Nachrichten filtern.
- [ ] FQL-Tokens und drei responsive Layouts umsetzen; leer/laden/fehler/Teilunterstützung/dirty/demo klar unterscheiden. Speicherung ausdrücklich als Dateidownload, kein fiktiver Autosave.
- [ ] Tastaturtest: Navigation, Quelle, Konfliktdialog, Fokus-Rückkehr und Export erreichbar. `npm --prefix apps/web run test:e2e -- tests/e2e/navigation.spec.ts` plus Datumstest; AC09/20/21/22, dann Commit.

## T7 — Beziehungen als ergänzende Ansicht

**Files:** `src/features/graph/GraphView.tsx`, `graph-model.ts`, `GraphList.tsx`; Tests `unit/graph-model.test.ts`, `e2e/graph.spec.ts`.

**Interfaces:** `buildGraph(snapshot,filters,at):GraphViewModel` mit höchstens 150 sichtbaren Knoten und `total_matching_count`; Knoten-/Kanten-IDs aus vorhandenen Daten.

- [ ] Test: nur vorhandene Relation erzeugt Kante; Filter über 150 zeigt sichtbare Gesamtzahl und Liste; Graphdaten verändern keinen Claim-Status.
- [ ] Lokal gebündeltes React Flow verwenden, falls React gewählt; im vorhandenen anderen Stack funktional gleichwertige bestehende Lösung erhalten. Nicht zwei Graphbibliotheken installieren.
- [ ] Keyboard-/Listenalternative, Auswahl → Quellenpanel, Reduced Motion implementieren; AC15/20 prüfen und Commit.

## T8 — Exakte Memory-Freigabe und Downloads

**Files:** `src/domain/export.ts`, `src/features/memory-sets/*`, `src/services/session.ts`; Tests `unit/export-policy.test.ts`, `integration/export-approval.test.ts`, `e2e/memory-export.spec.ts`.

**Interfaces:** `evaluateEligibility`, `prepareMemorySet`, `approveMemorySet`, `exportMemorySet`; Output `ExportFiles`. Die Session-ID entsteht im vertrauenswürdigen App-Laufzeitdienst und ist nicht importierbar.

- [ ] Allow/Block-Matrix AC17 als Tests: candidate/disputed/private/secret/unknown/due/superseded/unknown-time/wrong-scope/ungeprüfte Ausführung blockieren. Historischer Filter beeinflusst Export-Jetzt nicht.
- [ ] Test: Preview erzeugt JSON-/Markdown-Bytes und Digests; Freigabe bindet exakt diese; Mutation, neuer Konflikt, geänderter Empfänger, Revocation oder verstrichene Frist blockiert. Identische spätere Ausgaben brauchen keine heimlich neu serialisierten Dateien.
- [ ] Test: 51 Claims oder 16.001 Textbytes scheitern ohne Kürzung. Rohzitate/Dateipfade/Schlüssel fehlen im Memory; `context_only=true`; Empfehlung nur bei aktivierter Option und eindeutiger Beschriftung.
- [ ] Exportdialog mit vollständiger Vorschau und expliziter Freigabe implementieren. Fertige Bytes plus separates Manifest herunterladen. Approvals nicht in Browser-Storage persistieren.
- [ ] Unit/Integration-Tests und echter Download-Browsertest ausführen, Dateibytes gegen Preview vergleichen; AC17/18/19 grün, dann Commit.

## T9 — Gesamtfluss und überprüfbare Qualität

**Files:** `tests/e2e/complete-flow.spec.ts`, `tests/e2e/accessibility.spec.ts`, `docs/implementation/VALIDATION.md`.

**Interfaces:** Vollständige App durch öffentliche UI, keine internen Abkürzungen für den Erfolgspfad.

- [ ] Synthetische Dateien importieren → Quelle auswählen → Karte erstellen → Herkunft/Datenschutz/Gültigkeit prüfen → Konflikt lösen → Projekt speichern/neu öffnen → Memory neu freigeben → herunterladen.
- [ ] Nach Reload nie behaupten, ungespeicherte Sitzung sei erhalten. Im geöffneten Projekt alte Reviews sichtbar, erneute Exportfreigabe erforderlich.
- [ ] `npm --prefix apps/web run test -- --run`, `npm --prefix apps/web run test:e2e`, `npm --prefix apps/web run typecheck`, `npm --prefix apps/web run build:offline`; dokumentiere tatsächliche Befehle/Ergebnisse und Defekte.
- [ ] Bei 1440×900, 1024×768, 390×844, Reduced Motion und Tastatur prüfen. Axe ohne kritische/ernste Befunde; manuelle Screenreader-Grenze benennen.
- [ ] Leistungsziele aus ACCEPTANCE auf benannter Maschine messen; keine ungemessenen Zahlen als Erfolg nennen. Windows-User-Test nur bei vorhandenem Windows als bestanden melden. Konkrete Defekte beheben, keine endlosen zusätzlichen Tests ohne Risikoanlass.

## T10 — Releasefähige Übergabe

**Files:** Repo-README, `docs/implementation/{STATE,VALIDATION,VERSIONS}.md`, Lizenz-/Notice-Dateien, `.gitignore` nach Prüfung ergänzen.

**Interfaces:** Produces tatsächliche Startbefehle, Offline-Artefakt, bekannte Profilgrenzen, Checkliste und nächste P2-Aufgabe.

- [ ] Anforderungen MA001–022/029/030 mit Tests abgleichen; jeden fehlenden Gate benennen. Reale Anbieterprofil-Kompatibilität getrennt von synthetischen Tests dokumentieren.
- [ ] Dokumentiere Speichergrenzen, manuelle P1-Extraktion, fehlende P2/P3-Module und gewählte Versionen. Kein Cloud-Upload, Merge oder Deployment.
- [ ] Änderungen lokal reviewen, nur eigene Dateien committen soweit im Repo vorgesehen. Benutzer erhält Ergebnis, Tests und Einschränkungen; P2 bleibt gesonderter Folgeauftrag.

## Ausführungsnachweis

Dieser Plan beschreibt noch auszuführende App-Arbeit. Die Prüfung des SPECC-Pakets bestätigt keine dieser App-Tests. Cursor füllt für jede Aufgabe Start/Ende, Commit falls vorhanden, Befehle und Ergebnis in `docs/implementation/STATE.md` aus.
