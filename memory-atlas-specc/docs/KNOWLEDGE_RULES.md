# Wissensregeln: Quellen, Zeit, Widersprüche und Freigaben

## 1. Vier Achsen statt eines Wahrheitsstempels

| Achse | Vertrag | Aussage |
|---|---|---|
| Herkunft | `source_kind` + unveränderte Nachrichtenrolle + `extraction_method` | Wer hat was behauptet, entschieden oder vorgeschlagen? |
| Kuratierung | `candidate`, `accepted`, `rejected`, `excluded` | Wie wurde die Karte durch den Menschen behandelt? |
| Zeitstatus | `current`, `future`, `superseded`, `disputed`, `expired`, `unknown` | Für welchen Zeitpunkt gilt die Aussage nach welchem Kenntnisstand? |
| Belegstatus | `unverified`, `source_correlated`, `execution_verified` | Was wurde tatsächlich geprüft? |

Zusätzlich: `freshness=fresh|due|unknown`. Eine fällige Nachprüfung ist kein Beweis, dass die Aussage falsch geworden ist. `candidate` wird ausschließlich als Kuratierungszustand benutzt, nicht als Herkunft. „Aus Quelle berichtet“ ist ein UI-Text, kein fünfter Wahrheitsstatus.

`source_kind`: `user_decision`, `user_report`, `assistant_recommendation`, `assistant_execution_claim`, `tool_observation`, `external_reference`, `inference`. `extraction_method`: `manual`, `heuristic`, `llm`. Letzteres ist P3. Eine manuell erstellte Karte startet ebenfalls als `candidate`.

Legacy-Mapping für den früheren Entwurf: `reported` → Herkunft aus Rolle/Aussagetyp bestimmen und `candidate`; `accepted`/`excluded` → Kuratierung; `source_correlated`/`execution_verified` → Belegachse; `superseded`/`disputed` → Zeitachse. Fehlende Herkunft nicht erraten; Migration erfordert Review.

## 2. Quellenprüfung

Ein Beleg referenziert eine unveränderliche Nachrichtenrevision und `node_id` des geprüften Importsnapshots, `part_index` und eine halboffene Unicode-Codepoint-Spanne in genau diesem unveränderten Textteil. Die gespeicherte Zeichenfolge MUSS dem referenzierten Ausschnitt exakt entsprechen. Emoji, kombinierte Zeichen und Zeilenumbrüche dürfen die Zuordnung nicht verändern.

Eine Quellenbestätigung bleibt historisch an diese Occurrence gebunden. Ein neuerer Import, der dieselbe Nachricht revidiert oder den belegten Nutzerentscheidungs-Knoten aus dem ausgewählten Zweig entfernt, erzeugt `SOURCE_CONTEXT_CHANGED` und sperrt aktuelles Memory bis zur erneuten beleggebundenen Review. Ein bloß angehängter Fortsetzungs-Node bei unverändert enthaltenem Beleg löst dies nicht aus. Der Originalbeleg wird nicht überschrieben.

Der exakte Stringmatch ist nur die technische Vorprüfung. `source_correlated` benötigt ein menschliches `confirm_source`-Ereignis, das Rolle, aktiven/alternativen Zweig, Negation, Modalität, Zitatkontext und Scope berücksichtigt. „Wir könnten X tun“ trägt nicht die Aussage „X wurde beschlossen“. Eine zitierte frühere Entscheidung ist keine neue Entscheidung des zitierenden Sprechers.

Annahme (`accept`) und Quellenprüfung (`confirm_source`) sind verschiedene Ereignisse. Die UI darf sie in einem Dialog nacheinander anbieten; der Mensch sieht beide Bedeutungen. Keine Annahme als Nebeneffekt von Import, Kartenanlage oder Graphklick.

`execution_verified` ist in P1 **nicht erzeugbar**. Importierter Tooltext oder ein fremder Statuswert bleibt Quellenmaterial. Auch ein Inhaltshash belegt nur die Übereinstimmung von Bytes. Später muss ein unabhängiger Verifier exakt Aktion, Ziel, Revision, Umgebung, Zeitpunkt und Ergebnis prüfen. Ein grüner Test auf Revision H ist kein Test auf Revision J.

## 3. Zeitliche Gültigkeit

- `asserted_at`: Zeit der zugrunde liegenden Aussage, soweit bekannt.
- `recorded_at`: erstmalige Erfassung der Claim-Version im Atlas; nicht durch Reimport erneuern.
- `valid_from`/`valid_to`: fachliches Intervall, Anfang inklusiv, Ende exklusiv.
- `validity_basis`: `explicit`, `reviewer_assigned`, `message_time_confirmed`, `unknown`.
- `review_due_at`: Termin zur erneuten Prüfung; durch `renew_review` als Ereignis veränderbar.

Ein Claim hat `validity_kind=interval|timeless|unknown`. `timeless` ist eine ausdrückliche Reviewerentscheidung, kein Default für undatierte Quellen. Für `interval` ist `valid_from` erforderlich. `valid_to=null` bedeutet nur kein bekanntes Ende. Unbekannte Zeiten dürfen nicht in „1970“ oder Importdatum umgewandelt werden.

Projektor: Nur Claims und Ereignisse mit `recorded_at <= known_at` berücksichtigen. Danach wirksame Ersetzungen, Konflikte, Gültigkeit und Fristen für `valid_at` berechnen. Rückwirkend erkannte Änderungen verändern die heutige Rekonstruktion, nicht den damaligen Kenntnisstand.

Berechnungsreihenfolge: zuerst alle bis `known_at` bekannten Reviews und bestätigten Ersetzungen anwenden; daraus effektive Intervalle berechnen (eine bestätigte Ersetzung schließt das alte Intervall bei `effective_at`, ohne den Claim umzuschreiben). Erst danach Konflikte prüfen. Nur `candidate`/`accepted`-Claims nehmen teil; `rejected`/`excluded` nicht. Ein bloßer Kandidat kann einen Prüfhinweis und eine Exportblockade auslösen, aber niemals einen angenommenen Claim ersetzen.

Statuspriorität: `disputed` bei einem ungelösten, für T überlappenden Konflikt; sonst `superseded` bei wirksamer bestätigter Ersetzung; sonst `unknown`, `future`, `expired` oder `current` anhand der Gültigkeit. Die Anzeige bewahrt zusätzliche Gründe, statt sie hinter einem einzelnen Badge zu verlieren. Kuratierung bleibt eine eigene Achse.

## 4. Ersetzungen und Widersprüche

Konfliktkandidaten gruppieren nach **Workspace + Projekt + Umgebung + Subjekt + Prädikat**. Nur bei `cardinality=single`, überlappender Zeit und unterschiedlichen unvereinbaren Werten kann der deterministische Checker einen Konflikt öffnen. Sprachliche Synonyme und implizite Widersprüche sind P1-Reviewarbeit; der Checker behauptet keine vollständige Semantikerkennung.

Eine spätere Nachricht allein gewinnt nicht. Regeln:

| Situation | Behandlung |
|---|---|
| Neuere Assistentenempfehlung, ältere Nutzerentscheidung | Empfehlung erhalten; keine Ablösung |
| Zwei widersprüchliche Nutzerentscheidungen ohne klare Ablösung | Konflikt öffnen; beide für aktuelles Memory sperren |
| Ausdrückliche Entscheidung „Ab Datum T verwenden wir B statt A“ | Neue Karte und bestätigte `supersedes`-Beziehung mit T und Begründung |
| Andere Projekte oder lokal/VPS | Getrennte Scopes; keine automatische Kollision |
| Gleiches Zitat in mehreren Zusammenfassungen | Gemeinsame Herkunft markieren; keine unabhängige Bestätigung zählen |
| „Ja, so“ bei mehreren offenen Optionen | Referenz ungeklärt; Kandidat bleibt gesperrt |
| „Deployment fertig“ nur im Assistententext | Ausführungsbehauptung; kein Verifikationsaufstieg |
| Geplante zukünftige Ablösung | Alter Stand bleibt bis T gültig; neuer davor `future` |

Beziehungen sind unveränderliche Vorschläge. `confirm_relation` macht eine Beziehung wirksam, `revoke_relation` nimmt ihre Wirkung ab dem protokollierten Kenntniszeitpunkt zurück. Beide verweisen auf dieselbe Relation. Die Relation `supersedes` zeigt vom neuen zum alten Claim, `revises` ebenfalls von neu zu alt. Bei `contradicts` sind beide Enden gleichrangig.

Ersetzung benötigt gleiche Scope-/Slot-Identität, festes `effective_at` und eine Begründung. Zyklen sind verboten. Ungeklärte Duplikate werden nicht durch Textähnlichkeit gelöscht. Eine bewusst bestätigte `duplicate_of`-Beziehung fasst die Anzeige zusammen, bewahrt aber beide Quellen.

## 5. Unveränderlichkeit und Review

Claim-Inhalt, Quelle, Scope, Modalität oder Gültigkeitsannahme ändern → neue Claim-ID und `revises`-Beziehung. Frühere Freigaben gelten nicht für die neue Fassung. Review-Ereignisse bleiben append-only; eine Korrektur ist ein neues Ereignis. Ereignisse speichern IDs und knappe Begründungen, keine kompletten Chatkopien.

Ein Themenlabel oder ein grafischer Abstand ändert keine Evidenz. Der Graph wird aus Beziehungen generiert. KI-Ähnlichkeit wird später höchstens als „möglicher Zusammenhang“ dargestellt.

Qualitätsindikatoren: Originalstelle vorhanden, Span gültig, Rolle geprüft, Zweig geklärt, Scope geklärt, Gültigkeit geklärt, Datenschutz geprüft, Konflikt offen, Nachprüfung fällig. Keine zusammenfassende Zahl „93 % wahr“. Eine spätere Extraktionskonfidenz muss klar als Modellsicherheit der Extraktion gekennzeichnet werden.

## 6. Memory-Policy P1

Eine Karte ist nur zulässig, wenn **alle** Bedingungen gelten:

1. `curation=accepted`, `evidence_status=source_correlated` (P3 darf passend gebundenes `execution_verified` zulassen).
2. `temporal=current`, `freshness=fresh`; keine offene widersprüchliche Relation oder vorgeschlagene Ersetzung für diesen Slot, die noch geprüft werden muss.
3. Datenschutzklassifikation ausdrücklich `shareable`; Kategorie und Scope passen zum Set. `private`, `secret` und `unknown` sperren immer.
4. Rolle/Modalität bleiben in der Ausgabe sichtbar. `assistant_execution_claim` und ausführungspflichtige Statusbehauptungen sind in P1 gesperrt.
5. Die Quellenprüfung bestätigt den Branch. Alternative/unklare Zweige sind bis zur explizit protokollierten Prüfung gesperrt.
6. Die Claim-ID gehört zur exakten manuell gewählten Auswahl. Es gibt keine Freigabe „alle jetzigen und künftigen Karten“.

Standardmäßig enthält ein Set Nutzerentscheidungen, Nutzerberichte und quellengeprüfte externe Referenzen. Option „Geprüfte Recherchenotizen/Vorschläge aufnehmen“ erlaubt ausdrücklich ausgewählte `assistant_recommendation`/`inference` mit unveränderlichem Herkunftslabel. Diese erscheinen als Vorschlag/Interpretation, niemals als beschlossene Architektur oder unabhängig bestätigte Tatsache. Hypothetische, negierte, zitierte oder unsichere Aussagen bleiben für den Standardexport gesperrt; zunächst als präzise berichtete Aussage neu formulieren und belegen.

P1 erlaubt keine unqualifizierten Ausführungs-/Livezustandsaussagen. Die geschlossene Ausgabeklassifikation folgt ausschließlich der geprüften Herkunft: `user_decision` mit `kind=decision|preference` → `representation=user_decision`; `user_report|external_reference` → `dated_report` mit zwingendem Aussagedatum und Standardpräfix „Berichtet am …; nicht unabhängig geprüft“; `assistant_recommendation` → `proposal`; `inference` → `research_note`. Letztere zwei erfordern die ausdrückliche Notizenoption. `assistant_execution_claim` und `tool_observation` sind in P1 immer gesperrt, unabhängig von `kind` oder frei gewähltem Prädikat. `runtime.*`/`execution.*` sind unabhängig vom `kind` ausführungspflichtige Prädikate und gesperrt. Freie Zustandsprädikate können höchstens als klar datierter Bericht ausgegeben werden, niemals als unabhängig bestätigter Zustand. Ein semantisch falsch etikettierter Satz wird durch JSON-Schema allein nicht erkannt; genau deshalb gehören Rollen-/Modalitätsprüfung und das verpflichtende Herkunftspräfix zur Regel. Eine Umbenennung in `kind=fact` oder `predicate=deployment_status` erhöht die Beweiskraft nicht.

Review-Fristen nach expliziter erster Review: Projektstatus 7 Tage, Research-/Toolinformationen 30 Tage, Aufgaben 7 Tage, Entscheidungen/Präferenzen 180 Tage. Benutzerdefinierte Fristen werden in Policy und Snapshot festgehalten; keine Behauptung, dass die Standardwerte wissenschaftlich kalibriert seien. Ein fehlendes Reviewdatum sperrt Memory.

## 7. Vorschau und Freigabe

Aktuelles Memory bewertet `valid_at=known_at=jetzt`. Ein historischer Explorerfilter kann alte Entscheidungen nicht wieder exportfähig machen. Historischer Report ist ein anderer Exporttyp und in P1 nicht als Agenten-Memory verfügbar.

`prepareMemorySet()` erzeugt unveränderliche Vorschau-Dateien für JSON und Markdown und einen kanonischen Payload-Digest. Der Manifest-Digest wird aus dem Payload ohne eigenes Digestfeld gebildet; Datei-Prüfsummen stehen getrennt außerhalb der gehashten Datei. Die Freigabe referenziert Payload-Digest, Dateibyte-Hashes, Auswahl, Policy-Version, Empfänger-Scope und Erzeugungszeit. Keine zirkuläre Selbst-Prüfsumme.

Vor Download: Zustand, Fristen, Auswahl, Policy und exakte Byte-Hashes erneut prüfen. Bei Veränderung blockieren, neue Vorschau erzeugen und neu freigeben. Die 15-Minuten-Frist begrenzt das Erteilen der Freigabe ab `prepared_at`. `payload.expires_at` wird bereits vor Vorschau als Minimum aus `prepared_at+24h`, frühester Claim-Reviewfrist und bekanntem effektivem Intervallende festgesetzt. `approval.expires_at` darf diesen Zeitpunkt nie überschreiten. Eine gültig erteilte Freigabe kann nach Ablauf der 15-Minuten-Vorschau noch dieselben unveränderten Bytes bis zu ihrem Payload-Ablauf herunterladen, sofern sämtliche aktuellen Prüfungen weiterhin bestehen. Ein bereits heruntergeladenes Paket kann nicht zurückgerufen werden; Manifest zeigt Ablauf und Erstellung.

Maximal 50 Karten und 16.000 UTF-8-Bytes für den gerenderten Memory-Text, dazu kleines Provenienzmanifest. Kein automatisches Abschneiden. Keine Rohchattexte oder vollständigen Belege im Memory-Export; lediglich opake Quell-/Revisions-IDs und Belegdigest. Das private Projekt-Backup hat andere Inhalte und Grenzen.

## 8. Datenschutz und Herkunftsgrenzen

P1 kann Karten ausschließen und die aktuelle Sitzung vollständig leeren. Es muss klar sagen, dass alte Originaldateien und heruntergeladene Backups davon unberührt bleiben. P2 ergänzt die vollständige lokale Quellenlöschung einschließlich aller Ableitungen, Suchindizes, Vorschauen und Tombstones. Datenschutzlöschung ist die ausdrückliche Ausnahme von Unveränderlichkeit.

Ein selbst bearbeiteter JSON-Snapshot ist keine vertrauenswürdige Signatur. Beim Laden werden Hashes, Quellen, Beziehungen und Schema geprüft; importierte Reviews bleiben historische Angaben. Frische Exportfreigabe ist erforderlich. Memory Atlas ist ein nachvollziehbares Kuratierungswerkzeug, keine Garantie gegen einen lokalen Angreifer mit Schreibzugriff auf alle Dateien.
