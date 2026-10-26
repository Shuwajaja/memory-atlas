# Entscheidungen und Annahmen

| ID | Entscheidung | Begründung / Status |
|---|---|---|
| ADR-01 | Eigenständiges Projekt Memory Atlas | Aus bisheriger Planung übernommen; vorhandene Repo nicht verändert |
| ADR-02 | P1 vollständig offline, dateibasiert | Zuerst sichtbarer, überprüfbarer Ablauf ohne Infrastruktur |
| ADR-03 | React/TS/Vite bei leerem Repo | Konkrete Designwahl für wartbare interaktive Ansichten; vorhandenen geeigneten Stack erhalten |
| ADR-04 | SQLite/FTS5 und Python-Loopback erst P2 | Dauerhaftes Archiv ohne Datenbankserver; zwei Runtimes erst bei entsprechendem Nutzen |
| ADR-05 | Menschliche Annahme und Belegstatus trennen | Verhindert, dass eine akzeptierte Erzählung als Ausführungsnachweis gilt |
| ADR-06 | Gültigkeit und Kenntniszeit trennen | Rückwirkende Änderungen und historische Ansichten bleiben nachvollziehbar |
| ADR-07 | Claim-Versionen unveränderlich, Reviews ereignisbasiert | Korrekturen erhalten Herkunft und machen alte Freigaben ungültig |
| ADR-08 | Graph als Ansicht | Echte Beziehungen bleiben in Domain-Daten; keine Graph-Engine als MVP-Bedingung |
| ADR-09 | Keine automatische Cloud-Extraktion | Private Quellen, Kosten und Modellwahl bleiben kontrollierbar |
| ADR-10 | Freigabe bindet konkrete Dateibytes | Änderungen oder Ablauf zwischen Vorschau und Download werden erkannt |
| ADR-11 | Claude- und Gemini-Kompatibilität profilgebunden | Offizielle Exportwege garantieren keinen hier geprüften stabilen JSON-Schemakontrakt |
| ADR-12 | Roharchive und Memory-Output getrennt | Agenten erhalten ausgewählte passende Inhalte; Projekt-Backup bleibt privat |

## Ohne Rückfrage gesetzte, änderbare Defaults

Deutsch als UI-Sprache, `Europe/Berlin`, KI-/Projektfilter, FQL Research Editorial, Importlimits, Reviewfristen und Exportgrenzen aus SPECC/KNOWLEDGE_RULES. Das sind Entwurfsentscheidungen für einen sicheren ersten Arbeitsablauf. Sie werden nicht als bereits gemessene Optimalwerte bezeichnet.

## Offene Nachweise, die keine weitere Spezifikationsrunde blockieren

Der echte Repo-Stand wird in T0 geprüft. Ein echtes datensparsam anonymisiertes Claude-Sample wird vor dessen Kompatibilitätsfreigabe benötigt. Windows- und Screenreader-Gates müssen auf passender Umgebung ausgeführt werden. Die Implementierung der übrigen P1-Funktionen kann währenddessen weiterlaufen. API-Provider, Tokenpreise, Modelle und externe Integrationsendpunkte werden erst im jeweiligen P3-Auftrag gewählt.

Änderungen an fachlichen Sicherheits-/Exportregeln benötigen einen dokumentierten Änderungsgrund, angepasste Schema-/Plan-/Testdateien und neue Policy-Version. Ein Agent darf nicht einen fehlgeschlagenen Test durch Abschwächen der Regel „reparieren“.
