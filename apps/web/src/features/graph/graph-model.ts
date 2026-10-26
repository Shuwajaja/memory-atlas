import { detectConflicts } from '../../domain/conflicts';
import { LIMITS } from '../../domain/limits';
import type { AtlasSnapshot, QueryTime } from '../../domain/models.generated';
import { projectClaim } from '../../domain/projection';

export interface GraphNode {
  id: string;
  kind: 'claim' | 'project' | 'category';
  label: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface GraphViewModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_matching_count: number;
  truncated: boolean;
}

export interface GraphFilters {
  category: string | null;
  projectId: string | null;
}

export function buildGraph(snapshot: AtlasSnapshot, filters: GraphFilters, at: QueryTime): GraphViewModel {
  const before = snapshot.claims.map((claim) => claim.id).join('\n');
  const claims = snapshot.claims.filter((claim) => {
    if (filters.category && claim.category !== filters.category) return false;
    if (filters.projectId && claim.scope.project_id !== filters.projectId) return false;
    return true;
  });
  const projects = new Map<string, GraphNode>();
  const categories = new Map<string, GraphNode>();
  for (const claim of claims) {
    const projectId = claim.scope.project_id ?? 'none';
    if (!projects.has(projectId)) {
      projects.set(projectId, { id: `project:${projectId}`, kind: 'project', label: projectId });
    }
    if (!categories.has(claim.category)) {
      categories.set(claim.category, { id: `category:${claim.category}`, kind: 'category', label: claim.category });
    }
  }
  const structural = [...projects.values(), ...categories.values()];
  const claimNodes = claims.map((claim) => ({ id: claim.id, kind: 'claim' as const, label: claim.text }));
  const matching = [...structural, ...claimNodes];
  const visible = matching.slice(0, LIMITS.graphNodes);
  const visibleIds = new Set(visible.map((node) => node.id));
  const edges: GraphEdge[] = [];
  for (const relation of snapshot.relations) {
    if (visibleIds.has(relation.from_claim_id) && visibleIds.has(relation.to_claim_id)) {
      edges.push({ id: relation.id, source: relation.from_claim_id, target: relation.to_claim_id, label: relation.type });
    }
  }
  for (const claim of claims) projectClaim(snapshot, claim.id, at);
  detectConflicts(snapshot, at);
  if (snapshot.claims.map((claim) => claim.id).join('\n') !== before) {
    throw new Error('Graphdaten haben den Claim-Bestand verändert.');
  }
  return {
    nodes: visible,
    edges,
    total_matching_count: matching.length,
    truncated: matching.length > visible.length,
  };
}
