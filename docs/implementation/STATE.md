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
