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

Die Herkunftsbeschriftungen für Legende und Workspace-Inspektor verwenden jetzt reine, exhaustive Funktionen für alle drei Ursprünge. Der Widerruf prüft unabhängig von ungespeicherten Entwurfsänderungen, ob das gespeicherte Set mit derselben ID existiert; Vorschau, Freigabe und Export bleiben an den gespeicherten Entwurf gebunden. Ergänzt wurden Unit-Abdeckung sowie vorsichtige E2E-Assertions in `honesty.spec.ts`. Die Unit-/TypeScript-Gates liefen in `apps/web` erfolgreich; der Playwright-Lauf konnte den Vite-Webserver wegen `listen EPERM` auf `127.0.0.1:4173` nicht starten und ist offen.

## Abgleich Issues #3 bis #6 (2026-10-31)

- #3: Produkt unverändert (das Issue ist nur eine Lückenmarkierung). Auf Linux läuft `tests/e2e/offline.spec.ts` (file://, `dist-offline/index.html`, keine Konsolenfehler, keine Requests) mit Chrome for Testing 156 grün. Das Windows-Gate bleibt offen und ungetestet.
- #4: Produkt unverändert. `claude_profile_approved` bleibt `false`; es gibt kein anonymisiertes Sample und keines kommt ins Repo.
- #5: `apps/web/tests/unit/export-eligibility-matrix.test.ts` variiert die Sperrgründe einzeln und prüft die Reviewfrist vor dem 24-Stunden-Deckel.
- #6: Abgleich-Commit (Herkunftszustände, veraltete Vorschau) plus Legende, Inspektor, Widerruf-Button und neue Bilder.
