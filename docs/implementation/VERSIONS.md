# Versionen

Node.js v22.23.4 und npm 10.9.9 in dieser Umgebung. Alle Pakete sind in `apps/web/package.json` festgeschrieben, nicht als `latest`.

| Paket | Version | Grund |
|---|---|---|
| react, react-dom | 19.3.1 | Aktuelle 19.x-Linie zum Umsetzungszeitpunkt |
| vite | 8.3.5 | Passt zu `@vitejs/plugin-react` 6.1.2 |
| @vitejs/plugin-react | 6.1.2 | Peer von Vite 8 |
| typescript | 5.9.3 | Letzte 5.x-Linie. TypeScript 6/7 wurde nicht verwendet. |
| vitest | 5.0.5 | Peer-Bereich Vite 6–8 |
| @playwright/test | 1.64.1 | Browserprüfungen |
| @axe-core/playwright | 4.14.0 | AC20 |
| ajv, ajv-formats | 8.20.0, 3.0.1 | JSON Schema draft 2020-12, lokal gebündelt |
| @xyflow/react | 12.12.0 | Einzige Graphbibliothek, nur für die begrenzte Ansicht |
| @fontsource/plus-jakarta-sans | 5.3.0 | Lokale Sans, kein Laufzeitabruf. Latin und Latin-ext. |
| @fontsource/jetbrains-mono | 5.3.0 | Lokale Mono für IDs. Latin und Latin-ext. |
| vite-plugin-singlefile | 2.3.4 | Eine HTML-Datei für `file://` |
| @types/node | 22.20.5 | Passt zur Node-22-Laufzeit |

Der Offline-Build setzt `script-src 'unsafe-eval'`, weil Ajv das Schema zur Laufzeit kompiliert. `connect-src` bleibt `'none'`. Importierter Text wird nicht an `eval` übergeben.
