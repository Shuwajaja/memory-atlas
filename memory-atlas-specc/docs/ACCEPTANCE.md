# Abnahmeplan

Stand: **2026-10-26**. Dieses Dokument spezifiziert erforderliche Prüfungen; es meldet keine davon als ausgeführt. Grundlage sind `SPECC.md`, `KNOWLEDGE_RULES.md`, `PRIVACY_AND_SECURITY.md`, `IMPORTS.md`, `ARCHITECTURE.md` und `DESIGN.md`.

Alle AC sind MUSS-Gates ihrer angegebenen Phase. P0/P1 umfassen AC01–AC24; P2/P3 werden getrennt aktiviert. Ein Testprotokoll nennt AC-ID, Build-/Commit-ID, Umgebung, Fixture-Hashes, Ist-Ergebnis und Beleg. Zulässige Ergebnisse: bestanden, fehlgeschlagen, nicht durchgeführt, begründet nicht anwendbar. Fehlende Browser-/Windows-/Realsample-Prüfungen werden nicht durch Unit-Tests ersetzt. Synthetische Fixtures gehören ins Repo; geprüfte anonymisierte Hersteller-Samples bleiben lokal außerhalb des Repos. Niemals private Roharchive zum Hochladen in ein öffentliches Repository anfordern.

## P0/P1

### AC01 — Offline-Ausgabe und Windows · P1

Gegeben ist der fertige `dist-offline/index.html`-Build. Beim Öffnen über `file://` ohne Netzwerk funktionieren Import, Worker, Review, Snapshot und Download. Netzwerkmitschnitt zeigt null automatische Requests, einschließlich Fonts/Medien; kein Konto, Schlüssel oder Server erforderlich. Windows-Freigabe verlangt denselben Ablauf auf einem normalen Benutzerkonto. Ohne diese Ausführung bleibt das Windows-Gate offen.

### AC02 — ChatGPT linear und geteilt · P1

Mit `chatgpt/01-linear.json` und gemeinsam `08-split-a.json`/`09-split-b.json` liefert `chatgpt-mapping-v1` die Golden-Konversationen, IDs, Nachrichten und Quellpointer. Reihenfolge der Dateiauswahl ändert keine Identität. Gemeinsame Datensätze werden dedupliziert. ZIP wird mit Entpackanleitung abgewiesen; unbekanntes JSON ergibt Diagnose, keinen Volltext-Fallback.

### AC03 — Zweige und Zyklen · P1

`02-branches.json` erhält ausgewählten und alternativen Pfad, Originalrollen sowie Nullwurzeln. `05-cycle.json`, fehlende Eltern und ungültiger `current_node` terminieren kontrolliert, bewahren Rohreferenzen und kennzeichnen unsichere Zuordnung `unknown`. Keine zeitliche Gesamtverkettung erfundener Gesprächsfolgen. 10.000 Elternkanten sind zulässig; der nächste Schritt wird blockiert.

### AC04 — Claude-Freigabe · P1

`claude/01-content.json`/`02-unknown.json` prüfen `text`-/Block-Priorität, unbekannte Inhalte und Quellreihenfolge. Ohne dokumentiert geprüftes anonymisiertes reales Kontodatenexport-Sample bleibt das Profil deaktiviert oder ausdrücklich nicht freigegeben. Nach Gate gilt die Zusage nur für geprüfte Varianten. Browser-API-Daten und Claude-Code-JSONL werden nicht still mitakzeptiert.

### AC05 — Zeitlücken und Medien · P1

`03-missing-time.json` behält `sent_at=null`; weder 1970 noch Importdatum erscheint als Nachrichtenzeit. `04-multimodal.json` erhält alle Textteile und typisierte Medien-/Tool-Platzhalter samt Referenzen. Unbekannte Rollen/Blöcke bleiben nachvollziehbar. Keine erfundenen Beschreibungen und keine automatische Medienabfrage. Der Bericht zählt fehlende Zeiten und Platzhalter korrekt.

### AC06 — Wiederimport und Revision · P1

Identischer Wiederimport erzeugt null zusätzliche logische Nachrichten/Inhaltsrevisionen. `06-revision.json` erzeugt bei geändertem Inhalt eine neue unveränderliche Revision mit gleicher `logical_id`. Frühere Belege bleiben auf ihrer Revision. Andere Quellen mit gleichen Anbieter-IDs bleiben getrennt. Kleinere Folgeexporte löschen nichts; Dateiumbenennung allein erzeugt keine Inhaltsrevision.

### AC07 — Feindliches JSON und Rendering · P1

`07-hostile.json` und gezielte Gegenbeispiele mit Skript, Eventhandler, SVG, gefährlicher URL, doppelten Schlüsseln sowie `__proto__`/`constructor`/`prototype` bewirken weder Ausführung noch Netzabruf noch Konfigurationsänderung. Duplikatschlüssel scheitern explizit. JSON-Tiefe 128 ist zulässig, 129 abgewiesen. String-Escapes dürfen den Vorschanner nicht täuschen.

### AC08 — Grenzen, Worker, Abbruch · P1

Grenzprüfungen umfassen 32 MiB je Datei, 128 MiB pro Batch, 500 Dateien und 100.000 Nachrichten vor Deduplizierung. Überschreitung meldet die konkrete Grenze. Während Worker-Verarbeitung bleibt die UI bedienbar. Abbruch/Fehler vor Commit lässt den Store byteinhaltlich unverändert; bestätigter Commit übernimmt alles atomar. Kein vorgetäuschter Teilabbruch während Commit.

### AC09 — Sechs Kalendermonate · P1

Bei festgehaltener Uhr am 26.10.2026 und `Europe/Berlin` zeigt das Preset 26.04.2026 00:00 inklusiv bis 27.10.2026 00:00 exklusiv. UTC-Konvertierung berücksichtigt DST; kein 180-Tage-Ersatz. Monatsende/Schaltjahr werden zusätzlich geprüft. Nachrichtenzeit entscheidet, nicht nur Chatanlagezeit. Ältere Eltern erscheinen gekennzeichnet als Kontext; undatierte Nachrichten separat.

### AC10 — Exakte Provenienz und Unicode · P1

Ein Beleg mit Emoji, kombinierenden Zeichen und Zeilenumbrüchen referenziert Revision und JSON-Pointer. `[start,end)` zählt Unicode-Skalarwerte; der Ausschnitt entspricht exakt dem gespeicherten Belegtext. UTF-16-Verwechslung, verschobene Spanne oder falsche Revision blockieren Quellenbestätigung. Ungültige Surrogate erzeugen Diagnose; keine automatische erfundene Reparaturspanne.

### AC11 — Herkunft und Annahme sind kein Beweis · P1

Neue manuelle/heuristische Karten starten `candidate`. `accept` verändert ausschließlich Kuratierung; `confirm_source` verlangt gesonderte Prüfung von Rolle, Zweig, Negation, Modalität, Zitat und Scope. Textmatch, Hash, Graphklick, importierter Tooltext oder behauptetes Prüfergebnis erzeugen niemals `execution_verified`. Herkunft, Kuratierung, Zeit und Evidenz bleiben getrennt sichtbar.

### AC12 — Konflikte statt „neu gewinnt“ · P1

Eine neue Assistentenempfehlung ersetzt keine ältere Nutzerentscheidung. Unvereinbare Single-Slot-Werte bei gleichem Scope und Zeitüberlappung öffnen einen Konflikt und sperren beide für Memory. Verschiedene Umgebungen kollidieren nicht automatisch. Bestätigtes `supersedes` verlangt Datum/Begründung; Zyklen scheitern. Wiederholte Zitate zählen nicht als unabhängige Beweise.

### AC13 — Kenntniszeit und Gültigkeitszeit · P1

Bei rückwirkend erfasster Ablösung unterscheiden sich Projektionen vor/nach `recorded_at`; Ereignisse gelten erst bei `recorded_at <= known_at`. Für `valid_at` ist Anfang inklusiv, Ende exklusiv. Prüfe unmittelbar vor/am Ablösedatum sowie Reviewtermin. `timeless` benötigt expliziten Review. Statuspriorität und zusätzliche Gründe entsprechen dem gemeinsamen Projektor.

### AC14 — Unveränderliche Bearbeitung · P1

Änderungen an Claim-Inhalt, Quelle, Scope, Modalität oder Gültigkeit erzeugen neue Claim-ID plus `revises`. Alte Inhalte/Ereignisse bleiben unverändert; Freigaben werden nicht übertragen. Annahme, Quellenprüfung, Relationbestätigung/-widerruf und Reviewverlängerung sind append-only Ereignisse. Zurückgenommene Relationen bleiben im früheren Kenntnisstand rekonstruierbar.

### AC15 — Graph und Liste · P1

Bei mehr als 150 Treffern erscheinen höchstens 150 sichtbare Knoten samt ehrlicher Teilmengenanzeige. Jede Kante beruht auf vorhandenen Beziehungen; keine dekorativen oder als bewiesen ausgegebenen Ähnlichkeitskanten. Die Liste bietet dieselben Filter, Zustände, Detailzugriffe und Aktionen per Tastatur. Position oder Farbe erhöht keinen Belegstatus.

### AC16 — Projekt-Rundlauf · P1

Speichern und Öffnen von `.atlas.json` erhält IDs, Inhalte, Revisionen, Quellen, Relationen und Reviewhistorie. Dirty-State und privater Backupinhalt bleiben sichtbar. Unbekannte Major-Version, ungültige Referenzen und Überschreitungen von 256 MiB, 100.000 Nachrichtenrevisionen oder 100.000 Reviews werden abgewiesen. Importierte Freigaben gelten `imported_untrusted`; selbst konsistent manipulierte Hashes autorisieren keinen neuen Export. Fremdprojekte werden nicht still gemischt.

### AC17 — Exportmatrix · P1

Ausgehend von einer zulässigen, manuell ausgewählten Karte wird jede Sperrbedingung einzeln variiert:

| Fall | Erwartung |
|---|---|
| Accepted, source-correlated, current, fresh, shareable, passender Scope | Nach exakter Freigabe zulässig |
| Candidate/rejected/excluded, unverified, Zukunft/abgelaufen/ersetzt/unbekannt, Review fällig/fehlend | Gesperrt, konkreter Grund |
| Konflikt/offene Ersetzung, falscher Scope, private/secret/unknown | Gesperrt |
| Assistenten-Ausführungsbehauptung, Toolbeobachtung oder `runtime.*`/`execution.*` unabhängig vom Claim-Kind | P1 gesperrt |
| Empfehlung/Inference | Nur ausdrücklich gewählte geprüfte Notizoption, Herkunft sichtbar |
| Ungeprüfter Branch, hypothetisch/negiert/zitiert/unsicher | Standardexport gesperrt |

### AC18 — Vorschau, Ablauf und echte Bytes · P1

Freigabe bindet Payload-Digest und Hashes tatsächlicher JSON-/Markdown-Dateibytes ohne zirkuläre Selbstprüfsumme. Karte, Auswahl, Policy, Scope oder zeitliche Zulässigkeit nach Vorschau ändern: Download blockiert. Vorschau maximal 15 Minuten; Freigabe höchstens 24 Stunden beziehungsweise bis zur früheren Review-/Gültigkeitsgrenze. Heruntergeladene Bytes müssen exakt der bestätigten Vorschau entsprechen.

### AC19 — Datenschutz, Scope und Memory-Grenzen · P1

Falscher Empfänger-/Projekt-/Umgebungsscope oder nicht ausdrücklich `shareable` sperrt. 50 Karten und 16.000 UTF-8-Bytes Memory-Text sind Grenzen; Überschreitung blockiert ohne Kürzung. Manifest bleibt klein, enthält nur opake Quellen-/Revisions-IDs und Belegdigest, keine Rohtexte. Historische Ansicht umgeht keine aktuelle Exportpolicy. Sitzung leeren entfernt keine früheren Downloads.

### AC20 — Responsive und zugänglich · P1

Browserprüfung bei 1440×900, 1024×768 und 390×844: alle Kernactions erreichbar, kein erzwungener horizontaler Ablauf. Tastatur, sichtbarer Fokus, Dialogfokus/Rückgabe, Labels, Live-Fehler, Status ohne reine Farbcodierung und reduzierte Bewegung funktionieren. Axe plus manuelle Prüfung dokumentieren Befunde; kein behaupteter vollständiger Screenreader-Nachweis durch Automation. Leer-/Lade-/Fehler-/Nichtgespeichert-Zustände prüfen.

### AC21 — Ehrliche Daten- und Testbehauptungen · P1

Demo zeigt dauerhaft „Demo · synthetisch“. Keine erfundene Importabdeckung, Produktionsprüfung, sechsmonatige Analyse oder Live-Verifikation. Eine Fertigmeldung nennt ausgeführte Prüfungen und offene Gates. Fehlende reale Daten, nicht geprüfte Plattformen und Teilunterstützung sind sichtbar. Zählwerte kommen aus dem tatsächlichen geladenen Zustand.

### AC22 — KI-Filter und manuelle Ausschlüsse · P1

Eine KI-Antwort mit wiederholten privaten Angaben bleibt trotz Rollenfilter potenziell privat. Hinweis erklärt diese Grenze. Thematische KI-/Projektfilter und manuelle Ausschlüsse wirken auf Kandidaten/Memory, verändern keine Originalquelle und werden nicht als sichere Geheimniserkennung ausgegeben. Manuell ausgeschlossene Karten gelangen auch nach Filterwechsel nicht automatisch in Sets.

### AC23 — Vorhandenen Bestand bewahren · P0

Vor Änderungen sind Repo-Regeln, Arbeitsstand, HTML-Prototyp und Stack dokumentiert. Vorhandene uncommittete Nutzerarbeit bleibt erhalten. Geeigneter vorhandener Stack wird nicht blind ersetzt; übernommene Parser erfüllen ihre Gates. Ein neuer Zweig/Checkout ersetzt keine Prüfung. Unbekannter Repository-Zustand wird nicht als bereits untersucht behauptet.

### AC24 — Release und echte Samples · P1

Release nennt exakte Profilvarianten, offene Gates, Lockfiles, Abhängigkeiten und Lizenztexte. Bestehende Lizenz bleibt respektiert. Für Herstellerkompatibilität werden minimale anonymisierte echte Samples lokal fachlich geprüft; CI bleibt synthetisch. Keine Roharchive, Datenbanken, Schlüssel oder privaten Screenshots im Repo. Realsample-/Windows-Lücken verhindern entsprechende Kompatibilitätszusagen.

## Spätere Phasen

### AC25 — SQLite, Migration, Suche, Restore · P2

Migration erhält P1-Identitäten und Reviewhistorie transaktional. Fehler hinterlassen wiederherstellbaren Altstand. Ausgelieferte Runtime besteht tatsächliche FTS5-Erstellung; Suche findet erwartete Inhalte nach Indexneuaufbau. Konsistentes Backup wird unter Last erstellt und separat wiederhergestellt; Referenzen/Zählwerte stimmen. Fremdschlüssel, Single-Writer und begrenzte Busy-Behandlung sind aktiv.

### AC26 — Loopback und Windows-Start · P2

Nur `127.0.0.1`, kein LAN-Fallback bei Portkonflikt. Jede API-Anfrage benötigt Session-Header; Bootstrap-Token ist einmalig und verschwindet aus Fragment/Logs. Fremder Host/Origin, `Origin:null`, CSRF und DNS-Rebinding scheitern. Windows-Start/Stop/Restore funktioniert als Normalnutzer ohne Docker/Admin/systemweiten Dienst; sonst bleibt die Plattformfreigabe offen.

### AC27 — Löschung und Jobfortsetzung · P2

Bestätigte Löschung entfernt Quelle und Ableitungen einschließlich FTS/Vorschauen atomar. Inhaltsfreie Tombstones verhindern identischen Wiederimport; Restore beachtet sie. Fremde Backups/Agentenkopien werden nicht als gelöscht behauptet. Unterbrochener Import setzt nur bei identischem Input-/Adapter-/Policy-Digest fort, erzeugt keine Duplikate; Abweichung verlangt Neustart.

### AC28 — KI-Qualität, Budget und Injection · P3

Extraktion wird auf getrenntem lokal geprüftem Referenzsatz bewertet; Präzision, Quellenfehler und Grenzen dokumentieren, keine Genauigkeit erfinden. Modell erzeugt nur Kandidaten. Prompt-Injection aus Chats erzeugt keine Freigaben/Tools. Cloud sieht ausschließlich bestätigte Ausschnitte; Budget wird vor Arbeit reserviert und beim Limit gestoppt. Versionen, Verbrauch und Cachebindungen sind nachvollziehbar.

### AC29 — Gemini · P3

Eigenes Takeout-Profil besteht lokale Realsample-Gates für konkret benannte Archivstruktur/Version. Chats unter Gemini Apps Activity werden von Gems unterschieden. Fehlende Reihenfolge, Zeiten, Zweige oder Medien bleiben sichtbar. Kein Umbenennen zu ChatGPT/Claude und keine pauschale Garantie vollständiger Chatrekonstruktion.

### AC30 — Adapter, MCP und D34 · P3

Adapter lesen nur passende, aktuelle freigegebene Sets; Scopeabweichung, Ablauf oder Widerruf sperrt neue Zugriffe. Kein Roharchiv, Selbstfreigabetool oder frei aus Chats erzeugter Systemregeltext. Adapterausfall lässt Kern nutzbar. D34: TruthLens übermittelt ausschließlich erlaubten Prüfstatus, niemals Belege, Pfade oder Schlüssel; ungebundener Status erhöht keine Evidenz. Bereits ausgegebene Kopien sind nicht rückrufbar.

## Leistungsziele, noch keine Messwerte

Referenzdatensatz: **10.000 Textnachrichten, 1.000 Claims**. Zielwerte auf protokollierter Referenzmaschine: UI-Eingabe bis sichtbare Reaktion **p95 <150 ms**, Suche bis Ergebnisdarstellung **p95 <500 ms**, Worker-Abbruch **<1 s**. Hardware, Browser, Build, Datenhash und Messmethode festhalten. Ein fokussierter Durchlauf mit ausreichenden Interaktionsmessungen genügt; große Grenzdateien gezielt erzeugen, keine unnötig wiederholten Vollimporte. Zielverfehlungen samt Ursache/Entscheidung dokumentieren, keine Messung aus bloßer Architekturannahme ableiten.

## Zusätzliche Regressionsfälle aus der Vertragsreview

- AC10: Zwei Textparts, korrekte Spanne aber falscher `part_index` scheitert; ein Beleg über mehrere Parts benötigt mehrere Evidence-Objekte. `node_id` bindet genau die geprüfte Occurrence und den Importsnapshot.
- AC13: Alter Claim hat `valid_to=null`; bestätigte Ersetzung bei T verkürzt sein effektives Intervall. Ab T ist ausschließlich der neue Claim aktuell und bei übrigen erfüllten Bedingungen exportfähig. Reject/Exclude entfernt eine Karte aus Konfliktberechnung.
- AC14: `accept` und `reject` mit gleichem Zeitstempel folgen `seq`, nicht zufälligen UUIDs.
- AC17: Umbenennung einer Ausführungsbehauptung in `kind=fact`/`predicate=deployment_status` gewährt keine Verifikation; Assistenz-Ausführungsbehauptungen bleiben gesperrt, Nutzerberichte tragen zwingend Datum und Nichtverifikationspräfix.
- AC18: Neue widersprechende Karte verändert den vollständigen fachlichen `state_sha256`; reine Exporthistorie nicht. Approval verlängert nie den bereits im Payload festgelegten Ablauf.
- AC24/AC25: TypeScript und Python erzeugen für `examples/canonical-vectors.json` exakt die vorgegebenen UTF-8-Bytes und SHA-256-Digests.

- AC03/AC18: Ein neuer Import entfernt den belegten Nutzerentscheidungsknoten aus dem ausgewählten Zweig oder ändert seine Revision → `SOURCE_CONTEXT_CHANGED`, neue Freigabe ohne neue Quellenreview bleibt gesperrt. Bloße Fortsetzung bei unverändertem Beleg bleibt gültig.
