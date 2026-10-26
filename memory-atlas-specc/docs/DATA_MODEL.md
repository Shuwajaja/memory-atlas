# Kanonisches Datenmodell

## 1. Formate und Geltung

`schemas/atlas.schema.json` ist der Feldvertrag für den privaten Snapshot; `schemas/memory-export.schema.json` der engere Exportvertrag. Schema-Version `1.0.0`, Policy-Version `1.0`. Die `.invalid`-Schema-URIs sind Kennungen; Validatoren laden die Dateien lokal und führen keine Netzabfragen aus. JSON Schema prüft Form und Typen. Die folgenden Referenz-/Policy-Invarianten werden zusätzlich im Domain-Layer geprüft.

IDs sind opake nichtleere Strings. Hersteller-IDs dürfen Bindestriche, beliebige andere gültige Zeichen oder nicht-UUID-Formen haben. Interne IDs werden nicht mit Hersteller-IDs verwechselt. Alle Zeitpunktfelder verwenden RFC3339 mit Offset, normalisiert auf UTC; unbekannte Zeit ist `null`. Datumstexte ohne eindeutigen Zeitpunkt bleiben als Rohquelle erhalten und werden nicht still sekundengenau gemacht.

## 2. Entitäten

| Objekt | Identität und Zweck |
|---|---|
| `Workspace` | Lokaler Bereich, Thema, Zeitzone und Policy-Version |
| `SourceFile` | Ausgewählte UTF-8-Quelldatei, Bytehash, Anbieterprofil, Namensraum und Originaltext |
| `ImportBatch` | Atomare Übernahme, Adapterversion und Diagnosen |
| `Conversation` | Logischer Chat im Anbieter-/Quellnamensraum |
| `Node` | Knoten eines konkreten Importsnapshots; Eltern/Kinder, Nullwurzel, Zweigzuordnung |
| `Message` | Unveränderliche Inhaltsrevision, stabile logische Identität, Originalrolle, Inhaltsteile und Fundstellen |
| `Evidence` | Genaues Zitat in einem Textteil einer Nachrichtenrevision |
| `Claim` | Unveränderliche atomare Aussage mit Art, Herkunft, Scope und vorgeschlagener Gültigkeit |
| `Relation` | Vorschlag einer gerichteten Beziehung zwischen Claim-Versionen |
| `ReviewEvent` | Menschliche Entscheidung mit Zeitpunkt, Ziel und Begründung |
| `MemorySetDraft` | Explizite Auswahl mit Empfänger, Zweck, Grenzen und Policy |
| `ExportHistory` | Manifest einer früheren Ausgabe; beim Laden keine aktive Autorisierung |

## 3. Identität und Hashes

**MA-C14N-1:** Für unsere normalisierten Vertragsobjekte: alle Objektschlüssel ASCII und auf jeder Ebene lexikografisch sortiert; Arrayreihenfolge erhalten; UTF-8; keine Einrückung; Stringbytes exakt: `"` als `\"`, Backslash als `\\`, U+0008/U+0009/U+000A/U+000C/U+000D als `\b`/`\t`/`\n`/`\f`/`\r`; übrige U+0000–U+001F als `\u00xx` mit kleinen Hexziffern. Slash `/`, Nicht-ASCII, U+2028/U+2029 und Emoji wörtlich in UTF-8, keine optionale Unicode- oder Slash-Escapierung; keine unpaired Surrogates; Zahlen ausschließlich sichere ganze Zahlen von 0 bis 2^53−1. Alle Datumswerte sind Strings. Rohquellen sind Strings und werden nicht nach dieser Regel umgeschrieben. Das ist ein eingeschränkter eigener Vertrag, keine Behauptung vollständiger RFC-8785-Unterstützung für beliebige JSON-Daten.

`sha256(bytes)` liefert 64 kleingeschriebene Hexzeichen. Provider-Quelldatei-Hash entsteht aus den tatsächlichen originalen UTF-8-Bytes, vor Parsing. Ein BOM wird beim Speichern von `raw_text` erhalten und beim JSON-Decoding kontrolliert entfernt; nicht-UTF-8-Dateien werden mit Diagnose abgelehnt. Hashes authentifizieren keinen Anbieter.

Deterministische interne Identitäten:

- `SourceFile.id`: `src_` + SHA-256(C14N von `{namespace, provider, byte_sha256}`).
- `Conversation.id`: `conv_` + SHA-256(C14N von `{namespace, provider, external_id}`).
- `Message.logical_id`: `msg_` + SHA-256(C14N von `{namespace, provider, conversation_external_id, message_external_id}`).
- `Message.revision_id`: `rev_` + SHA-256(C14N von `{logical_id, role, sent_at, parts}`).
- `Node.id`: `node_` + SHA-256(C14N von `{import_batch_id, conversation_id, external_node_id}`).

Fundstellen, Dateiname, Importzeit und Zweigauswahl beeinflussen den Inhaltsrevisionshash nicht. Ein identischer Reimport erzeugt keine Inhaltsrevision und darf den erstmaligen `recorded_at`-Wert nicht ändern. Neue Fundstellen dürfen als Provenienz ergänzt werden. Eine neue Branch-Auswahl erzeugt einen neuen Importsnapshot, keine Änderung historischer `Node`-Objekte.

Bei fehlenden Hersteller-IDs wird eine synthetische externe ID aus Inhalt und Strukturkontext abgeleitet und eine Diagnose gesetzt. Geänderte ID-lose Inhalte lassen sich nicht immer sicher als Revision zuordnen. Nicht allein wegen gleichen Textes verschiedene Originalnachrichten zusammenführen.

Claim-, Evidence-, Relation-, Review- und Set-IDs: Präfix plus zufällige UUIDv4. Demo-IDs sind absichtlich lesbar. `claim_sha256` wird zur Exportzeit über das **vollständige unveränderliche Claim-Objekt** berechnet; Claim selbst enthält kein selbstreferenzierendes Hashfeld.

## 4. Inhaltsteile und Belegspannen

`Message.parts` erhält die Quellreihenfolge. Ein Textteil hat `kind=text`, `text` als unveränderte Zeichenfolge und `label=null`. Ein nicht unterstütztes Medium wird als typisierter Platzhalter mit `text=null` und neutralem Label erhalten. Medien werden nicht automatisch heruntergeladen oder interpretiert.

**Eine Evidence-Spanne bezieht sich auf genau einen Textteil**: `message_revision_id`, `node_id`, `part_index`, `start_cp`, `end_cp`. `node_id` benennt den tatsächlich geprüften Importsnapshot und muss über eine Message-Occurrence zur Revision gehören; seine Quelle und sein Branch sind damit gebunden. Indizes sind 0-basiert, halboffen, in Unicode-Codepoints/Skalarwerten. Keine UTF-16-Codeunits, Bytes oder Grapheme. `quote == Array.from(part.text).slice(start_cp,end_cp).join('')`. Über mehrere Textteile verteilte Belege benötigen mehrere Evidence-Objekte. Suchindizes dürfen Textteile verbinden, ihre künstlichen Trenner sind aber keine Originalbelege.

`quote_sha256` hasht UTF-8 von `quote`. `lineage_root_id` identifiziert bekannte gemeinsame Herkunft; ohne Nachweis darf kein unabhängiger zweiter Beleg behauptet werden. `Evidence.relation` bedeutet `supports`, `refutes` oder `context`, nicht Freigabe.

## 5. Reviews und Projektion

Ein Claim enthält **keine** gespeicherten Felder `accepted`, `verified` oder `current`. Diese entstehen aus dem Projektor. Startwerte: Kuratierung `candidate`, Beleg `unverified`, Datenschutz `unknown`, Frist `unknown`.

| Aktion | Ziel | Zusatzinvariante |
|---|---|---|
| `accept` | Claim | `review_due_at > recorded_at`; Begründung erforderlich |
| `reject`, `exclude`, `reopen` | Claim | Keine automatische Belegänderung |
| `confirm_source` | Claim | Gültige `evidence_ids`, mindestens ein `supports`; `context_checked=true`, `branch_checked=true` |
| `classify_privacy` | Claim | `sensitivity` gesetzt; andere Aktionsfelder null/leere Liste |
| `renew_review` | Claim | Neue explizite Frist; keine Inhaltsänderung |
| `confirm_relation`, `revoke_relation` | Relation | Relation existiert, keine Zyklen, wirksame Gültigkeit geprüft |
| `revoke_export` | Memory-Set | Blockiert aktive Freigaben dieses Sets; keine Behauptung, heruntergeladene Kopien zu löschen |

Nicht zur Aktion passende Felder sind null bzw. leere Listen. Unbekannte Aktionen werden abgelehnt. Schon P1 speichert `ReviewEvent.seq` als strikt aufsteigende, eindeutige positive lokale Ereignissequenz pro Workspace. Projektion filtert nach `recorded_at <= known_at` und spielt dann in `seq`-Reihenfolge ab. Zufällige UUIDs bestimmen keine Reihenfolge. Zeitstempel sind beim Anlegen nicht fallend; bei rückwärts laufender Geräteuhr den letzten Wert beibehalten und Diagnose anzeigen. P2 übernimmt die Sequenz unverändert und setzt sie transaktional fort.

Bei `validity_kind=interval` ist `valid_from` gesetzt und `valid_to` entweder null oder strikt größer. Bei `timeless` sind beide null und `validity_basis=reviewer_assigned`. Bei `unknown` sind beide null und `validity_basis=unknown`. Eine Änderung dieser Basis erzeugt eine neue Claim-Version. `asserted_at` kann trotzdem null bleiben.

Zuerst bekannte Reviews und bestätigte Ersetzungen anwenden, effektive Intervalle kürzen und verworfene/ausgeschlossene Claims aus der Konfliktmenge nehmen. Erst danach Kollisionen für T ermitteln. Ein offener Konflikt ist eine abgeleitete Gruppe aus derselben Slot-Identität, unvereinbaren Werten und überlappenden Gültigkeiten oder eine bestätigte `contradicts`-Relation. Neue Prüfhinweise können eine Ausgabe blockieren, aber keine Karte annehmen. Manuelle Konfliktauflösung erfolgt durch neue Claim-Scope-Fassung, Reject/Exclude oder bestätigte Ersetzung. Bereits vorhandene `contradicts`-Relation vor Auflösung ausdrücklich widerrufen, damit kein versteckter Konflikt übrig bleibt.

## 6. Referenzinvarianten

Alle internen IDs je Tabelle eindeutig. Alle `source_file_ids`, Conversation-/Message-/Evidence-/Claim-/Relation- und Set-Verweise lösen innerhalb desselben Workspace auf. Node-Eltern dürfen in defekten Herstellerdaten fehlen, aber nur mit Diagnose und `branch_membership=unknown`; dangling Claim-/Evidence-Referenzen sind im Atlas-Snapshot nicht zulässig. Quell-JSON-Pointer folgt RFC6901, mit korrektem Escaping von `/` und `~`.

Jede für Memory angenommene Karte hat mindestens einen technisch gültigen stützenden Beleg. Eine Nachricht hat mindestens eine Fundstelle. Jede Fundstelle verweist auf den passenden Importsnapshot-Knoten. `confirm_source` darf keine fremden Evidence-IDs verwenden. Relationen verweisen auf verschiedene Claims; `supersedes`/`revises` sind azyklisch. Workspace- und Projekt-Scope-Gleichheit ist für Ersetzung erforderlich.

Der Graph nutzt Claims/Projekte/Themen und tatsächliche Relationen. Graphlayout, Pan/Zoom und Auswahl sind UI-Zustand und gehören nicht in die Wissens-/Evidenzbewertung.

## 7. Exportformat

`MemoryEnvelope={payload,payload_sha256}`. Payload enthält Erzeugung/Ablauf, Empfänger-Scope, `context_only=true` und begrenzte Einträge. Ein Eintrag enthält Claim-Digest, beschrifteten Aussageinhalt, Herkunft/Modalität, Scope, Gültigkeit, Reviewfrist und minimale Zitatreferenzen ohne Zitattext.

JSON- und Markdown-Ausgabe werden **vor** Freigabe erzeugt. SHA-256 beider Dateibytes wird im in-memory `MemoryPreview` festgehalten; die menschliche `MemoryApproval` bindet sie. `ExportHistory` speichert nur Manifestwerte und ist bei erneutem Öffnen untrusted. Der Projektsnapshot speichert keinen laufenden Session-Token und keinen Ausführungsverifikationsschlüssel.

Markdown wird aus denselben Payload-Einträgen in gleicher Reihenfolge generiert; untrusted Inhalt als Kontext klar kennzeichnen, HTML escapen und keine aktiven Links aus Claimtext automatisch erzeugen. Datei-Prüfsummen gehören ins separate Manifest. Keine eigene Datei kann ihren vollständigen Bytehash in sich selbst enthalten.

### Zustandsbindung vor Freigabe

`state_sha256` ist SHA-256 über MA-C14N-1 von `{workspace, source_files, import_batches, conversations, nodes, messages, claims, evidence, relations, reviews, memory_sets, selected_memory_set_id}` aus dem aktuellen Snapshot. `snapshot_id`, Snapshot-`created_at` und `export_history` sind ausdrücklich ausgenommen; rein nachgelagerte Exporthistorie darf ihre eigene Freigabe nicht invalidieren. Der übergebene Entwurf muss dem gespeicherten Set mit dieser ID exakt entsprechen. Arrayreihenfolgen bleiben Bestandteil des Hashes. Jede fachliche Änderung inklusive neuer Konfliktkandidaten, Reviews, Scope/Policy oder Set-Auswahl invalidiert konservativ die Freigabe.

Beim Download den Digest neu berechnen und zusätzlich die jetzige Policy-/Fristprüfung durchführen; Zeitablauf wird nicht allein durch einen Datenhash erkannt. Die Bytehashes müssen exakt mit dem Preview übereinstimmen. Payload-Ablauf wird vor der Freigabe festgelegt und darf durch Approval nicht verlängert werden. Verbindliche Canonicalization-Testvektoren liegen in `examples/canonical-vectors.json`.

## 8. Schema-Erweiterungen

Neue Anbieter benötigen keinen neuen Wahrheitsstatus. Neue Felder benötigen Schema-Version, Migration, Export-Minimierung und Tests. P3-Verifikationsbelege erhalten einen eigenen Schemaentwurf mit Trust-Bindung; das vorhandene reserved Enum allein ist keine Erlaubnis, ihn durch Modelle setzen zu lassen.
