# Prüfung dieser Übergabe

**Stand: 26.10.2026.** Dieses Dokument unterscheidet die Prüfung des SPECC-Pakets von den noch auszuführenden Tests der Anwendung.

## Fachliche Gegenprüfung

Importformate, Wiederverwendung und Wissensregeln wurden getrennt recherchiert bzw. gegengeprüft. Eine unabhängige Vertragsreview fand acht konkrete Lücken; sie wurden vor der Übergabe korrigiert:

1. Belege binden mit `node_id` den tatsächlich geprüften Importsnapshot und Gesprächszweig.
2. Der Hashbereich von `state_sha256` ist vollständig definiert; Ablaufzeit kann durch Freigabe nicht verlängert werden.
3. Bestätigte Ersetzungen verkürzen effektive Intervalle vor der Konfliktberechnung.
4. Ausgaben folgen einer geschlossenen Herkunftsklassifikation; freie Prädikatnamen schaffen keinen Ausführungsbeweis.
5. Kanonische UTF-8-/Stringbytes sind festgelegt und mit drei SHA-256-Testvektoren versehen.
6. Reviews haben bereits in P1 eine monotone Sequenz; zufällige IDs bestimmen keine Reihenfolge.
7. P1-Ausschlüsse werden nicht als Bereinigung persönlicher Rohquellen im Projektbackup dargestellt.
8. Zitatspannen beziehen sich durchgehend auf genau einen unveränderten Textpart.

Zusätzlich wurden die Dateipfade des Folgeplans an den P1-Aufbau angepasst, serverseitige P2-Freigaben an lokale Preview-Records gebunden und die zulässige Behandlung von Same-Origin-GETs ohne Origin-Header präzisiert.

## Technische Paketprüfung

Ausführbarer Prüfbefehl mit Python-Standardbibliothek:

```text
python memory-atlas-specc/checks/check_bundle.py
```

Der Checker prüft JSON-Syntax, die in unseren Schemas verwendeten Validatorregeln, zwei gültige und vier absichtlich ungültige Vertragsbeispiele, IDs und Referenzen des Demo-Snapshots, sechs genaue Belegspannen, 19 Review-Sequenzpositionen, tatsächliche JSON-/Markdown-Dateihashes, Payload-/Claim-/Zustandsdigests, drei Canonicalization-Vektoren, 13 Importfall-Verweise, alle 30 Abnahme-IDs und die Zuordnung aller 30 Anforderungen. Außerdem werden lokale Markdown-Links und der Paketmanifest-Inhalt geprüft.

Der kleine Schema-Checker ist bewusst auf die tatsächlich verwendeten JSON-Schema-Keywords beschränkt und lehnt unbekannte Prüfkeywords ab. Er ist keine allgemeine JSON-Schema-Bibliothek; die Anwendung verwendet einen gepflegten lokal gebündelten Validator. Externe Quellen wurden recherchiert; der Paketcheck testet keine dauerhafte Erreichbarkeit aller Weblinks.

`PACKAGE_MANIFEST.json` listet relative Pfade, Größen und SHA-256 aller Paketdateien außer sich selbst. Die fertige ZIP wird zusätzlich mit der ZIP-CRC-Prüfung geöffnet und ihre enthaltenen Dateibytes mit diesem Manifest verglichen.

## Was diese Lieferung nicht belegt

Es wurde kein Produkt-Importer, Browserbuild, Windows-Paket, LLM-Extraktor oder MCP-Server implementiert oder als fertig getestet. Die 13 Fixture-Fälle beschreiben erwartetes Verhalten für Cursor. Synthetische Fixtures belegen keine vollständige Kompatibilität mit echten Anbieterexporten. Die lokale Repository-Struktur, echte sechsmonatige Chatdaten und vorhandene Deployments wurden nicht geprüft.

Die Beispiele sind synthetisch und tragen fest eingefrorene Testzeitpunkte. Ihre Statuswerte sind Soll-Ergebnisse, keine aktuelle Freigabe persönlicher Inhalte. Das frühere Memory-Atlas-Starterpaket war über die zugängliche Dateisuche nicht abrufbar; dieses Paket setzt deshalb auf die dokumentierten Entscheidungen auf und weist Cursor an, den tatsächlichen Bestand vor Änderungen zu prüfen.

Ergebnisprotokoll dieses Paketchecks liegt in [PACKAGE_CHECK_RESULT.txt](PACKAGE_CHECK_RESULT.txt). Alle App-Abnahmefälle in [ACCEPTANCE.md](ACCEPTANCE.md) bleiben Aufträge für die Implementierung.
