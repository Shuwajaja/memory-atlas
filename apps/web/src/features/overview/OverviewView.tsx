import { useMemo, useState } from 'react';
import { detectConflicts } from '../../domain/conflicts';
import type { AtlasSnapshot, Category, QueryTime } from '../../domain/models.generated';
import { projectClaim } from '../../domain/projection';
import { buildGraph, type GraphEdge, type GraphNode } from '../graph/graph-model';
import { categoryLabel, relationLabel, reviewActionLabel } from '../format';
import type { Selection } from '../../selection';
import { useShell } from '../../selection';
import { useAtlas } from '../../service-context';
import { Icon } from '../shell/icons';
import { dayCounts, sparklineLabel, sparklinePoints } from './series';

type Chip = 'all' | 'related' | 'conflicts';

interface Activity {
  key: string;
  at: string;
  title: string;
  detail: string;
  tone: 'mint' | 'amber' | 'red';
  selection: Selection;
}

interface Topic {
  id: Category;
  label: string;
  count: number;
  claimId: string;
}

interface OverviewViewProps {
  at: QueryTime;
}

export function OverviewView({ at }: OverviewViewProps) {
  const { service, state } = useAtlas();
  const { projectId, setSelection } = useShell();
  const [chip, setChip] = useState<Chip>('all');
  const [category, setCategory] = useState('');
  const snapshot = state.snapshot;
  const filters = { category: category || null, projectId };
  const built = useMemo(() => buildGraph(snapshot, filters, at), [snapshot, category, projectId, at]);
  const conflicts = useMemo(() => detectConflicts(snapshot, at), [snapshot, at]);
  const model = useMemo(() => applyChip(built, chip, conflicts), [built, chip, conflicts]);
  const activity = useMemo(() => {
    const rows = filterActivity(buildActivity(snapshot), chip, conflicts, snapshot, projectId);
    if (!category) return rows;
    return rows.filter((item) => {
      const claimId = claimIdOf(item, snapshot);
      return snapshot.claims.find((claim) => claim.id === claimId)?.category === category;
    });
  }, [snapshot, chip, conflicts, projectId, category]);
  const categories = [...new Set(snapshot.claims.map((claim) => claim.category))].sort();
  const visibleClaims = model.nodes.flatMap((node) => {
    if (node.kind !== 'claim') return [];
    const claim = snapshot.claims.find((item) => item.id === node.id);
    return claim ? [claim] : [];
  });
  const projections = visibleClaims.map((claim) => ({ claim, view: projectClaim(snapshot, claim.id, at) }));
  const current = projections.filter((item) => item.view.temporal === 'current');
  const superseded = projections.filter((item) => item.view.temporal === 'superseded');
  const unverified = projections.filter((item) => item.view.evidence_status === 'unverified');
  const topics = topicNodes(snapshot, model.nodes);
  const topicEdges = topicLinks(snapshot, model.edges);

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Workspace Intelligence</p>
          <h2>Guten Überblick.</h2>
          <p className="subtitle">Dein persönlicher Wissensraum – Entwicklungen statt endloser Chatlisten.</p>
        </div>
        {state.demo ? <p className="banner"><span className="mini-dot" aria-hidden="true" /> Demo · synthetisch</p> : <p className="page-note">Eigener Bestand</p>}
      </header>
      <div className="overview-hero">
        <div className="hero-copy">
          <p className="hero-signal"><i aria-hidden="true" /> Wissen, das mitdenkt</p>
          <h3>Alles, was bleibt. <em>Alles, was sich ändert.</em></h3>
          <p>Aus verstreuten KI-Gesprächen wird ein verständlicher, zeitbewusster Wissensraum.</p>
        </div>
        <div className="hero-symbol" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="46" fill="none" stroke="#74dec1" strokeOpacity="0.35" />
            <circle cx="60" cy="60" r="28" fill="none" stroke="#74dec1" strokeOpacity="0.55" />
            <circle className="orbit-spin" cx="60" cy="14" r="4" fill="#74dec1" />
            <circle cx="60" cy="60" r="5" fill="#edf2f0" />
          </svg>
        </div>
      </div>
      <div className="metric-grid">
        <Metric
          label="Wissenseinträge"
          value={snapshot.conversations.length}
          meta={`Gespräche: ${snapshot.conversations.length}`}
          seriesTitle="Gespräche je Tag"
          instants={snapshot.conversations.map((item) => item.created_at)}
        />
        <Metric
          label="Aktuelle Aussagen"
          value={current.length}
          meta="zum gewählten Zeitpunkt"
          seriesTitle="Aktuelle Aussagen je Tag"
          instants={current.map((item) => item.claim.recorded_at)}
        />
        <Metric
          label="Prüfung ausstehend"
          value={unverified.length}
          meta="ohne bestätigte Quelle"
          seriesTitle="Ungeprüfte Karten je Tag"
          instants={unverified.map((item) => item.claim.recorded_at)}
        />
        <Metric
          label="Historisch ersetzt"
          value={superseded.length}
          meta="frühere Aussagen"
          seriesTitle="Ersetzte Aussagen je Tag"
          instants={superseded.map((item) => item.claim.recorded_at)}
        />
      </div>
      <div className="toolbar-row">
        <div className="chip-group" role="group" aria-label="Ansicht filtern">
          <FilterChip current={chip} value="all" onSelect={setChip}>Alle</FilterChip>
          <FilterChip current={chip} value="related" onSelect={setChip}>Mit Kante</FilterChip>
          <FilterChip current={chip} value="conflicts" onSelect={setChip}>Konflikte</FilterChip>
        </div>
        <label>
          Kategorie
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Alle Kategorien</option>
            {categories.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
          </select>
        </label>
      </div>
      <div className="content-grid">
        <article className="panel graph-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Knowledge Space</p>
              <h3>Der Wissensgraph</h3>
              <p>Themen aus {topics.length} Kategorien. Sichtbare Karten {visibleClaims.length} von {snapshot.claims.length}.</p>
            </div>
            <a className="text-button" href="#/graph">Erkunden</a>
          </div>
          {topics.length === 0 ? <p className="empty-state">Keine Knoten für diesen Filter.</p> : (
            <TopicGraph topics={topics} edges={topicEdges} onSelect={setSelection} />
          )}
          <p className="graph-footnote">Graph aus Themen des geladenen Bestands. Kanten nur bei gespeicherten Beziehungen.</p>
        </article>
        <article className="panel activity-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Activity Feed</p>
              <h3>Was hat sich verändert?</h3>
              <p>{activity.length} Einträge aus Reviews, Relationen und Importen.</p>
            </div>
          </div>
          {activity.length === 0 ? <p className="empty-state">Keine Ereignisse für diesen Filter.</p> : (
            <ul className="activity-list">
              {activity.slice(0, 8).map((item) => (
                <li key={item.key}>
                  <button type="button" className="activity-item" onClick={() => setSelection(item.selection)}>
                    <span className={`act-symbol ${item.tone}`} aria-hidden="true"><Icon name={item.tone === 'mint' ? 'review' : item.tone === 'amber' ? 'changes' : 'shield'} /></span>
                    <span className="act-body">
                      <span className="act-title">{item.title}</span>
                      <span className="act-sub">{item.detail}</span>
                    </span>
                    <span className="mono act-date">{item.at.slice(0, 16).replace('T', ' ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="activity-footer"><a className="text-button" href="#/timeline">Zur Zeitreise</a></p>
        </article>
      </div>
      <div className="bottom-grid">
        <article className="panel mini-feature">
          <span className="feature-icon" aria-hidden="true"><Icon name="shield" /></span>
          <p className="section-kicker">Quality Gate</p>
          <h3>Kein Fakt ohne Quelle.</h3>
          <p>{unverified.length} Karten ohne bestätigte Quelle. {conflicts.length} offene Konflikte zum aktuellen Zeitpunkt.</p>
          <a className="text-button" href="#/review">Prüflabor öffnen</a>
        </article>
        <article className="panel mini-feature">
          <span className="feature-icon" aria-hidden="true"><Icon name="inbox" /></span>
          <p className="section-kicker">Source Inbox</p>
          <h3>Bring deine Chats mit.</h3>
          <p>{snapshot.conversations.length} Gespräche und {snapshot.source_files.length} Dateien im Bestand. Ein Neuladen stellt die Sitzung nicht wieder her.</p>
          <a className="text-button" href="#/import">Zum Import</a>
        </article>
      </div>
      <div className="row">
        <button type="button" className="button" onClick={() => service.loadDemo()}>Demo laden</button>
      </div>
    </section>
  );
}

function Metric({ label, value, meta, seriesTitle, instants }: { label: string; value: number; meta: string; seriesTitle: string; instants: (string | null)[] }) {
  const series = dayCounts(instants);
  const points = sparklinePoints(series);
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-meta">{meta}</p>
      {points ? (
        <svg className="metric-spark" width="54" height="20" role="img" aria-label={sparklineLabel(seriesTitle, series)}>
          <polyline points={points} />
        </svg>
      ) : null}
    </article>
  );
}

function FilterChip({ current, value, onSelect, children }: { current: Chip; value: Chip; onSelect: (value: Chip) => void; children: string }) {
  return (
    <button type="button" className={current === value ? 'chip selected' : 'chip'} aria-pressed={current === value} onClick={() => onSelect(value)}>
      {children}
    </button>
  );
}

function TopicGraph({ topics, edges, onSelect }: { topics: Topic[]; edges: { id: string; source: Category; target: Category }[]; onSelect: (selection: Selection) => void }) {
  const width = 640;
  const height = 300;
  const positions = new Map(topics.map((topic, index) => [topic.id, place(index, topics.length, width, height)]));
  return (
    <div className="real-graph" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {edges.map((edge) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
        <circle cx={width / 2} cy={height / 2} r="18" />
      </svg>
      <p className="graph-center">{topics.reduce((sum, topic) => sum + topic.count, 0)}</p>
      {topics.map((topic) => {
        const position = positions.get(topic.id);
        if (!position) return null;
        return (
          <button
            key={topic.id}
            type="button"
            className="graph-node-btn kind-category"
            style={{ left: `${(position.x / width) * 100}%`, top: position.y }}
            onClick={() => onSelect({ type: 'claim', id: topic.claimId })}
          >
            <strong>{topic.count}</strong> {topic.label}
          </button>
        );
      })}
    </div>
  );
}

function place(index: number, count: number, width: number, height: number): { x: number; y: number } {
  if (count === 1) return { x: width / 2, y: height / 2 - 70 };
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  return {
    x: width / 2 + Math.cos(angle) * width * 0.34,
    y: height / 2 + Math.sin(angle) * height * 0.36,
  };
}

function topicNodes(snapshot: AtlasSnapshot, nodes: GraphNode[]): Topic[] {
  const topics = new Map<Category, Topic>();
  for (const node of nodes) {
    if (node.kind !== 'claim') continue;
    const claim = snapshot.claims.find((item) => item.id === node.id);
    if (!claim) continue;
    const current = topics.get(claim.category);
    if (current) current.count += 1;
    else topics.set(claim.category, { id: claim.category, label: categoryLabel(claim.category), count: 1, claimId: claim.id });
  }
  return [...topics.values()].sort((left, right) => left.label.localeCompare(right.label, 'de'));
}

function topicLinks(snapshot: AtlasSnapshot, edges: GraphEdge[]): { id: string; source: Category; target: Category }[] {
  const categoryOf = new Map(snapshot.claims.map((claim) => [claim.id, claim.category]));
  const seen = new Set<string>();
  const links: { id: string; source: Category; target: Category }[] = [];
  for (const edge of edges) {
    const source = categoryOf.get(edge.source);
    const target = categoryOf.get(edge.target);
    if (!source || !target || source === target) continue;
    const key = [source, target].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ id: edge.id, source, target });
  }
  return links;
}

function applyChip(
  model: ReturnType<typeof buildGraph>,
  chip: Chip,
  conflicts: ReturnType<typeof detectConflicts>,
): { nodes: GraphNode[]; edges: GraphEdge[]; total: number; truncated: boolean } {
  if (chip === 'related') {
    const linked = new Set(model.edges.flatMap((edge) => [edge.source, edge.target]));
    const nodes = model.nodes.filter((node) => linked.has(node.id));
    return { nodes, edges: model.edges, total: nodes.length, truncated: model.truncated };
  }
  if (chip === 'conflicts') {
    const ids = new Set(conflicts.flatMap((conflict) => conflict.claim_ids));
    const nodes = model.nodes.filter((node) => ids.has(node.id));
    const edges = model.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
    return { nodes, edges, total: nodes.length, truncated: false };
  }
  return { nodes: model.nodes, edges: model.edges, total: model.total_matching_count, truncated: model.truncated };
}

function buildActivity(snapshot: AtlasSnapshot): Activity[] {
  const reviews = snapshot.reviews.map((review) => ({
    key: review.id,
    at: review.recorded_at,
    title: reviewActionLabel(review.action),
    detail: review.reason,
    tone: review.action === 'reject' || review.action === 'exclude' ? 'red' as const : 'mint' as const,
    selection: { type: 'review' as const, id: review.id },
  }));
  const relations = snapshot.relations.map((relation) => ({
    key: relation.id,
    at: relation.recorded_at,
    title: relationLabel(relation.type),
    detail: relation.reason,
    tone: 'amber' as const,
    selection: { type: 'relation' as const, id: relation.id },
  }));
  const batches = snapshot.import_batches.map((batch) => ({
    key: batch.id,
    at: batch.completed_at,
    title: 'Import übernommen',
    detail: `${batch.source_file_ids.length} Dateien, ${batch.diagnostics.length} Hinweise`,
    tone: 'mint' as const,
    selection: { type: 'batch' as const, id: batch.id },
  }));
  return [...reviews, ...relations, ...batches].sort((a, b) => b.at.localeCompare(a.at));
}

function filterActivity(
  items: Activity[],
  chip: Chip,
  conflicts: ReturnType<typeof detectConflicts>,
  snapshot: AtlasSnapshot,
  projectId: string | null,
): Activity[] {
  const conflictIds = new Set(conflicts.flatMap((conflict) => conflict.claim_ids));
  const relatedIds = new Set(snapshot.relations.flatMap((relation) => [relation.from_claim_id, relation.to_claim_id]));
  return items.filter((item) => {
    if (projectId && !matchesProject(item, snapshot, projectId)) return false;
    if (chip === 'all') return true;
    if (item.selection.type === 'batch') return false;
    const claimId = claimIdOf(item, snapshot);
    if (!claimId) return false;
    if (chip === 'conflicts') return conflictIds.has(claimId);
    return relatedIds.has(claimId);
  });
}

function claimIdOf(item: Activity, snapshot: AtlasSnapshot): string | null {
  const selection = item.selection;
  if (selection.type === 'review') {
    const id = selection.id;
    const review = snapshot.reviews.find((entry) => entry.id === id);
    return review?.target_type === 'claim' ? review.target_id : null;
  }
  if (selection.type === 'relation') {
    const id = selection.id;
    return snapshot.relations.find((entry) => entry.id === id)?.from_claim_id ?? null;
  }
  return null;
}

function matchesProject(item: Activity, snapshot: AtlasSnapshot, projectId: string): boolean {
  if (item.selection.type === 'batch') return false;
  const claimId = claimIdOf(item, snapshot);
  if (!claimId) return false;
  return snapshot.claims.find((claim) => claim.id === claimId)?.scope.project_id === projectId;
}
