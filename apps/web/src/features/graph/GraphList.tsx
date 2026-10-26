import type { GraphEdge, GraphNode } from './graph-model';

interface GraphListProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function GraphList({ nodes, edges, selected, onSelect }: GraphListProps) {
  return (
    <div className="stack">
      <ul>
        {nodes.map((node) => (
          <li key={node.id}>
            <button type="button" className="button" aria-pressed={selected === node.id} onClick={() => onSelect(node.id)}>
              {node.kind}: {node.label}
            </button>
          </li>
        ))}
      </ul>
      <h2>Kanten</h2>
      {edges.length === 0 ? <p>Keine gespeicherte Relation im sichtbaren Ausschnitt.</p> : null}
      <ul>
        {edges.map((edge) => (
          <li key={edge.id}>{edge.label}: {edge.source} → {edge.target}</li>
        ))}
      </ul>
    </div>
  );
}
