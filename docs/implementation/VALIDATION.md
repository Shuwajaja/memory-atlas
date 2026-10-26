# Validierung

Umgebung: Linux 6.12, Node v22.23.4, npm 10.9.9, Chromium über Playwright 1.64.1. Kein Windows-Rechner. Die Befehle liefen erneut am 2026-10-26 auf `f1b9f2b`, dem Stand mit konfigurierbarem Screenshot-Verzeichnis. `MA_SCREENSHOT_DIR` war nicht gesetzt. Dieser Eintrag ändert nur die Notiz, nicht den geprüften Code.

## Ausgeführt, bestanden

| Befehl | Ergebnis |
|---|---|
| `python3 memory-atlas-specc/checks/check_bundle.py` | SUCCESS, Exit 0. Prüft das Spezifikationspaket, nicht die App. 20 JSON-Dateien, 13 Fixture-Fälle, 30 AC-IDs, 30 Anforderungszuordnungen, 45 Manifest-Dateien. |
| `npm --prefix apps/web run typecheck` | Exit 0 |
| `npm --prefix apps/web run test -- --run` | 14 Dateien, 50 Tests, Exit 0 |
| `npm --prefix apps/web run build:offline` | `apps/web/dist-offline/index.html`, 1.468.278 Bytes, Inter als Data-URI |
| `npm --prefix apps/web run test:e2e` | 14 Tests, Exit 0. Davon 13 gegen `http://127.0.0.1:4173` und einer gegen `file://.../dist-offline/index.html` |

Der Offline-Test meldet keine Konsolenfehler und keine Requests außer `file:`, `blob:` und `data:`. Der Gesamtlauf importiert `01-linear.json`, legt zwei Karten an, prüft dass „Annehmen“ den Beleg nicht anhebt, bestätigt Quelle und Datenschutz, löst den Konflikt, gibt frei und vergleicht die heruntergeladenen JSON-Bytes mit dem Vorschau-Hash. Nach Reload ist der Arbeitsbereich leer; die erneut geöffnete Projektdatei zeigt die Reviews und keine aktive Freigabe. `localStorage` und `sessionStorage` bleiben leer.

Axe auf Überblick, Import, Quelle, Wissenskarten, Freigabe und Beziehungen bei 1440×900, 1024×768 und 390×844, mit Reduced Motion: keine kritischen oder ernsten Befunde. Tastatur: Skip-Link, Fokusfalle und Rückkehr im Dialog „Sitzung leeren“, Konfliktdialog per Escape.

Screenshots dieses Laufs, ohne `MA_SCREENSHOT_DIR`: `apps/web/test-results/screenshots/01-import.png` bis `06-export.png`. Das Verzeichnis ist gitignored. Ein gesetztes `MA_SCREENSHOT_DIR` schreibt woandershin.

## Nicht ausgeführt oder nicht bestanden im Sinne eines offenen Gates

- Windows-Start und Windows-Offline wurden nicht geprüft.
- Kein reales anonymisiertes Claude-Sample. Das Produktflag `claude_profile_approved` bleibt falsch. Gemini wird nicht importiert.
- Kein manueller Screenreader-Durchgang. Axe ersetzt ihn nicht.
- Die Leistungsziele aus AC (10.000 Nachrichten, Perzentile für UI, Suche und Abbruch) wurden nicht gemessen. Es gibt keine Erfolgszahl dafür.
- Grenzen von 100.000 Nachrichten und 256 MiB Snapshot sind im Code geprüft, aber nicht mit einem vollen Volumenlauf ausgeführt. 32 MiB plus ein Byte und die Elternkantengrenze sind als echte Tests vorhanden.
- P2/P3, AC25–AC30 und MA-023–MA-028 sind nicht umgesetzt.
