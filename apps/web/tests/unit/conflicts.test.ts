import { describe, expect, it } from 'vitest';
import { detectConflicts } from '../../src/domain/conflicts';
import type { AtlasSnapshot, Claim, Relation, ReviewEvent } from '../../src/domain/models.generated';
import { appendReview, projectClaim } from '../../src/domain/projection';
import { importFiles } from '../helpers';
import { sha256Text } from '../../src/domain/sha256';
import type { Evidence } from '../../src/domain/models.generated';

async function card(snapshot: AtlasSnapshot, id: string, value: string, source: Claim['source_kind'], recordedAt: string): Promise<AtlasSnapshot> {
  const message = snapshot.messages.find((item) => item.role === 'user');
  const node = snapshot.nodes.find((item) => item.message_revision_id === message?.revision_id);
  if (!message || !node || !message.parts[0]?.text) throw new Error('source missing');
  const quote = message.parts[0].text;
  const evidence: Evidence = {
    id: `ev_${id}`,
    message_revision_id: message.revision_id,
    node_id: node.id,
    part_index: 0,
    start_cp: 0,
    end_cp: Array.from(quote).length,
    quote,
    quote_sha256: sha256Text(quote),
    relation: 'supports',
    lineage_root_id: `ev_${id}`,
  };
  const claim: Claim = {
    id,
    text: value,
    kind: source === 'assistant_recommendation' ? 'research_finding' : 'decision',
    source_kind: source,
    extraction_method: 'manual',
    modality: source === 'assistant_recommendation' ? 'proposed' : 'asserted',
    scope: { workspace_id: snapshot.workspace.id, project_id: 'project_orion', environment: 'local' },
    subject_id: 'orion',
    predicate: 'architecture.supervisor',
    value,
    cardinality: 'single',
    category: 'architecture',
    evidence_ids: [evidence.id],
    asserted_at: '2026-10-01T00:00:00Z',
    recorded_at: recordedAt,
    validity_kind: 'interval',
    valid_from: '2026-10-01T00:00:00Z',
    valid_to: null,
    validity_basis: 'explicit',
  };
  return { ...snapshot, evidence: [...snapshot.evidence, evidence], claims: [...snapshot.claims, claim] };
}

describe('conflicts', () => {
  it('does not let a newer assistant recommendation replace a user decision', async () => {
    const imported = await importFiles(['chatgpt/01-linear.json']);
    let snapshot = await card(imported.snapshot, 'clm_user', 'Alpha', 'user_decision', '2026-10-26T16:00:00Z');
    snapshot = await card(snapshot, 'clm_assistant', 'Beta', 'assistant_recommendation', '2026-10-26T16:05:00Z');
    const at = { valid_at: '2026-10-26T16:15:00Z', known_at: '2026-10-26T16:15:00Z' };
    expect(projectClaim(snapshot, 'clm_user', at).curation).toBe('candidate');
    expect(projectClaim(snapshot, 'clm_user', at).temporal).toBe('disputed');
    expect(projectClaim(snapshot, 'clm_assistant', at).temporal).toBe('disputed');
    expect(snapshot.relations.filter((relation) => relation.type === 'supersedes')).toHaveLength(0);
    expect([...(detectConflicts(snapshot, at)[0]?.claim_ids ?? [])].sort()).toEqual(['clm_assistant', 'clm_user']);
  });

  it('keeps another environment outside the conflict', async () => {
    const imported = await importFiles(['chatgpt/01-linear.json']);
    let snapshot = await card(imported.snapshot, 'clm_local', 'Alpha', 'user_decision', '2026-10-26T16:00:00Z');
    snapshot = await card(snapshot, 'clm_vps', 'Beta', 'user_decision', '2026-10-26T16:05:00Z');
    const vps = snapshot.claims.find((claim) => claim.id === 'clm_vps');
    if (!vps) throw new Error('missing');
    vps.scope = { ...vps.scope, environment: 'vps' };
    const at = { valid_at: '2026-10-26T16:15:00Z', known_at: '2026-10-26T16:15:00Z' };
    expect(detectConflicts(snapshot, at)).toHaveLength(0);
    expect(projectClaim(snapshot, 'clm_local', at).temporal).toBe('current');
  });

  it('rejects a supersedes cycle and orders equal timestamps by seq', async () => {
    const imported = await importFiles(['chatgpt/01-linear.json']);
    let snapshot = await card(imported.snapshot, 'clm_a', 'Alpha', 'user_decision', '2026-10-26T16:00:00Z');
    snapshot = await card(snapshot, 'clm_b', 'Beta', 'user_decision', '2026-10-26T16:00:00Z');
    const relation = (id: string, from: string, to: string): Relation => ({
      id,
      type: 'revises',
      from_claim_id: from,
      to_claim_id: to,
      effective_at: '2026-10-26T16:00:00Z',
      recorded_at: '2026-10-26T16:00:00Z',
      reason: 'Zyklustest',
    });
    snapshot = { ...snapshot, relations: [relation('rel_ab', 'clm_a', 'clm_b'), relation('rel_ba', 'clm_b', 'clm_a')] };
    const { validateSnapshot } = await import('../../src/store/snapshot');
    expect(() => validateSnapshot(snapshot)).toThrowError(expect.objectContaining({ code: 'RELATION_CYCLE' }));
    const accept = (id: string, target: string, seq: number): ReviewEvent => ({
      id,
      target_type: 'claim',
      target_id: target,
      action: seq === 1 ? 'reject' : 'accept',
      actor_id: 'local-user',
      recorded_at: '2026-10-26T16:02:00Z',
      reason: 'gleiche Zeit',
      evidence_ids: [],
      context_checked: null,
      branch_checked: null,
      sensitivity: null,
      review_due_at: seq === 1 ? null : '2027-04-24T16:00:00Z',
      seq,
    });
    const base = await card(imported.snapshot, 'clm_seq', 'Alpha', 'user_decision', '2026-10-26T16:00:00Z');
    const reviewed = appendReview(appendReview(base, accept('review_reject', 'clm_seq', 1)), accept('review_accept', 'clm_seq', 2));
    expect(projectClaim(reviewed, 'clm_seq', { valid_at: '2026-10-26T16:15:00Z', known_at: '2026-10-26T16:15:00Z' }).curation).toBe('accepted');
  });
});
