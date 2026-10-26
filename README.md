# memory-atlas

Lokale, quellengebundene Wissenskarten aus Chat-Exporten. P0 und P1 laufen als einzelne Offline-Seite im Browser: Import, Prüfung, explizite Freigabe, Dateidownload. Es gibt keinen Server, kein Konto und keine Telemetrie.

Das Repository enthielt vor dieser Umsetzung nur diese Überschrift. Die Spezifikation liegt unverändert in `memory-atlas-specc/`. Eine Lizenz war nicht vorhanden; diese Umsetzung steht unter MIT, siehe `LICENSE`.

## Start

```bash
npm --prefix apps/web install
npm --prefix apps/web run dev
```

Die App spricht Deutsch und öffnet unter `http://127.0.0.1:4173`. Speichern lädt eine `.atlas.json` herunter. Ein Neuladen stellt die Sitzung nicht wieder her.

Demo-Daten sind synthetisch und bleiben als **Demo · synthetisch** gekennzeichnet. Das Claude-Profil ist nicht freigegeben. Gemini, SQLite und MCP gehören zu P2/P3 und sind nicht enthalten.

## Prüfen

```bash
npm --prefix apps/web run test -- --run
npm --prefix apps/web run typecheck
npm --prefix apps/web run build:offline
npm --prefix apps/web run test:e2e
python3 memory-atlas-specc/checks/check_bundle.py
```

Die Offline-Datei liegt danach in `apps/web/dist-offline/index.html` und ist für `file://` gebaut. Playwright prüft den Ablauf gegen die echten Fixtures in `memory-atlas-specc/fixtures`.

Grenzen und tatsächlich ausgeführte Läufe stehen in `docs/implementation/VALIDATION.md`.
