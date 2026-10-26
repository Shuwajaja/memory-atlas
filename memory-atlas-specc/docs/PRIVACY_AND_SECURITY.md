# Datenschutz und Sicherheitsgrenzen

## 1. Datenflüsse

P1 verarbeitet nur ausdrücklich ausgewählte lokale Dateien. Browser und fertige App senden keine Daten an Server. Modelle, Embeddings, Analytics, Crash-Reports, CDN-Fonts und Linkvorschauen sind ausgeschaltet beziehungsweise nicht eingebaut. „Offline“ umfasst alle App-Funktionen; ein absichtlich geöffneter externer Link ist eine vom Nutzer ausgelöste Browseraktion und wird vorher als extern erkennbar.

Die Offline-Anwendung schützt nicht vor Browser-Erweiterungen, einem kompromittierten Rechner oder dem bewussten Teilen ihrer Projektdatei. Es wird keine Verschlüsselung im Ruhezustand behauptet. `.atlas.json` kann vollständige persönliche Originaltexte enthalten und bekommt in der Oberfläche eine deutliche Kennzeichnung „Privates Projekt-Backup“.

## 2. Untrusted Inputs

Alle Quelldateien und importierten Snapshots gelten als nicht vertrauenswürdig. Das betrifft Titel, Rollenlabels, JSON-Schlüssel, Dateinamen, Markdown, Tooltexte und selbst behauptete Prüfergebnisse. Rollen wie `system` im Chat sind historische Daten und dürfen keine aktuellen Systemanweisungen werden.

Kein `eval`, kein `new Function`, keine aus Chattexten erzeugten Module, keine `innerHTML`-Einfügung unbereinigter Inhalte. Standard ist Plaintext über sichere Text-Sinks. Optionales Markdown erlaubt kein Raw HTML, keine eingebetteten Iframes und keine automatischen Bilder. Nur `https:` und `http:` werden als bewusst klickbare externe Links erlaubt; `javascript:`, `data:`, `file:` und benutzerdefinierte Schemes bleiben Text.

Beim Normalisieren keine fremden Objekte in globale Konfigurationen mergen; `__proto__`, `constructor` und `prototype` als normale Quelldaten behandeln. Schemaobjekte werden über explizite Felder aufgebaut. JSON-Duplikatschlüssel und Parser-Tiefenlimit vor `JSON.parse` erkennen; kein undokumentierter „letzter Schlüssel gewinnt“-Import. Maximale strukturelle JSON-Tiefe 128. Der hierfür eingesetzte Scanner muss Strings/Escapes korrekt verstehen und separat getestet werden.

## 3. Verfügbarkeit und Integrität

P1-Limits aus IMPORTS.md gelten vor Allokation weiterer Kopien. Projektsnapshots maximal 256 MiB, 100.000 Nachrichtenrevisionen, 100.000 Review-Ereignisse. Höchstens 500 ausgewählte Quelldateien pro Batch. Worker übernimmt Parsing/Normalisierung; die UI bleibt bedienbar und kann abbrechen. Fehler vor dem Commit ändern den Store nicht.

Hashes: SHA-256 über definierte Bytes; kanonische JSON-Serialisierung gemäß DATA_MODEL.md. Quellenhash und abgeleitete Revisionen getrennt führen. Ein Hash bestätigt keine Herkunft von OpenAI/Anthropic und keinen realen Erfolg. Hashvergleich schützt gegen versehentliche Veränderung und bindet Vorschau/Freigabe an Inhalt; kein Ersatz für Signaturen.

Snapshot-Import validiert Schema, IDs, Referenzen, Spannen, erlaubte Aktionen und Beziehungskreise. Unbekannte privilegierte Felder wie `execution_verified=true` werden nicht übernommen. Für P1 existiert kein durch Import aktivierbarer Verifikationspfad. Importierte Approval-Ereignisse autorisieren keine neue Ausgabe.

## 4. Git, Logs und UI-Belege

Eigene Chats, Exporte, Backups, DBs, Modelle und Schlüssel außerhalb des Repos halten. `.gitignore` ergänzen, nicht ersetzen. CI verwendet ausschließlich dieses synthetische Fixture-Material. Diagnoselogs nennen Fehlercode, Adapter, Zählwerte und opake IDs; keine Textausschnitte, Schlüssel oder absoluten privaten Pfade. Screenshots für Tests entstehen nur im Demo-Workspace.

Ein öffentlicher Demo-Build enthält nur synthetische Daten und wird nicht automatisch veröffentlicht. Repo-Lizenz: vorhandene Lizenz respektieren; für ein neues eigenständiges Projekt ist MIT eine Empfehlung. Keine bestehende Lizenz ohne Entscheidung ändern. Drittanbieter-Lizenztexte bei tatsächlicher Übernahme erhalten. Honcho-Code wird nicht in ein anders lizenziertes Projekt kopiert; die spätere Adaptergrenze wird gesondert geprüft.

## 5. Export und Agenten

Das Memory-Paket enthält Kontext mit Typ, Scope und Herkunft. Importierte Texte dürfen nicht als beliebige Regeln in `AGENTS.md`, `CLAUDE.md` oder Cursor Rules geschrieben werden. Standardoutput ist `MEMORY.md` plus strukturiertes JSON. Ein festes Regeltemplate kann auf diese geprüfte Kontextdatei verweisen, formuliert aber keine frei aus Chats zusammengesetzten Systemanweisungen.

Datenschutzprüfung ist manuell und versioniert. Regex-/Klassifikatorwarnungen unterstützen, garantieren aber keine vollständige Geheimniserkennung. `sensitivity=unknown` blockiert. Kartenannahme ist keine Einwilligung in Cloudverarbeitung oder Drittanbieter-Sync. Vorschau, Empfänger, Datenmenge, Policy und Ablauffrist werden vor jeder Ausgabe geprüft.

## 6. P2-Loopback-Dienst

Nur `127.0.0.1`, Single-User. Der Dienst erzeugt pro Prozess ein starkes zufälliges Session-Secret. Der lokale Launcher öffnet einen einmaligen Bootstrap-Link mit Token im Fragment; die UI tauscht dieses über eine Same-Origin-Bootstrap-Anfrage gegen eine nur im Speicher gehaltene Session-Berechtigung und entfernt das Fragment sofort. Token weder in Querystrings noch Logs, Browser-Storage oder Repo schreiben. Bootstrap-Token nach Benutzung invalidieren.

Jede API-Anfrage einschließlich Reads benötigt Session-Header; statische Assets allein nicht. `Host` strikt auf die eigene Loopback-Origin prüfen; vorhandene `Origin` muss ebenfalls exakt passen. Fehlender Origin bei Same-Origin-GET ist nur mit gültigem Session-Header und exaktem Host zulässig. Mutierende Requests benötigen die eigene Origin. CORS nicht wildcard öffnen. Für mutierende Requests CSRF-Schutz zusätzlich erzwingen. Unverlangte Requests von anderen Webseiten, `Origin: null`, fremde Hostnamen und DNS-Rebinding dürfen nicht auf Daten zugreifen. P1 unter `file://` spricht den P2-Dienst nicht direkt an; P2 serviert dieselbe gebaute UI über seine eigene Origin.

Dateipfade werden aus Workspace-IDs und erlaubten Datenverzeichnissen ermittelt, nie ungeprüft aus Request-Strings. Upload-Streaming mit Größenlimit, keine ZIP-Entpackung in P1. Für einen späteren ZIP-Adapter: keine absoluten Pfade/`..`/Symlinks, begrenzte Entryzahl, unkomprimierte Gesamtsumme und Kompressionsverhältnis, private Staging-Ordner.

## 7. Löschung, Backups und Wiederimport

P1: Ausschließen, Sitzung vollständig leeren und privates Projektbackup speichern sind klar getrennt. Ausschluss verändert nur die Memory-Zulässigkeit; Originaltexte bleiben im Projektbackup enthalten. Eine gezielt bereinigte Projektdatei setzt die Purge-Funktion aus P2 voraus. Alte Downloads können weiter Inhalte enthalten. Bei Öffnen eines älteren Projekts dessen Erstellungsdatum und untrusted Freigaben sichtbar machen.

P2: Löschvorschau zeigt betroffene Originaldateien/Nachrichtenrevisionen, Claims, Belege, Relationen, Suchindizes, Vorschauen und lokale Exportkopien. Nach Bestätigung alle Ableitungen in einer Transaktion entfernen; inhaltsfreie Tombstones an stabilen Quellidentitäten verhindern identischen Wiederimport. Fingerprints wenn nötig keyed/HMAC mit lokalem Schlüssel; keine Rohtexte in Tombstones. Identität bei anders exportierten Dateien ist begrenzt erkennbar und darf nicht als perfekte Erkennung beworben werden.

Lokale Backups erhalten eine Retention-Einstellung und werden beim Löschen als betroffene Kopien benannt. Externe Dateien und bereits übergebene Agentenpakete bleiben außerhalb dieser Kontrolle. Restore eines alten Backups benötigt Abgleich mit aktuellen Tombstones; es darf keine stillschweigende Wiederbelebung gelöschter Quellen geben. Datenschutzlöschung kann historische Reproduzierbarkeit einschränken; diese Einschränkung ist sichtbar.

## 8. Kein Security-Theater

P1 ist lokal und nachvollziehbar, aber nicht manipulationssicher. Keine Zertifizierung, allgemeine Datenschutzkonformität oder universelle Halluzinationserkennung behaupten. Die konkreten überprüfbaren Grenzen aus diesem Dokument gehören in die Tests und die Release-Notizen.
