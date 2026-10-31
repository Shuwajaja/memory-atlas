# Issue #3 — Windows-Gate für Shu (AC01/AC24)

Status 2026-11-01: **BLOCKED — braucht einen Windows-Rechner mit normalem Benutzerkonto.** In dieser Session steht nur Linux zur Verfügung. Unit-Tests ersetzen weder Windows-Dateidialoge/Downloads noch den vollständigen Browserablauf unter `file://`.

## Bereits lokal überprüfbarer Teil

`import-chatgpt.test.ts` prüft Backslashes, Laufwerksbuchstaben, `C:\fakepath`, UNC-Namen, `file:///C:/` mit Leerzeichen-Escaping, `CON.json`, `LPT1.json` sowie CRLF als JSON-Whitespace und Nachrichtentext. `import-invalid.test.ts` prüft die Archiv-/HTML-Sperre auch mit Windows-Namensformen. Die Werte sind ausschließlich `InputFile.name`-Metadaten: Es werden keine Pfade geöffnet, URLs geladen oder reservierten Windows-Dateien angelegt. Browser liefern normalerweise nur `File.name`, keinen vollständigen Pfad. Namenswechsel erzeugen keine Nachrichtenrevision; rohe CRLF-Quelldaten bleiben erhalten.

Memory-Downloads heißen fest `memory.json`, `MEMORY.md`, `manifest.json`; Projektdateien heißen `<snapshot_id>.atlas.json`. Der Export erhält keinen Zielpfad; der Browser verwaltet das Downloadziel (`src/components/download.ts`, `src/services/atlas-service.ts`). Ein tatsächlicher Windows-Dateisystemtest bleibt nötig. Der bestehende `offline.spec.ts` prüft nur Öffnen, Demo und Navigation. Import/Worker/Review/Snapshot/Download unter `file://` bleiben auch durch einen grünen Gesamtlauf unbewiesen (`docs/TRACEABILITY.md`).

## Vorbereitung (PowerShell, Repo-Wurzel)

Nur synthetische Fixtures verwenden. Keine echten Chats, Benutzernamen, Schlüssel oder privaten Pfade in Protokolle/Bilder übernehmen. Node/npm und Abhängigkeiten müssen vorher lokal vorhanden sein; bei fehlendem Cache den Lauf als BLOCKED protokollieren. Diese Befehle benötigen keinen Netzwerkzugriff; keine Browser-/Paketdownloads starten.

```powershell
node --version
npm --version
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture
git rev-parse --short HEAD
git status --short
Push-Location apps/web
npm ci --ignore-scripts --offline --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'BLOCKED: lokale Abhängigkeiten fehlen' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Tests fehlgeschlagen' }
npx --offline tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw 'Typecheck fehlgeschlagen' }
npm run build:offline
if ($LASTEXITCODE -ne 0) { throw 'Offline-Build fehlgeschlagen' }
Pop-Location

$gateDir = Join-Path $env:TEMP 'Memory Atlas SYNTHETIC Windows Gate'
New-Item -ItemType Directory -Force -Path $gateDir | Out-Null
Copy-Item -LiteralPath 'apps/web/dist-offline/index.html' -Destination (Join-Path $gateDir 'index.html')
$inputJson = [IO.File]::ReadAllText((Resolve-Path 'memory-atlas-specc/fixtures/chatgpt/01-linear.json'))
$crlfJson = $inputJson -replace "`r?`n", "`r`n"
[IO.File]::WriteAllText((Join-Path $gateDir 'SYNTHETIC conversations.json'), $crlfJson, [Text.UTF8Encoding]::new($false))
$offlineUri = ([uri](Join-Path $gateDir 'index.html')).AbsoluteUri
Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $gateDir 'index.html'), (Join-Path $gateDir 'SYNTHETIC conversations.json')
Start-Process msedge.exe -ArgumentList '--inprivate', $offlineUri
```

Der temporäre Ordner enthält Leerzeichen. Die Adresszeile muss `file:///C:/…` (bzw. den tatsächlichen Laufwerksbuchstaben) zeigen. Keine lokalen Server starten und keine besonderen Browser-Sicherheitsflags setzen. Falls Edge anders installiert ist, die erzeugte HTML-Datei über Explorer im normalen Edge/Chrome öffnen und die Variante protokollieren.

## Manueller Ablauf ohne Netzwerk

DevTools öffnen, Netzwerkprotokoll leeren, Aufzeichnung/„Preserve log“ aktivieren, Cache deaktivieren; Konsole leeren. Netzwerkadapter/WLAN trennen und Seite neu laden. Die Browser-Funktion „Offline“ allein ist kein Ersatz für das getrennte Netzwerk. Alle Schritte im selben `file://`-Tab ausführen:

1. Leerer Arbeitsbereich: keine Demo laden. „Import“ → temporäre `SYNTHETIC conversations.json` auswählen. Der Worker muss einen Prüfbericht mit 1 Gespräch, 2 neuen Nachrichten und 0 neuen Revisionen liefern; danach „Import übernehmen“. Bei Worker-/CSP-/Dateizugriffsfehler: fehlgeschlagen, Fehlertyp dokumentieren.
2. „Quelle“ → Nutzernachricht „Für Projekt Orion nutzen wir Alpha.“: Rolle Nutzer, Datum und ausgewählter Zweig sichtbar. Text markieren → „Auswahl als Wissenskarte“ → Aussage unverändert lassen, Wert `Alpha` → „Kandidat anlegen“.
3. „Wissensbibliothek“ (Überschrift „Wissenskarten“): Alpha wählen → „Annehmen“. Beleg bleibt ungeprüft. „Rolle und Kontext geprüft“ und „Zweig geprüft“ setzen → „Quelle bestätigen“ → „Datenschutz speichern“ (shareable). Keine Anzeige „Ausführung geprüft“ erwarten.
4. „Alt/Neu“: mit nur einer Karte keine erfundenen Konflikte oder Ersetzungen. Wieder zur Bibliothek wechseln: Karte und Reviewstatus bleiben vorhanden.
5. „Freigabe“: Alpha auswählen → „Auswahl speichern“ → „Vorschau erzeugen“. Vorschau und JSON-SHA256 prüfen; die ausgewählte Alpha-Nutzerentscheidung, keine ungewählten Inhalte, Roharchive oder Dateipfade. Erst nach dieser konkreten Vorschau „Freigeben“ → „Export bereitstellen“. JSON, Markdown und Manifest herunterladen, Browserdialoge und tatsächliche Dateinamen prüfen. Downloads im temporären SYNTHETIC-Ordner speichern; Hash des JSON muss dem Vorschauwert entsprechen.
6. „Projekt herunterladen“ → `.atlas.json` im temporären Ordner speichern. Seite neu laden: Arbeitsbereich leer. „Projekt öffnen“ → gespeicherte Datei → „Ersetzen“: Quellen, Karten und Reviews bleiben erhalten; in „Freigabe“ steht „Keine Vorschau.“. Erneuter Export erfordert eine neue Freigabe.
7. Dieselbe Importdatei erneut importieren: 0 neue Nachrichten, 0 neue Revisionen. Zusätzlich `apps/web/tests/fixtures/claude/SYNTHETIC-account-export.json` auswählen: „nicht freigegeben“, kein Claude-Gespräch, vorheriger Bestand unverändert.
8. Konsole: keine Fehler. Netzwerk: keine automatischen App-Requests außer `file:`, `blob:`, `data:`; Fonts, Worker und Medien dürfen nichts extern laden. Bei unklarer Browser-Hintergrundaktivität einen separaten, leeren Vergleichstab prüfen und den Befund nicht still übergehen.

Downloads lokal gegen die Vorschau prüfen (Pfade an die tatsächlich gespeicherten Dateien anpassen):

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $gateDir 'memory.json')
Get-Content -Raw -LiteralPath (Join-Path $gateDir 'memory.json')
Get-Content -Raw -LiteralPath (Join-Path $gateDir 'MEMORY.md')
Get-Content -Raw -LiteralPath (Join-Path $gateDir 'manifest.json')
```

## Rückmeldung und Freigabekriterium

Shu protokolliert Datum, Commit/Dirty-Stand, Windows-/Browser-/Node-/npm-Version, normales Konto ohne Adminrechte, Build-/Fixture-Hashes, Testzahlen und Ergebnis jedes Schritts (bestanden/fehlgeschlagen/nicht durchgeführt). Nur synthetische Daten verwenden, private Pfade aus dem Bericht weglassen. Den vollständigen `file://`-Ablauf und Windows erst nach tatsächlicher Ausführung in `STATE.md`/`TRACEABILITY.md` als bestanden markieren. Bis dahin **BLOCKED**, keine Windows-Kompatibilitätszusage.
