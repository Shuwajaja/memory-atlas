import { describe, expect, it } from 'vitest';
import { sha256Text } from '../../src/domain/sha256';
import { sliceCodePoints, sourceContextChanged, utf16OffsetToCodePoint, validateEvidence } from '../../src/domain/provenance';
import { appendReview, projectClaim } from '../../src/domain/projection';
import type { AtlasSnapshot, Evidence, ReviewEvent } from '../../src/domain/models.generated';
import { importFiles } from '../helpers';

const sample = 'A😀éB';

describe('evidence spans', () => {
  it('reads the emoji at code points [1,2) and rejects a shifted span', () => {
    expect(sliceCodePoints(sample, 1, 2)).toBe('😀');
    expect(sliceCodePoints(sample, 2, 3)).toBe('e');
    expect(utf16OffsetToCodePoint(sample, 1)).toBe(1);
    expect(utf16OffsetToCodePoint(sample, 2)).toBeNull();
  });

  it('rejects the wrong part, a cross-part quote and a shifted emoji span', async () => {
    const { snapshot } = await importFiles(['chatgpt/04-multimodal.json']);
    const message = snapshot.messages.find((item) => item.external_id === 'm1');
    const node = snapshot.nodes.find((item) => item.message_revision_id === message?.revision_id);
    if (!message || !node) throw new Error('fixture message missing');
    message.parts = [
      { kind: 'text', text: sample, label: null },
      { kind: 'text', text: 'zweite', label: null },
    ];
    message.revision_id = 'rev_test';
    node.message_revision_id = 'rev_test';
    const evidence = (start: number, end: number, quote: string, partIndex: number): Evidence => ({
      id: 'ev_test',
      message_revision_id: 'rev_test',
      part_index: partIndex,
      start_cp: start,
      end_cp: end,
      quote,
      quote_sha256: sha256Text(quote),
      relation: 'supports',
      lineage_root_id: 'ev_test',
      node_id: node.id,
    });
    expect(validateEvidence(snapshot, evidence(1, 2, '😀', 0)).valid).toBe(true);
    expect(validateEvidence(snapshot, evidence(2, 3, '😀', 0)).reasons).toContain('QUOTE_MISMATCH');
    expect(validateEvidence(snapshot, evidence(0, 1, 'z', 1)).valid).toBe(true);
    expect(validateEvidence(snapshot, evidence(1, 2, '😀', 1)).reasons).toContain('QUOTE_MISMATCH');
  });

  it('does not raise evidence status when a card is only accepted', async () => {
    const imported = await importFiles(['chatgpt/01-linear.json']);
    const message = imported.snapshot.messages.find((item) => item.external_id === 'm1');
    const node = imported.snapshot.nodes.find((item) => item.message_revision_id === message?.revision_id);
    if (!message || !node || !message.parts[0]?.text) throw new Error('message missing');
    const quote = message.parts[0].text;
    const evidence: Evidence = {
      id: 'ev_manual',
      message_revision_id: message.revision_id,
      part_index: 0,
      start_cp: 0,
      end_cp: Array.from(quote).length,
      quote,
      quote_sha256: sha256Text(quote),
      relation: 'supports',
      lineage_root_id: 'ev_manual',
      node_id: node.id,
    };
    const claimSnapshot: AtlasSnapshot = {
      ...imported.snapshot,
      evidence: [evidence],
      claims: [{
        id: 'clm_manual',
        text: 'Alpha bleibt der Vorschlag.',
        kind: 'decision',
        source_kind: 'user_decision',
        extraction_method: 'manual',
        modality: 'asserted',
        scope: { workspace_id: imported.snapshot.workspace.id, project_id: 'project_orion', environment: 'local' },
        subject_id: 'orion',
        predicate: 'architecture.supervisor',
        value: 'Alpha',
        cardinality: 'single',
        category: 'decisions',
        evidence_ids: ['ev_manual'],
        asserted_at: message.sent_at,
        recorded_at: '2026-10-26T16:00:00Z',
        validity_kind: 'interval',
        valid_from: '2026-05-01T10:00:00Z',
        valid_to: null,
        validity_basis: 'explicit',
      }],
    };
    const event: ReviewEvent = {
      id: 'review_accept',
      target_type: 'claim',
      target_id: 'clm_manual',
      action: 'accept',
      actor_id: 'local-user',
      recorded_at: '2026-10-26T16:01:00Z',
      reason: 'Inhalt geprüft, Quelle noch nicht.',
      evidence_ids: [],
      context_checked: null,
      branch_checked: null,
      sensitivity: null,
      review_due_at: '2027-04-24T16:00:00Z',
      seq: 1,
    };
    const reviewed = appendReview(claimSnapshot, event);
    const projection = projectClaim(reviewed, 'clm_manual', { valid_at: '2026-10-26T16:15:00Z', known_at: '2026-10-26T16:15:00Z' });
    expect(projection.curation).toBe('accepted');
    expect(projection.evidence_status).toBe('unverified');
    expect(projection.evidence_status).not.toBe('execution_verified');
  });

  it('marks the source context changed when a later revision or a non-selected branch replaces the evidence', async () => {
    const { snapshot } = await importFiles(['chatgpt/01-linear.json']);
    const message = snapshot.messages.find((item) => item.external_id === 'm1');
    const node = snapshot.nodes.find((item) => item.message_revision_id === message?.revision_id);
    const quote = message?.parts[0]?.text;
    if (!message || !node || !quote) throw new Error('fixture message missing');
    const evidence: Evidence = {
      id: 'ev_context',
      message_revision_id: message.revision_id,
      part_index: 0,
      start_cp: 0,
      end_cp: Array.from(quote).length,
      quote,
      quote_sha256: sha256Text(quote),
      relation: 'supports',
      lineage_root_id: 'ev_context',
      node_id: node.id,
    };
    expect(validateEvidence(snapshot, evidence).valid).toBe(true);
    expect(sourceContextChanged(snapshot, evidence)).toBe(false);
    const revised = structuredClone(snapshot);
    revised.messages.push({ ...message, revision_id: 'rev_later' });
    expect(sourceContextChanged(revised, evidence)).toBe(true);
    const branched = structuredClone(snapshot);
    const current = branched.nodes.find((item) => item.id === node.id);
    if (!current) throw new Error('node missing');
    current.branch_membership = 'alternate';
    expect(sourceContextChanged(branched, evidence)).toBe(true);
  });
});
