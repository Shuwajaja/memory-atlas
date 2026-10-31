# Bestand und Umsetzung

## Vor dem Auftrag

Geprüft am 2026-10-26 im leeren Arbeitsbaum von `main` (`cdcb4cc`, „Initial commit“).

| Artefakt | Befund |
|---|---|
| `README.md` | Nur die Zeile `# memory-atlas`. Inhalt blieb erhalten und wurde ergänzt. |
| `AGENTS.md`, `.cursor/rules` | Nicht vorhanden. Die Vorlagen aus `memory-atlas-specc/templates/` wurden als neue Dateien übernommen, nicht über fremde Regeln gelegt. |
| Lockfile, `package.json`, Tests, HTML, App | Nicht vorhanden. Kein Startbefehl war dokumentiert, deshalb wurde keine vorhandene App gestartet. |
| Lizenz | Nicht vorhanden. MIT wurde für diese Umsetzung ergänzt und in der README als neu benannt. |
| `memory-atlas-specc/` | Durch `unzip -n` neben die README gelegt. Keine Datei im Paket wurde überschrieben oder danach verändert. |

## Gewählter Aufbau

Leeres Repository, deshalb der im Plan genannte Stack, mit exakten Versionen in `docs/implementation/VERSIONS.md`.

| Planpfad | Tatsächlicher Pfad |
|---|---|
| Domain, Import, Store, Service | `apps/web/src/domain`, `importers`, `store`, `services` |
| Oberflächen | `apps/web/src/features/*`, `App.tsx`, `styles/tokens.css` |
| Tests | `apps/web/tests/unit`, `integration`, `e2e` |
| Offline-Build | `scripts/build-offline.mjs` → `apps/web/dist-offline/index.html` |
| Diese Notizen | `docs/implementation/` |

`models.generated.ts` spiegelt Schema 1.0.0 von Hand. Es ist keine Schema-Codegenerierung. Die Verträge aus `memory-atlas-specc/contracts/domain.ts` sind mit konkreten Typen umgesetzt, nicht mit `JsonObject`-Platzhaltern.

P2/P3 (SQLite, FastAPI, Gemini, MCP, AC25–AC30, MA-023–MA-028) sind nicht begonnen.

## Abgleich 2026-10-27

Ausgang: `2457028fc19c5dad2ce16cfd8e707bbbafce0413` (`main`, CI-Lauf 40431439224 grün). Der Vergleich nutzt `docs/TRACEABILITY.md`, `docs/implementation/VALIDATION.md` und den Code dieses Stands. Persönliche Chats wurden nicht gelesen und nicht geschrieben.

Drei sichtbare Fehler in der Trennung von Beispiel, Quelle und Freigabe sind behoben:

- Ein Import in den Demo-Workspace löscht die Kennzeichnung „Demo · synthetisch“ nicht mehr.
- Leere Illustration, Demo und eigener Import tragen getrennte Beschriftungen. Die Übersicht bietet Claude nicht mehr als freigegebenen Import an. Die Navigationszähler der leeren Illustration sind 0.
- Vorschau und Freigabe bleiben gesperrt, solange der sichtbare Memory-Entwurf vom gespeicherten Set abweicht. „Angenommen“ und „freigegeben“ sind auf der Übersicht nicht mehr dasselbe Wort.

Nicht geändert, weil kein reproduzierter Produktfehler vorlag: der Offline-Build, die Exportmatrix, Windows, reale Claude-Samples und die übrigen in `docs/TRACEABILITY.md` als offen geführten Punkte. Die Golden-Datei `memory-atlas-specc/examples/memory-export.json` bindet `expires_at` bereits auf `2026-10-27T16:15:00Z`. Die Bilder unter `docs/images/` zeigen noch die ältere Fußzeile.

Die Bilder unter `docs/images/` wurden am 2026-10-31 mit dem synthetischen Demo-Bestand neu aufgenommen (Chrome for Testing 156, 1440 px) und zeigen die aktuelle Fußzeile.

In dieser Session ausgeführt: `npx vitest run` (17 Dateien, 55 Tests, Exit 0), `npx tsc -p tsconfig.json --noEmit` (Exit 0), Playwright `--project=chromium` für `honesty.spec.ts` (4 bestanden), `complete-flow.spec.ts` (1 bestanden) und `memory-export.spec.ts` (1 bestanden). Nicht erneut ausgeführt: die übrige E2E-Suite, Axe, `build:offline`, `file://` und Windows.

## Rest Issue #6

Die Herkunftsbeschriftungen für Legende und Workspace-Inspektor verwenden jetzt reine, exhaustive Funktionen für alle drei Ursprünge. Der Widerruf prüft unabhängig von ungespeicherten Entwurfsänderungen, ob das gespeicherte Set mit derselben ID existiert; Vorschau, Freigabe und Export bleiben an den gespeicherten Entwurf gebunden. Ergänzt wurden Unit-Abdeckung sowie vorsichtige E2E-Assertions in `honesty.spec.ts`.

Historie — **überholt**: Die Unit-/TypeScript-Gates liefen in `apps/web` erfolgreich; der damalige Playwright-Lauf konnte den Vite-Webserver wegen `listen EPERM` auf `127.0.0.1:4173` nicht starten und blieb zu diesem Zeitpunkt offen.

Aktualisierung 2026-10-31/2026-11-01 laut Arbeitsauftrag (gemeldeter Vorlauf, hier nicht erneut ausgeführt): Playwright **18/18 E2E**, **81 Unit-/Integrationstests** und Typecheck grün. Der frühere Portfehler ist keine offene Produktprüfung dieses Stands mehr. Das Windows-Gate und der vollständige `file://`-Ablauf bleiben davon getrennt; der vorhandene Offline-E2E prüft nur Demo/Navigation, siehe `docs/TRACEABILITY.md`.

## Abgleich Issues #3 bis #6 (2026-10-31)

- #3: Produkt unverändert (das Issue ist nur eine Lückenmarkierung). Auf Linux läuft `tests/e2e/offline.spec.ts` (file://, `dist-offline/index.html`, keine Konsolenfehler, keine Requests) mit Chrome for Testing 156 grün. Das Windows-Gate bleibt offen und ungetestet.
- #4: Produkt unverändert. `claude_profile_approved` bleibt `false`; es gibt kein anonymisiertes Sample und keines kommt ins Repo.
- #5: `apps/web/tests/unit/export-eligibility-matrix.test.ts` variiert die Sperrgründe einzeln und prüft die Reviewfrist vor dem 24-Stunden-Deckel.
- #6: Abgleich-Commit (Herkunftszustände, veraltete Vorschau) plus Legende, Inspektor, Widerruf-Button und neue Bilder.

## Lokaler Auftrag Issues #3/#4 (2026-11-01)

Arbeitsbasis: Worktree `ma-3-4-local` (laut Auftrag PR-#8-Stand), bei Beginn sauber. Quellen: `AGENTS.md`, `docs/TRACEABILITY.md`, dieser Stand, SPECC/Importvertrag/AC01/AC04/AC24 und tatsächliche Import-/Downloadgrenzen. Geänderte Dateien: diese Datei, `WINDOWS-GATE.md`, `docs/TRACEABILITY.md`, `apps/web/tests/unit/import-{chatgpt,claude,invalid}.test.ts` und `apps/web/tests/fixtures/claude/SYNTHETIC-account-export.json`. Keine Produktfreigabe, kein Netzwerk, keine Git-Schreiboperationen.

- #3: 12 neue Unit-Fälle für Windows-Namensmetadaten, Endungssperren und CRLF. Gezielter Lauf `npm test -- tests/unit/import-chatgpt.test.ts tests/unit/import-invalid.test.ts`: **2 Dateien, 27 Tests bestanden**. Keine Pfad-/URL-Auflösung im Importer; reservierte Namen werden nur als Strings geprüft. Konkrete PowerShell-Befehle und vollständiger manueller `file://`-Ablauf für Shu stehen in `WINDOWS-GATE.md`. **BLOCKED: Windows-Abnahme braucht einen Windows-Rechner mit normalem Konto.** Die bestehenden Offline-E2E ersetzen den vollständigen `file://`-Ablauf nicht.
- #4: Neues `apps/web/tests/fixtures/claude/SYNTHETIC-account-export.json`, vollständig erfunden, mit SYNTHETIC-Dateiname, -Feld, -Titel, -IDs und -Texten. Vier neue Testfälle prüfen Decoder-Reihenfolge, Text/Fallback ohne Verdopplung, Platzhalter und unbekannten Branch, atomare Ablehnung durch `parseImport` bei `auto` und explizitem Profil mit Flag false sowie das false-Literal der tatsächlichen UI-Importoptionen (statischer Guard). Der Decoder wird direkt geprüft, ohne das Flag zu aktivieren. Produktcode unverändert: `claude_profile_approved` bleibt **false**. Gezielter Lauf `npm test -- tests/unit/import-claude.test.ts`: **1 Datei, 7 Tests bestanden**. Die bestehende FI11-Testoption ist keine Produktfreigabe. **BLOCKED: echtes anonymisiertes Sample braucht einen echten Export von Shu**, zur minimalen lokalen Prüfung außerhalb des Repos samt Golden-Ergebnissen (AC04/AC24). Kein echter Inhalt im neuen Fixture; synthetische Checks erfüllen das Realsample-Gate nicht. Browser-API-JSON und Claude-Code-JSONL bleiben ungeprüft.

Abschlussprüfung in `apps/web`: fehlende Abhängigkeiten mit `npm ci --ignore-scripts --offline --no-audit --no-fund` installiert (**82 Pakete, Exit 0**, kein Netzwerk). `npm test`: **18 Dateien, 97/97 Unit-/Integrationstests bestanden**, davon 16 neue Fälle. `npm_config_offline=true npx tsc --noEmit`: **Exit 0** nach Korrektur der Literaltyp-Inferenz im neuen parametrisierten Test. `git diff --check`: Exit 0. Playwright und Offline-Build in dieser Session nicht erneut ausgeführt (laut Auftrag nicht erforderlich); die oben genannten **18/18 E2E** sind der vom Nutzer gemeldete Vorlauf, kein eigener aktueller Lauf. Windows, vollständiger `file://`-Browserablauf und echtes Claude-Sample nicht ausgeführt; entsprechende Gates bleiben offen. Kein Commit/Add/Push, PR, Merge oder Deployment.
