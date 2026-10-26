# Validierung

Umgebung: Linux, Node v22.23.4, npm 10.9.9. Commit wird in der Pull-Request-Beschreibung genannt, sobald er existiert. Kein Windows-Rechner, deshalb ist das Windows-Gate offen.

## Ausgeführt

| Befehl | Ergebnis |
|---|---|
| `python3 memory-atlas-specc/checks/check_bundle.py` | SUCCESS. Das Skript prüft nur das Spezifikationspaket, nicht die App. |
| `npm --prefix apps/web run typecheck` | Exit 0 |
| `npm --prefix apps/web run test -- --run` | 14 Dateien, 50 Tests, Exit 0 |

Die Unit- und Integrationstests lesen die Fixtures und die erwarteten Exportbytes. Sie vergleichen kanonische Vektoren, Importfälle FI01–FI13, Projektionen, Konflikte, das Datumsfenster, die Graphkante und die Demo-Exportbytes.

## Noch nicht ausgeführt

Browser, Offline-Datei, Axe, Tastatur und die drei Viewports sind in `apps/web/tests/e2e` beschrieben und in diesem Stand noch nicht gelaufen. Leistungszahlen für 10.000 Nachrichten sind nicht gemessen. Ein reales anonymisiertes Claude- oder Gemini-Sample liegt nicht vor. Ein manueller Screenreader-Durchgang wurde nicht gemacht.

Ergebnisse der Browserläufe werden hier nachgetragen, einschließlich Fehlschlägen.
