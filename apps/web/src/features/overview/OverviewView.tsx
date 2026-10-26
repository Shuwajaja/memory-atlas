import { useMemo, useState, type ReactNode } from 'react';
import { detectConflicts } from '../../domain/conflicts';
import type { AtlasSnapshot } from '../../domain/models.generated';
import { projectClaim } from '../../domain/projection';
import { buildGraph, type GraphEdge, type GraphNode } from '../graph/graph-model';
import type { Selection } from '../../selection';
import { useShell } from '../../selection';
import { nowQuery, useAtlas } from '../../service-context';

type Chip = 'all' | 'related' | 'conflicts';

interface Activity {
  key: string;
  at: string;
  title: string;
  detail: string;
  selection: Selection;
}

export function OverviewView() {
  const { service, state } = useAtlas();
  const { projectId, setSelection } = useShell();
  const [chip, setChip] = useState<Chip>('all');
  const [category, setCategory] = useState('');
  const snapshot = state.snapshot;
  const at = nowQuery();
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
  const unverified = snapshot.claims.filter((claim) => projectClaim(snapshot, claim.id, at).evidence_status === 'unverified').length;

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>Überblick</h2>
          <p className="subtitle">Zählwerte, Graph und Aktivität stammen aus dem geladenen Arbeitsbereich.</p>
        </div>
        {state.demo ? <p className="banner">Demo · synthetisch</p> : null}
      </header>
      <div className="metric-grid">
        <Metric label={`Gespräche: ${snapshot.conversations.length}`} value={snapshot.conversations.length} meta="geladen" />
        <Metric label={`Nachrichten: ${snapshot.messages.length}`} value={snapshot.messages.length} meta="Revisionen" />
        <Metric label={`Karten: ${snapshot.claims.length}`} value={snapshot.claims.length} meta="Wissenskarten" />
        <Metric label={`Reviews: ${snapshot.reviews.length}`} value={snapshot.reviews.length} meta="Ereignisse" spark={<ReviewSpark reviews={snapshot.reviews} />} />
      </div>
      <p>Arbeitsbereich: {snapshot.workspace.title}</p>
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
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="content-grid">
        <article className="panel graph-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Beziehungen</p>
              <h3>Wissensgraph</h3>
              <p>Sichtbar {model.nodes.length} von {model.total}. {model.truncated ? 'Die Ansicht ist gekürzt.' : 'Die Ansicht ist vollständig.'}</p>
            </div>
            <a href="#/graph">Zur Graphansicht</a>
          </div>
          {model.nodes.length === 0 ? <p className="empty-state">Keine Knoten für diesen Filter.</p> : <RealGraph nodes={model.nodes} edges={model.edges} onSelect={setSelection} />}
        </article>
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Ereignisse</p>
              <h3>Aktivität</h3>
              <p>{activity.length} Einträge aus Reviews, Relationen und Importen.</p>
            </div>
          </div>
          {activity.length === 0 ? <p className="empty-state">Keine Ereignisse für diesen Filter.</p> : (
            <ul className="activity-list">
              {activity.map((item) => (
                <li key={item.key}>
                  <button type="button" className="activity-item" onClick={() => setSelection(item.selection)}>
                    <span className="act-title">{item.title}</span>
                    <span className="act-sub">{item.detail}</span>
                    <span className="mono act-date">{item.at}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
      <div className="bottom-grid">
        <article className="panel mini-feature">
          <h3>Kein Fakt ohne Quelle.</h3>
          <p>{unverified} Karten ohne bestätigte Quelle. {conflicts.length} offene Konflikte zum aktuellen Zeitpunkt.</p>
          <a href="#/changes">Alt/Neu öffnen</a>
        </article>
        <article className="panel mini-feature">
          <h3>Quellen</h3>
          <p>{snapshot.conversations.length} Gespräche und {snapshot.source_files.length} Dateien im Bestand. Ein Neuladen stellt die Sitzung nicht wieder her.</p>
          <a className="button primary" href="#/import">Zum Import</a>
        </article>
      </div>
      <div className="row">
        <button type="button" className="button" onClick={() => service.loadDemo()}>Demo laden</button>
      </div>
    </section>
  );
}

function Metric({ label, value, meta, spark }: { label: string; value: number; meta: string; spark?: ReactNode }) {
  return (
    <article className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-meta">{meta}</p>
      {spark}
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

function ReviewSpark({ reviews }: { reviews: AtlasSnapshot['reviews'] }) {
  const buckets = new Map<string, number>();
  for (const review of reviews) {
    const day = review.recorded_at.slice(0, 10);
    if (!day) continue;
    buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  const points = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (points.length < 2) return null;
  const max = Math.max(...points.map((point) => point[1]));
  const width = 56;
  const height = 20;
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - (point[1] / max) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="metric-spark" width={width} height={height} role="img" aria-label={`Reviews je Tag: ${points.map((point) => `${point[0]} ${point[1]}`).join(', ')}`}>
      <polyline points={coords} />
    </svg>
  );
}

function RealGraph({ nodes, edges, onSelect }: { nodes: GraphNode[]; edges: GraphEdge[]; onSelect: (selection: Selection) => void }) {
  const columns = Math.min(3, Math.max(1, nodes.length));
  const width = 720;
  const rowHeight = 92;
  const rows = Math.ceil(nodes.length / columns);
  const height = Math.max(160, rows * rowHeight + 16);
  const positions = new Map(nodes.map((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = ((column + 0.5) / columns) * width;
    const y = 28 + row * rowHeight;
    return [node.id, { x, y }] as const;
  }));
  return (
    <div className="real-graph" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {edges.map((edge) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
        })}
      </svg>
      {nodes.map((node) => {
        const position = positions.get(node.id);
        if (!position) return null;
        return (
          <button
            key={node.id}
            type="button"
            className={`graph-node-btn kind-${node.kind}`}
            style={{ left: `${(position.x / width) * 100}%`, top: position.y }}
            onClick={() => onSelect(selectionFor(node))}
          >
            {node.label}
          </button>
        );
      })}
    </div>
  );
}

function selectionFor(node: GraphNode): Selection {
  if (node.kind === 'claim') return { type: 'claim', id: node.id };
  return { type: 'graph-node', id: node.id, label: node.label, kind: node.kind };
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
    title: review.action,
    detail: review.reason,
    selection: { type: 'review' as const, id: review.id },
  }));
  const relations = snapshot.relations.map((relation) => ({
    key: relation.id,
    at: relation.recorded_at,
    title: relation.type,
    detail: relation.reason,
    selection: { type: 'relation' as const, id: relation.id },
  }));
  const batches = snapshot.import_batches.map((batch) => ({
    key: batch.id,
    at: batch.completed_at,
    title: 'Import',
    detail: `${batch.source_file_ids.length} Dateien, ${batch.diagnostics.length} Hinweise`,
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
