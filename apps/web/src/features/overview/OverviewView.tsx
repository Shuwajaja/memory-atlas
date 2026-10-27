import type { QueryTime } from '../../domain/models.generated';
import { useShell } from '../../selection';
import { useAtlas } from '../../service-context';
import { Icon } from '../shell/icons';
import { RadialGraph } from './RadialGraph';
import { acceptedMetricNote, currentMetricNote, dataOrigin, originMark } from './data-origin';
import { countStatuses, type ActivityRow } from './reference-demo';
import { activityRows, visualCards } from './visual-cards';

interface OverviewViewProps {
  at: QueryTime;
}

export function OverviewView({ at }: OverviewViewProps) {
  const { state } = useAtlas();
  const { setIllustratedId, setInspectorOpen } = useShell();
  const origin = dataOrigin(state.snapshot, state.demo);
  const illustration = origin === 'illustration';
  const cards = visualCards(state.snapshot, at);
  const activity = activityRows(state.snapshot, cards, illustration);
  const counts = countStatuses(cards);

  function openCard(id: string): void {
    setIllustratedId(id);
    setInspectorOpen(true);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">WORKSPACE INTELLIGENCE</div>
          <h1>Guten Überblick.</h1>
          <p>Dein persönlicher Wissensraum – Entwicklungen statt endloser Chatlisten.</p>
        </div>
        <span className="sub-right">
          <span className="mini-dot" />
          {originMark(origin)}
        </span>
      </div>
      <div className="overview-hero">
        <div className="hero-copy">
          <div className="hero-signal"><i /> WISSEN, DAS MITDENKT</div>
          <h2>Alles, was bleibt.<br /><em>Alles, was sich ändert.</em></h2>
          <p>Aus verstreuten KI-Gesprächen wird ein verständlicher, zeitbewusster Wissensraum.</p>
        </div>
        <div className="hero-symbol" aria-hidden="true">
          <svg viewBox="0 0 150 150" fill="none">
            <circle cx="75" cy="75" r="26" stroke="#95F2D0" strokeWidth="1" />
            <circle cx="75" cy="75" r="10" fill="#92ECCD" fillOpacity=".2" stroke="#A7F8DB" strokeWidth="1.5" />
            <circle cx="75" cy="75" r="49" stroke="#65AC94" strokeWidth="1" strokeDasharray="3 7" />
            <circle cx="75" cy="75" r="67" stroke="#67B69D" strokeWidth=".7" strokeDasharray="2 10" />
            <g className="orbit-spin">
              <circle cx="75" cy="26" r="6" fill="#9BEECE" />
              <circle cx="118" cy="98" r="5" fill="#6EA9A4" />
              <circle cx="27" cy="118" r="4" fill="#83CEB6" />
            </g>
            <path d="M75 49V65m26 17-16-5M62 85l-24 25" stroke="#8EE6C6" strokeWidth="1.5" />
            <circle cx="75" cy="75" r="4" fill="#B8FFE6" />
          </svg>
        </div>
      </div>
      <div className="metric-grid">
        <Metric label="Wissenseinträge" value={counts.all} note={acceptedMetricNote(origin, counts.approved)} stroke="#81dcc2" />
        <Metric label="Aktuelle Aussagen" value={counts.current} note={currentMetricNote(origin)} stroke="#80c7cf" />
        <Metric label="Prüfung ausstehend" value={counts.review} note="mit Quellenvergleich" stroke="#ecc58a" />
        <Metric label="Historisch ersetzt" value={counts.old} note="bleiben nachvollziehbar" stroke="#d99791" />
      </div>
      <div className="content-grid">
        <section className="panel graph-panel">
          <div className="panel-header">
            <div>
              <div className="section-kicker">KNOWLEDGE SPACE / 01</div>
              <h3>Der Wissensgraph</h3>
              <p>Themen, Verbindungen und Erinnerungsräume</p>
            </div>
            <a className="text-button" href="#/knowledge">Erkunden <Icon name="arrow" size={12} /></a>
          </div>
          <RadialGraph cards={cards} onOpen={() => { window.location.hash = '#/knowledge'; }} />
          <div className="graph-mini-legend">
            <span><i className="legend-mark" /> Verknüpfte Wissensräume <i className="legend-mark soft" /> {illustration ? 'Beispieldaten' : 'Geladener Bestand'}</span>
            <span className="graph-footnote">Graph = Themenmodell · keine KI-Auswertung</span>
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-header">
            <div>
              <div className="section-kicker">ACTIVITY FEED / 02</div>
              <h3>Was hat sich verändert?</h3>
              <p>Entscheidungen & offene Prüfungen</p>
            </div>
          </div>
          <ActivityList rows={activity} onOpen={openCard} />
          <div className="activity-footer">
            <a className="text-button" href="#/timeline">Zur Zeitreise <Icon name="arrow" size={12} /></a>
          </div>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel mini-feature">
          <span className="feature-icon"><Icon name="shield" size={21} /></span>
          <div className="section-kicker">QUALITY GATE</div>
          <h3>Kein Fakt ohne Quelle.</h3>
          <p>Im Prüflabor wird zwischen <strong>besprochen</strong>, <strong>bestätigt</strong> und <strong>technisch belegt</strong> unterschieden.</p>
          <a className="text-button" href="#/review">Prüflabor öffnen <Icon name="arrow" size={12} /></a>
        </section>
        <section className="panel mini-feature">
          <span className="feature-icon"><Icon name="upload" size={21} /></span>
          <div className="section-kicker">SOURCE INBOX</div>
          <h3>Bring deine Chats mit.</h3>
          <p>Importiere ChatGPT-JSON. Das Claude-Profil ist nicht freigegeben. Neue Erinnerungskandidaten bleiben bis zur Prüfung ungeprüft.</p>
          <a className="text-button" href="#/import">Zum Import <Icon name="arrow" size={12} /></a>
        </section>
      </div>
      {illustration ? (
        <div className="notice"><Icon name="info" /> Die hier gezeigten Projektkarten dienen der Illustration. Sie sind keine verifizierte aktuelle Bestandsaufnahme deiner Agenten oder GitHub-Repositories.</div>
      ) : origin === 'synthetic' ? (
        <div className="notice"><Icon name="info" /> Dieser Bestand ist die synthetische Demo. Er ist kein echter Chat und kein Beleg für ein laufendes System.</div>
      ) : (
        <div className="notice"><Icon name="info" /> Der Graph folgt dem geladenen Bestand. Die Illustrationskarten sind ausgeblendet.</div>
      )}
    </>
  );
}

function Metric({ label, value, note, stroke }: { label: string; value: number; note: string; stroke: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value"><strong>{value}</strong></div>
      <div className="metric-meta">{note}</div>
      <div className="metric-mini">
        <svg viewBox="0 0 54 20" fill="none" aria-hidden="true">
          <path d="M1 16 9 13 15 14 23 6 30 10 37 5 43 8 52 3" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="52" cy="3" r="2" fill={stroke} />
        </svg>
      </div>
    </div>
  );
}

function ActivityList({ rows, onOpen }: { rows: readonly ActivityRow[]; onOpen: (id: string) => void }) {
  return (
    <div className="activity-list">
      {rows.map((row) => (
        <button key={`${row.id}-${row.title}`} type="button" className="activity-item" onClick={() => onOpen(row.id)}>
          <span className={row.tone ? `act-symbol ${row.tone}` : 'act-symbol'}><Icon name={row.icon} /></span>
          <span className="act-body">
            <div className="act-title">{row.title}</div>
            <div className="act-sub">{row.sub}</div>
          </span>
          <span className="act-date">{row.day}</span>
        </button>
      ))}
    </div>
  );
}
