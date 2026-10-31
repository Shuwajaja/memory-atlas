import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateEligibility, prepareMemorySet } from '../../src/domain/export';
import type { AtlasSnapshot, Claim, MemorySetDraft } from '../../src/domain/models.generated';
import { exampleRoot } from '../helpers';

const demo = JSON.parse(readFileSync(resolve(exampleRoot, 'demo.atlas.json'), 'utf8')) as AtlasSnapshot;
const draft = demo.memory_sets[0]!;
const at = { valid_at: '2026-10-26T16:15:00Z', known_at: '2026-10-26T16:15:00Z' };

type Case = { name: string; reason: string; mutate: (claim: Claim, snapshot: AtlasSnapshot) => void };

function snapshotFor(mutate: Case['mutate']): AtlasSnapshot {
  const snapshot = structuredClone(demo);
  const claim = snapshot.claims.find((item) => item.id === 'clm_beta')!;
  mutate(claim, snapshot);
  return snapshot;
}

function addReview(snapshot: AtlasSnapshot, action: 'reject' | 'exclude' | 'accept', due: string | null = null): void {
  snapshot.reviews.push({
    id: `synthetic_${action}`,
    seq: snapshot.reviews.length + 1,
    target_type: 'claim',
    target_id: 'clm_beta',
    action,
    actor_id: 'synthetic',
    recorded_at: '2026-10-26T16:12:00Z',
    reason: 'synthetic matrix setup',
    evidence_ids: [],
    context_checked: null,
    branch_checked: null,
    sensitivity: null,
    review_due_at: due,
  });
}

const cases: Case[] = [
  { name: 'candidate / not accepted', reason: 'NOT_ACCEPTED', mutate: (_claim, snapshot) => { snapshot.reviews = snapshot.reviews.filter((review) => !(review.target_id === 'clm_beta' && review.action === 'accept')); } },
  { name: 'rejected', reason: 'NOT_ACCEPTED', mutate: (_claim, snapshot) => addReview(snapshot, 'reject') },
  { name: 'excluded (curation is not accepted)', reason: 'NOT_ACCEPTED', mutate: (_claim, snapshot) => addReview(snapshot, 'exclude') },
  { name: 'future valid_from', reason: 'NOT_CURRENT', mutate: (claim) => { claim.valid_from = '2026-12-01T00:00:00Z'; } },
  { name: 'expired valid_to', reason: 'NOT_CURRENT', mutate: (claim) => { claim.valid_to = '2026-10-01T00:00:00Z'; } },
  { name: 'unknown validity time', reason: 'NOT_CURRENT', mutate: (claim) => { claim.validity_kind = 'unknown'; claim.validity_basis = 'unknown'; } },
  { name: 'missing review', reason: 'REVIEW_MISSING', mutate: (_claim, snapshot) => { snapshot.reviews = snapshot.reviews.filter((review) => !(review.target_id === 'clm_beta' && review.action === 'accept')); } },
  { name: 'review due', reason: 'REVIEW_DUE', mutate: (_claim, snapshot) => addReview(snapshot, 'accept', '2026-10-26T16:14:00Z') },
  { name: 'conflict', reason: 'CONFLICT', mutate: (claim) => { claim.predicate = 'ui.language'; claim.value = 'Gamma'; } },
  { name: 'open supersession', reason: 'OPEN_SUPERSESSION', mutate: (_claim, snapshot) => { snapshot.relations.push({ id: 'rel_matrix_open', type: 'supersedes', from_claim_id: 'clm_beta', to_claim_id: 'clm_language', effective_at: null, recorded_at: '2026-10-26T16:12:00Z', reason: 'synthetic matrix setup' }); } },
  { name: 'workspace scope mismatch', reason: 'SCOPE_MISMATCH', mutate: (claim) => { claim.scope.workspace_id = 'ws_other'; } },
  { name: 'project scope mismatch', reason: 'SCOPE_MISMATCH', mutate: (claim) => { claim.scope.project_id = 'project_other'; } },
  { name: 'environment scope mismatch', reason: 'SCOPE_MISMATCH', mutate: (claim) => { claim.scope.environment = 'production'; } },
  { name: 'secret sensitivity', reason: 'SENSITIVE_CONTENT', mutate: (_claim, snapshot) => { snapshot.reviews.push({ ...snapshot.reviews.find((review) => review.target_id === 'clm_beta' && review.action === 'classify_privacy')!, id: 'matrix_secret', seq: snapshot.reviews.length + 1, sensitivity: 'secret' }); } },
  { name: 'unknown sensitivity', reason: 'SENSITIVE_CONTENT', mutate: (_claim, snapshot) => { snapshot.reviews = snapshot.reviews.filter((review) => !(review.target_id === 'clm_beta' && review.action === 'classify_privacy')); } },
  { name: 'tool observation', reason: 'EXECUTION_EVIDENCE_REQUIRED', mutate: (claim) => { claim.source_kind = 'tool_observation'; } },
  { name: 'runtime predicate', reason: 'EXECUTION_EVIDENCE_REQUIRED', mutate: (claim) => { claim.predicate = 'runtime.version'; } },
  { name: 'execution predicate', reason: 'EXECUTION_EVIDENCE_REQUIRED', mutate: (claim) => { claim.predicate = 'execution.status'; } },
  ...(['hypothetical', 'negated', 'quoted', 'uncertain'] as const).map((modality) => ({ name: modality, reason: 'MODALITY_BLOCKED', mutate: (claim: Claim) => { claim.modality = modality; } })),
  { name: 'unchecked branch', reason: 'BRANCH_UNCHECKED', mutate: (claim, snapshot) => { const evidence = snapshot.evidence.find((item) => item.id === claim.evidence_ids[0]); const node = snapshot.nodes.find((item) => item.id === evidence?.node_id); if (!node) throw new Error('matrix branch node missing'); node.branch_membership = 'alternate'; snapshot.reviews = snapshot.reviews.filter((review) => !(review.target_id === claim.id && review.action === 'confirm_source')); } },
];

describe('export eligibility matrix', () => {
  it.each(cases)('$name yields the actual policy reason $reason', ({ reason, mutate }) => {
    const result = evaluateEligibility(snapshotFor(mutate), 'clm_beta', draft, at);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain(reason);
  });

  it('allows the accepted clm_beta control case', () => {
    expect(evaluateEligibility(demo, 'clm_beta', draft, at)).toEqual({ allowed: true, reasons: [] });
  });

  it('uses the review deadline before the 24-hour approval cap', () => {
    const snapshot = structuredClone(demo);
    const storedDraft: MemorySetDraft = { ...draft, id: 'set_matrix_review_deadline', selected_claim_ids: ['clm_beta'] };
    snapshot.memory_sets = [...snapshot.memory_sets, storedDraft];
    const review = snapshot.reviews.find((item) => item.target_id === 'clm_beta' && item.action === 'accept')!;
    review.review_due_at = '2026-10-26T18:00:00Z';
    const preview = prepareMemorySet(snapshot, storedDraft, { now: () => '2026-10-26T16:15:00Z' });
    expect(preview.payload.expires_at).toBe('2026-10-26T18:00:00Z');
  });
});
