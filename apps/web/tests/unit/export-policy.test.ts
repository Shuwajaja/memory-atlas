import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { approveMemorySet, evaluateEligibility, exportMemorySet, prepareMemorySet } from '../../src/domain/export';
import type { AtlasSnapshot, Clock, MemorySetDraft } from '../../src/domain/models.generated';
import { sha256Text } from '../../src/domain/sha256';
import { exampleRoot } from '../helpers';

const demo = JSON.parse(readFileSync(resolve(exampleRoot, 'demo.atlas.json'), 'utf8')) as AtlasSnapshot;
const envelope = JSON.parse(readFileSync(resolve(exampleRoot, 'memory-export.json'), 'utf8')) as { payload_sha256: string };
const markdown = readFileSync(resolve(exampleRoot, 'MEMORY.md'));
const jsonFile = readFileSync(resolve(exampleRoot, 'memory-export.json'));
const manifest = JSON.parse(readFileSync(resolve(exampleRoot, 'export-manifest.json'), 'utf8')) as { json_sha256: string; markdown_sha256: string };
const draft = demo.memory_sets[0];
if (!draft) throw new Error('set missing');
const clock: Clock = { now: () => '2026-10-26T16:15:00Z' };

describe('export policy', () => {
  it('reproduces the synthetic memory bytes and blocks the documented cases', () => {
    const preview = prepareMemorySet(demo, draft, clock);
    expect(preview.payload_sha256).toBe(envelope.payload_sha256);
    expect(Buffer.from(preview.json_bytes).equals(jsonFile)).toBe(true);
    expect(Buffer.from(preview.markdown_bytes).equals(markdown)).toBe(true);
    expect(preview.json_sha256).toBe(manifest.json_sha256);
    expect(preview.markdown_sha256).toBe(manifest.markdown_sha256);
    const at = { valid_at: clock.now(), known_at: clock.now() };
    expect(evaluateEligibility(demo, 'clm_alpha', draft, at).allowed).toBe(false);
    expect(evaluateEligibility(demo, 'clm_private', draft, at).reasons).toContain('SENSITIVE_CONTENT');
    expect(evaluateEligibility(demo, 'clm_gamma', draft, at).reasons).toContain('RESEARCH_NOTES_NOT_ENABLED');
    expect(evaluateEligibility(demo, 'clm_tests', draft, at).reasons).toContain('EXECUTION_EVIDENCE_REQUIRED');
    const secret = 'SAMPLE-NOT-A-REAL-SECRET';
    expect(Buffer.from(preview.json_bytes).toString('utf8')).not.toContain(secret);
    expect(Buffer.from(preview.markdown_bytes).toString('utf8')).not.toContain(secret);
  });

  it('fails 51 claims and 16001 text bytes without returning a shortened payload', () => {
    const ids = Array.from({ length: 51 }, (_, index) => `clm_${index}`);
    const tooMany: MemorySetDraft = { ...draft, id: 'set_many', selected_claim_ids: ids, max_claims: 50 };
    const many = { ...demo, memory_sets: [...demo.memory_sets, tooMany] };
    expect(() => prepareMemorySet(many, tooMany, clock)).toThrowError(expect.objectContaining({ code: 'LIMIT_CLAIMS' }));
    const oversized: MemorySetDraft = {
      ...draft,
      id: 'set_over',
      selected_claim_ids: ['clm_beta'],
      max_text_bytes: 16000,
      max_claims: 50,
    };
    const snapshot: AtlasSnapshot = { ...demo, memory_sets: [...demo.memory_sets, oversized] };
    const huge = structuredClone(snapshot);
    const claim = huge.claims.find((item) => item.id === 'clm_beta');
    if (!claim) throw new Error('claim missing');
    claim.text = 'A'.repeat(16001);
    expect(() => prepareMemorySet(huge, oversized, clock)).toThrowError(expect.objectContaining({ code: 'LIMIT_TEXT' }));
  });

  it('uses the real now rather than a historical filter', () => {
    const alphaDraft: MemorySetDraft = { ...draft, id: 'set_alpha', selected_claim_ids: ['clm_alpha'] };
    const withAlpha = { ...demo, memory_sets: [...demo.memory_sets, alphaDraft] };
    const historical = evaluateEligibility(withAlpha, 'clm_alpha', alphaDraft, { valid_at: '2026-06-01T00:00:00Z', known_at: '2026-10-26T16:15:00Z' });
    expect(historical.allowed).toBe(true);
    const preview = prepareMemorySet(demo, draft, clock);
    expect(preview.payload.entries.map((entry) => entry.claim_id)).toEqual(['clm_beta', 'clm_language']);
    expect(preview.payload.entries.map((entry) => entry.claim_id)).not.toContain('clm_alpha');
    expect(preview.payload.generated_at).toBe(clock.now());
  });

  it('blocks download when the state, recipient or approval bytes change', () => {
    const preview = prepareMemorySet(demo, draft, clock);
    const session = { id: 'ses_test' };
    const approval = approveMemorySet(preview, 'local-user', clock, session);
    const files = exportMemorySet(demo, preview, approval, clock, session);
    expect(sha256Text(Buffer.from(files.json_bytes).toString('utf8'))).toBe(preview.json_sha256);
    const mutated = structuredClone(demo);
    mutated.claims.push(structuredClone(mutated.claims[0]!));
    mutated.claims[mutated.claims.length - 1]!.id = 'clm_extra';
    expect(() => exportMemorySet(mutated, preview, approval, clock, session)).toThrowError(expect.objectContaining({ code: 'STATE_CHANGED' }));
    const otherSession = exportMemorySet(demo, preview, { ...approval, session_id: 'ses_other' }, clock, { id: 'ses_other' });
    expect(otherSession.json_bytes).toBe(preview.json_bytes);
    expect(() => exportMemorySet(demo, preview, approval, clock, { id: 'ses_other' })).toThrowError(expect.objectContaining({ code: 'SESSION_MISMATCH' }));
    expect(() => approveMemorySet(preview, 'local-user', { now: () => '2026-10-26T16:31:00Z' }, session)).toThrowError(expect.objectContaining({ code: 'PREVIEW_EXPIRED' }));
  });
});
