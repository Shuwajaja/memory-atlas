import { useMemo, useState } from 'react';
import { Background, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildGraph } from './graph-model';
import type { QueryTime } from '../../domain/models.generated';
import { useShell } from '../../selection';
import { useAtlas } from '../../service-context';
import { GraphList } from './GraphList';

interface GraphViewProps {
  at: QueryTime;
  reducedMotion: boolean;
}

export function GraphView({ at, reducedMotion }: GraphViewProps) {
  const { state } = useAtlas();
  const { setSelection } = useShell();
  const [category, setCategory] = useState('');
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState<'graph' | 'list'>('graph');
  const [selected, setSelected] = useState<string | null>(null);
  const model = useMemo(
    () => buildGraph(state.snapshot, { category: category || null, projectId: projectId || null }, at),
    [state.snapshot, category, projectId, at],
  );
  const nodes: Node[] = model.nodes.map((node, index) => ({
    id: node.id,
    position: { x: (index % 4) * 240, y: Math.floor(index / 4) * 120 },
    data: { label: node.label },
    draggable: !reducedMotion,
  }));
  const edges: Edge[] = model.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: false,
  }));

  return (
    <section className="stack">
      <h2>Beziehungen</h2>
      <p>Kanten stammen nur aus gespeicherten Relationen. Ähnlichkeit erzeugt keine Kante.</p>
      <div className="row">
        <label>Kategorie<input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <label>Projekt<input value={projectId} onChange={(event) => setProjectId(event.target.value)} /></label>
        <button type="button" className="button" aria-pressed={mode === 'graph'} onClick={() => setMode('graph')}>Graph</button>
        <button type="button" className="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>Liste</button>
      </div>
      <p data-testid="graph-count">Sichtbar {model.nodes.length} von {model.total_matching_count}. {model.truncated ? 'Die Ansicht ist gekürzt.' : 'Die Ansicht ist vollständig.'}</p>
      {mode === 'graph' ? (
        <div className="graph-canvas" data-reduced-motion={reducedMotion ? 'true' : 'false'}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesConnectable={false}
            nodesDraggable={!reducedMotion}
            elementsSelectable
            panOnDrag
            zoomOnDoubleClick={!reducedMotion}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: false }}
            onNodeClick={(_event, node) => choose(node.id)}
          >
            <Background />
          </ReactFlow>
        </div>
      ) : (
        <GraphList nodes={model.nodes} edges={model.edges} selected={selected} onSelect={choose} />
      )}
    </section>
  );

  function choose(id: string): void {
    setSelected(id);
    if (state.snapshot.claims.some((claim) => claim.id === id)) {
      setSelection({ type: 'claim', id });
      return;
    }
    const node = model.nodes.find((item) => item.id === id);
    setSelection(node ? { type: 'graph-node', id, label: node.label, kind: node.kind } : null);
  }
}
