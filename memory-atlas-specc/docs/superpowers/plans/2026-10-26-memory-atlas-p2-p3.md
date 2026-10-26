# Memory Atlas P2/P3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das freigegebene P1 um ein dauerhaftes lokales Archiv und anschließend ausdrücklich aktivierte Assistenz-/Exportadapter ergänzen.

**Architecture:** `AtlasSnapshot` und bestehende JSON-Verträge bleiben verbindlich. SQLite ersetzt den flüchtigen Store; die lokale API liefert dieselbe gebaute UI. Backend-Projektion und Exportprüfung werden vor Aktivierung gegen die reine TypeScript-Domain geprüft.

**Tech Stack:** Python 3.12+, `sqlite3`/FTS5, FastAPI, Uvicorn; vorhandenes React/TypeScript/Vite-Frontend; pytest und vorhandene Vitest-/Playwright-Werkzeuge.

**Spec:** [SPECC.md](../../../SPECC.md), [ARCHITECTURE.md](../../ARCHITECTURE.md), [KNOWLEDGE_RULES.md](../../KNOWLEDGE_RULES.md), [PRIVACY_AND_SECURITY.md](../../PRIVACY_AND_SECURITY.md); zusätzlich `contracts/domain.ts`, `schemas/atlas.schema.json` und `docs/IMPORTS.md` lesen.

## Global Constraints

- **Ausgeschalteter Folgeplan:** Der erste Cursor-Auftrag umfasst P0/P1. P2 und P3 benötigen jeweils einen eigenen späteren Auftrag; jetzt keine Implementierung oder Installation.
- „Python 3.12 oder neuer, projektspezifische virtuelle Umgebung, `sqlite3` mit FTS5, FastAPI und Uvicorn.“ Kein Stackwechsel und keine zusätzliche Vektordatenbank.
- Bindung ausschließlich `127.0.0.1:47123`; Windows unter normalem Benutzerkonto, ohne Docker, Administratorrechte, systemweiten Dienst oder separate Datenbankinstallation; kein Node zur Endnutzer-Laufzeit.
- Daten außerhalb Git: `%LOCALAPPDATA%/MemoryAtlas/workspaces/<workspace-id>/`; dokumentiertes `MEMORY_ATLAS_DATA_DIR` berücksichtigen. Linux-Pfade gemäß Architektur.
- Importgrenzen bleiben 32 MiB/Datei, 128 MiB/Batch, 100.000 Nachrichten, 500 Dateien, JSON-Tiefe 128; Erhöhung erst nach gemessenem separatem Gate.
- Export: höchstens 50 Karten/16.000 UTF-8-Bytes; Preview 15 Minuten, Freigabe höchstens 24 Stunden und kürzeste fachliche Frist; keine Rohbelege.
- Nur synthetische CI-Daten, minimale Logs, keine automatische Veröffentlichung. Genannte Skills sind Workflowhilfen, keine Produktabhängigkeiten oder Installationsaufträge.

## Review Focus

- Stromverlust zwischen Migration/Staging/Commit: alter oder vollständiger neuer Zustand, kein Mischzustand — U1/U3.
- Fremde Webseite, `Origin: null`, DNS-Rebinding und Bootstrap-Replay: keinerlei Datenzugriff — U2.
- Altes Backup nach Datenschutzlöschung: keine Wiederbelebung und keine vertrauenswürdige Importfreigabe — U3.
- Emoji-Spannen, Prompt-Injection, unbekannte Kosten und Wiederholungsversuche: keine privilegierten Kandidaten oder Budgetüberschreitung — U4/U5.
- Veralteter Scope, abgelaufene Freigabe, falsche Verifikationsrevision: kein Adapterexport/Verifikationsaufstieg — U6.

---

## Dateikarte und Ausführung

Alle folgenden Pfade sind **vorgeschlagen, relativ zur Repo-Wurzel**. Vor Ausführung mit dem P1-Bestand abgleichen; Vertragsabweichungen zuerst konsistent dokumentieren.

| Einheit | Verantwortung und Hauptpfad |
|---|---|
| U1 | `backend/memory_atlas/storage/` — Archiv, Migration, Suchindex |
| U2 | `backend/memory_atlas/api/` — Sitzung, Projektor, Exportgate |
| U3 | `backend/memory_atlas/archive/` — Jobs, Backup, Löschjournal |
| U4 | `backend/memory_atlas/extraction/` — Provider, Cache, Budget |
| U5 | `apps/web/src/importers/gemini.ts` — eigener Takeout-Adapter |
| U6 | `backend/memory_atlas/adapters/` — begrenzte Verbraucher/Verifier |

Abhängigkeiten: U1 → U2 → U3; P2-Abnahme; U4 und U5 separat aktivieren; U6 nach U2/U3 und eigener Freigabe. Die virtuelle Umgebung muss vor Testausführung kontrolliert eingerichtet sein. PowerShell-Testalias: `$AtlasPython = ".\.venv\Scripts\python.exe"`. Befehle unten sind geplante Prüfungen, keine ausgeführten Ergebnisse. Nach jedem grünen Gate nur die zugehörigen Dateien committen.

### U1 — SQLite/FTS5 und Migrationen · MA-023

**Dateien:** neu `backend/requirements.lock`, `backend/memory_atlas/contracts.py`, `backend/memory_atlas/storage/{sqlite_store,migrations}.py`, `backend/migrations/0001_archive.sql`; Tests `backend/tests/test_sqlite_store.py`.

**Schnittstellen:** `read_snapshot(workspace_id: str) -> AtlasSnapshot`; `replace_snapshot(workspace_id: str, expected_digest: str, snapshot: AtlasSnapshot) -> str`; `search(workspace_id: str, query: str, limit: int) -> list[SearchHit]`. `SearchHit = {record_type: "message_revision"|"claim", id: str, rank: float}`; Domain-JSON unverändert validieren.

- [ ] Tests zuerst: `test_roundtrip`, `test_crash_rollback`, `test_two_writers`, `test_missing_fts5`. Assertions: `restored == original`, `writers_active <= 1`, falscher Digest → Konflikt, fehlendes FTS5 → Startfehler ohne Schreibzugriff.
- [ ] `& $AtlasPython -m pytest backend/tests/test_sqlite_store.py -q` zunächst rot ausführen.
- [ ] Architekturtabellen, rekonstruierbare FTS-Indizes, Fremdschlüssel, parameterisierte Queries, lokalen WAL, `busy_timeout=5000` und maximal drei Wiederholungen implementieren. Migration mit Versionsprüfung, SQLite-Backup und Transaktion; temporäre FTS5-Tabelle tatsächlich anlegen/löschen.
- [ ] Gleichen Befehl grün ausführen. **Gate:** Snapshot-Rundlauf und Crash-Recovery erhalten IDs, Revisionen, Events und Unicode; fehlgeschlagene Migration verändert das Original nicht. Commit `feat: add transactional SQLite archive`.

### U2 — Sichere lokale API und Windows-Start · MA-023, MA-029

**Dateien:** neu `backend/memory_atlas/api/{app,session,policy}.py`, `apps/web/src/services/HttpAtlasService.ts`, `scripts/start-windows.ps1`; Tests `backend/tests/test_local_api.py`, `apps/web/tests/contracts/p2-policy-golden.test.ts`, `apps/web/tests/e2e/p2-session.spec.ts`; gemeinsame Goldens `tests/fixtures/contracts/p2-policy.json`.

**Schnittstellen:** `POST /api/session/bootstrap` tauscht einmaligen Fragmenttoken gegen Speicher-Session; `GET /api/snapshot -> AtlasSnapshot`. POST-Bodies und Rückgaben: `/api/project {claim_id,valid_at,known_at} -> ClaimProjection`; `/api/memory/prepare {set_id} -> {preview_id,payload,payload_sha256,json_sha256,markdown_sha256,preview_expires_at}`; `/api/memory/approve {preview_id,expected_payload_sha256} -> {approval_id,expires_at}`; `/api/memory/export {approval_id,format:json|markdown|manifest} -> exakte Datei-Bytes` mit passendem Content-Type. Bytes, State-Digest und Approval-Records bleiben serverseitig gespeichert; Clients reichen keine autoritativen Bytearrays oder Freigabeobjekte zurück. Server leitet Actor/Session aus der lokalen Sitzung ab, prüft Preview gegen aktuellen Store und erzeugt lokale Approval-Receipts; importierte Angaben autorisieren nichts.

- [ ] Tests zuerst: `assert bootstrap_replay.status_code == 401`; fremder Host/Origin, `null`, fehlende Session und fehlender Mutations-CSRF → Ablehnung. Paritätsgoldens prüfen `projectClaim` und exakte `exportMemorySet`-Bytes einschließlich Fristen und manipulierten Freigaben.
- [ ] Rot ausführen: `& $AtlasPython -m pytest backend/tests/test_local_api.py -q`; `npm --prefix apps/web run test -- --run tests/contracts/p2-policy-golden.test.ts`.
- [ ] Session-/CSRF-Header, strikte eigene Origin, fragmentfreie Navigation, speicherbasierte Tokens und serverseitige finale Exportprüfung implementieren. Ein fehlender Origin-Header bei legitimen Same-Origin-GETs ist bei gültigem Session-Header und exaktem Host erlaubt; vorhandene fremde/null-Origin immer ablehnen und mutierende Requests nur mit eigener Origin plus CSRF akzeptieren. Keine zweite abweichende Policy: Python-Port nur mit gemeinsamen versionierten Goldens aktivieren. Launcher serviert UI, prüft Port und Datenpfad; keine automatische Installation.
- [ ] Befehle grün; zusätzlich `npm --prefix apps/web run test:e2e -- tests/e2e/p2-session.spec.ts` und `powershell -NoProfile -File scripts/start-windows.ps1 -WorkspaceId smoke`. **Gate:** echter Windows-Standardnutzer, kein Node/Docker/Admin, Portkonflikt verständlich, kein LAN-Listener/Secretlog. Commit `feat: secure local archive session`.

### U3 — Wiederaufnahme, Backup und Datenschutzlöschung · MA-023/024

**Dateien:** neu `backend/memory_atlas/archive/{jobs,backups,purge,tombstones}.py`, `backend/migrations/0002_jobs.sql`; Tests `backend/tests/test_archive_lifecycle.py`; UI `apps/web/src/features/archive/ArchiveMaintenance.tsx`.

**Schnittstellen:** `resume_import(job_id: str, input_digest: str, adapter_version: str, policy_version: str) -> ImportJob`; `backup(workspace_id: str) -> str`; `purge(workspace_id: str, source_ids: list[str]) -> str`; `restore(workspace_id: str, backup_id: str) -> AtlasSnapshot`. Rückgabe-Strings sind opake IDs, keine fremden Dateipfade.

- [ ] Tests zuerst: Resume-Digestabweichung blockiert; Crash erzeugt keinen Teilimport; nach Löschung und Altbackup-Restore `deleted_ids.isdisjoint(restored_ids)`; identischer Reimport erzeugt null Datensätze; restaurierte Freigaben bleiben `imported_untrusted`.
- [ ] Rot: `& $AtlasPython -m pytest backend/tests/test_archive_lifecycle.py -q`.
- [ ] Persistierte Staging-Jobs und atomaren Commit ergänzen. Löschvorschau erfasst Originale, Ableitungen, FTS, Vorschauen, Cache und verwaltete Exportkopien. DB-Löschung/Tombstones atomar; Dateilöschung über persistente Warteschlange, Erfolg erst nach Abschluss. Inhaltsfreies HMAC-Löschjournal unter `<data-root>/control/`, Schlüssel im OS-Speicher, unabhängig vom Archiv-Restore halten; Wiederanlauf führt Löschung fort. Geänderte Exportidentitäten bleiben eine sichtbare Erkennungsgrenze.
- [ ] SQLite-Backup-API, Retention-Vorschau und Restore mit aktuellem Tombstone-Abgleich implementieren; externe Kopien ausdrücklich benennen. Befehl grün. **Gate:** Restore invalidiert alte Ausgabeauthorisierung; Zugriff auf ausstehend zu löschende Inhalte gesperrt. Commit `feat: add recoverable archive lifecycle`. P2 erst danach separat abnehmen.

### U4 — Opt-in-Extraktion, Cache und Budget · MA-025

**Dateien:** neu `backend/memory_atlas/extraction/{provider,cache,budget,evaluate}.py`, `apps/web/src/features/extraction/ConsentPreview.tsx`; Tests `backend/tests/test_extraction.py`, Fixtures `tests/fixtures/extraction/cases.json`.

**Schnittstellen:** `extract(request: ExtractionRequest) -> ExtractionResult`. Interne Typen in `provider.py`: `MessageWindow = {revision_id: str,node_id: str,part_index: int,start_cp: int,end_cp: int,text: str}`; Request mit `windows: list[MessageWindow]`, Strings `provider`, `model_version`, `adapter_version`, `prompt_version`, `policy_version`, `consent_digest`, außerdem `max_tokens: int`, `max_cost_usd: Decimal|None`. Result: `claims: list[Claim]`, `evidence: list[Evidence]`, `tokens_used: int|None`, `cost_usd: Decimal|None`, `diagnostic_codes: list[str]`; keine menschlichen Review-Ereignisse.

- [ ] Tests zuerst: ohne Consent/Budget `provider_calls == 0`; Emoji/Kombinationszeichen exakt per Codepoints auflösen, ungültiger Span → null Kandidaten; `review_events == []`; Cachetreffer → null Kostenaufrufe; Prompt-Injection erzeugt kein `execution_verified`.
- [ ] Rot: `& $AtlasPython -m pytest backend/tests/test_extraction.py -q`.
- [ ] Lokale/Cloud-Konfiguration trennen; Schlüssel im Dienst/OS-Speicher. Cache nach Fenstern und allen Versionen; Budget vor jeder Einheit reservieren, unklare Timeoutkosten konservativ reserviert lassen. Unbekannter Preis verlangt Tokenlimit plus Vorschauhinweis. U3-Purge um Cache erweitern.
- [ ] Befehl grün; `& $AtlasPython -m backend.memory_atlas.extraction.evaluate --fixtures tests/fixtures/extraction/cases.json`. **Gate:** alle Referenz-/Negativfälle bestehen; separat freigegebenes Evaluationsset berichtet belegte Präzision, Auslassungen und Kosten ohne erfundene Erfolgsschwelle. Commit `feat: add consented extraction candidates`.

### U5 — Gemini-Fixture-Adapter · MA-026

**Dateien:** neu `apps/web/src/importers/gemini.ts`, `docs/import-profiles/gemini-takeout-activity-v1.md`, `tests/fixtures/gemini/{01-activity,02-unsupported,expected}.json`, `apps/web/tests/unit/gemini.test.ts`.

**Schnittstellen:** `detectGemini(input: unknown): "gemini-takeout-activity-v1" | null`; `parseGeminiImport(files: readonly InputFile[], base: AtlasSnapshot, options: ImportOptions, clock: Clock, signal: AbortSignal): Promise<NormalizedImport>`; das Profile-Enum versioniert erweitern.

- [ ] Datenschutzgeprüftes echtes Takeout-Sample lokal untersuchen; beobachtete Hülle/Felder dokumentieren. Original außerhalb Git; nur synthetisch nachgebildete Fixtures übernehmen. Ohne Sample bleibt Profil deaktiviert.
- [ ] Golden-Tests schreiben: kanonisches Normalisierungsergebnis exakt gleich `expected.json`; Wiederimport ohne neue Revision; unbekannte Zeit bleibt null; unbewiesener Branch bleibt `unknown`; unbekannte Hülle abgelehnt.
- [ ] `npm --prefix apps/web run test -- --run tests/unit/gemini.test.ts` rot; eigenen Adapter implementieren, niemals Gemini in ChatGPT-/Claude-Adapter umbenennen; grün wiederholen.
- [ ] **Gate:** echtes Sample plus synthetische Goldens, Unicode-/Injection-Prüfung und dokumentierte Teilunterstützung. Commit `feat: add gated Gemini Takeout profile`.

### U6 — Begrenzte Adapter und unabhängige Verifikation · MA-027, MA-028

**Dateien:** neu `backend/memory_atlas/adapters/{consumer,mcp_stdio,honcho,graphiti,truthlens}.py`, `backend/memory_atlas/verification/receipts.py`, `contracts/d34-status.schema.json`; Tests `backend/tests/test_consumer_adapters.py`, `backend/tests/test_verification.py`.

**Schnittstellen:** `read_approved_set(set_id: str, scope: ConsumerScope, now: datetime) -> MemoryPayload`; Scope stammt aus gebundener Adapterkonfiguration. `verify_binding(receipt: VerificationReceipt, claim: Claim, now: datetime) -> bool`. Interner Receipt-Vertrag: Strings `trusted_receipt_id`, `claim_id`, `kind` (`fact|execution`), `target`, `environment`, `result`, `evidence_digest`; `action`/`revision: str|None`; `observed_at`/`expires_at: datetime`. Vertrauenswürdigen Serverregister-Eintrag nachschlagen; bei `execution` Aktion und Revision verlangen. Beliebiges Client-JSON erzeugt keinen solchen Eintrag.

- [ ] Tests zuerst: falscher Scope/abgelaufene Freigabe → `ExportDenied` aus `consumer.py`, keine Payload; Modell-/Tooltext oder falsche Revision → `False`; D34-Ausgabe enthält ausschließlich erlaubten Prüfstatus, keine Belege/Pfade/Schlüssel. Ausfall ändert Snapshot nicht.
- [ ] Rot: `& $AtlasPython -m pytest backend/tests/test_consumer_adapters.py backend/tests/test_verification.py -q`.
- [ ] U2-Exportgate wiederverwenden; MCP ausschließlich stdio und lesend. Honcho/Graphiti lesen Atlas-Sets ohne Rückschreib-/Selbstfreigaberecht; Übertragung benötigt Empfängervorschau. Graphiti-Telemetrie aus; keine Kuzu-Basis. AGPL-Integrationsgrenze für Honcho prüfen.
- [ ] D34-Allowlist erst aus vorliegendem TruthLens-Vertrag übernehmen, Schema mit `additionalProperties: false`; andernfalls Adapter deaktiviert. Status allein verifiziert keine Aktion; unabhängige Receipts bleiben im privilegierten lokalen Kanal. Externe Tatsachen benötigen passende unabhängige zeitgebundene Belege.
- [ ] Beide Tests grün. **Gate:** vollständige MA-027-/MA-028-Negativmatrix, Ausfallisolation, D34-Vertrag und Empfängerfreigabe dokumentiert. Commit `feat: add scoped memory consumers`.

## Abschlussgate

- [ ] MA-023→U1/U2/U3, MA-024→U3, MA-025→U4, MA-026→U5, MA-027→U6, MA-028→U6 sowie MA-029 und MA-030 nachverfolgen.
- [ ] Tatsächliche Befehle, Ergebnisse und Windows-Prüfung in `docs/implementation/STATE.md` festhalten; deaktivierte Adapter als deaktiviert ausweisen. Keine P2/P3-Fertigmeldung aus einem fertigen Plan ableiten.
