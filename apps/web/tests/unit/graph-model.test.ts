import { describe, expect, it } from 'vitest';
import { buildGraph } from '../../src/features/graph/graph-model';
import type { AtlasSnapshot, Relation } from '../../src/domain/models.generated';
import { importFiles } from '../helpers';
import { sha256Text } from '../../src/domain/sha256';

describe('graph model', () => {
  it('creates edges only from stored relations and reports the real total above 150', async () => {
    const imported = await importFiles(['chatgpt/01-linear.json']);
    const base = imported.snapshot;
    const claims = Array.from({ length: 160 }, (_, index) => ({
      id: `clm_${index}`,
      text: `Aussage ${index}`,
      kind: 'fact' as const,
      source_kind: 'user_report' as const,
      extraction_method: 'manual' as const,
      modality: 'asserted' as const,
      scope: { workspace_id: base.workspace.id, project_id: 'project_orion', environment: 'local' },
      subject_id: 'orion',
      predicate: `topic.${index}`,
      value: String(index),
      cardinality: 'multiple' as const,
      category: 'other_ai' as const,
      evidence_ids: ['ev_graph'],
      asserted_at: '2026-10-01T00:00:00Z',
      recorded_at: '2026-10-26T16:00:00Z',
      validity_kind: 'unknown' as const,
      valid_from: null,
      valid_to: null,
      validity_basis: 'unknown' as const,
    }));
    const message = base.messages[0];
    const node = base.nodes.find((item) => item.message_revision_id === message?.revision_id);
    if (!message || !node || !message.parts[0]?.text) throw new Error('source missing');
    const quote = message.parts[0].text;
    const relation: Relation = {
      id: 'rel_real',
      type: 'related_to',
      from_claim_id: 'clm_0',
      to_claim_id: 'clm_1',
      effective_at: null,
      recorded_at: '2026-10-26T16:00:00Z',
      reason: 'Vorhandene Beziehung',
    };
    const snapshot: AtlasSnapshot = {
      ...base,
      evidence: [{
        id: 'ev_graph',
        message_revision_id: message.revision_id,
        node_id: node.id,
        part_index: 0,
        start_cp: 0,
        end_cp: Array.from(quote).length,
        quote,
        quote_sha256: sha256Text(quote),
        relation: 'supports',
        lineage_root_id: 'ev_graph',
      }],
      claims,
      relations: [relation],
    };
    const at = { valid_at: '2026-10-26T16:15:00Z', known_at: '2026-10-26T16:15:00Z' };
    const view = buildGraph(snapshot, { category: null, projectId: null }, at);
    expect(view.nodes.length).toBeLessThanOrEqual(150);
    expect(view.total_matching_count).toBeGreaterThan(150);
    expect(view.truncated).toBe(true);
    expect(view.edges.every((edge) => edge.id === relation.id || snapshot.relations.some((item) => item.id === edge.id))).toBe(true);
    expect(view.edges.map((edge) => edge.label)).not.toContain('similar');
    expect(snapshot.claims).toHaveLength(160);
    const filtered = buildGraph(snapshot, { category: 'other_ai', projectId: 'missing' }, at);
    expect(filtered.total_matching_count).toBe(0);
    expect(filtered.edges).toHaveLength(0);
  });
});
