import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateEligibility } from '../../src/domain/export';
import type { AtlasSnapshot } from '../../src/domain/models.generated';
import { projectClaim, visibleClaimIds } from '../../src/domain/projection';
import { exampleRoot } from '../helpers';

const demo = JSON.parse(readFileSync(resolve(exampleRoot, 'demo.atlas.json'), 'utf8')) as AtlasSnapshot;
const expected = JSON.parse(readFileSync(resolve(exampleRoot, 'expected-projections.json'), 'utf8')) as {
  valid_at: string;
  known_at: string;
  claims: Record<string, { curation?: string; temporal?: string; evidence_status?: string; export_allowed: boolean; reason?: string }>;
  historical_known_before_import: { known_at: string; visible_claims: number };
  effective_boundary: { valid_at: string; known_at: string; current_supervisor_claim: string };
};

const at = { valid_at: expected.valid_at, known_at: expected.known_at };
const draft = demo.memory_sets[0];
if (!draft) throw new Error('demo set missing');

describe('demo projections', () => {
  it('matches the published curation, time and export expectations', () => {
    for (const [id, spec] of Object.entries(expected.claims)) {
      const projection = projectClaim(demo, id, at);
      if (spec.curation) expect(projection.curation).toBe(spec.curation);
      if (spec.temporal) expect(projection.temporal).toBe(spec.temporal);
      if (spec.evidence_status) expect(projection.evidence_status).toBe(spec.evidence_status);
      expect(projection.evidence_status).not.toBe('execution_verified');
      const eligibility = evaluateEligibility(demo, id, draft, at);
      expect(eligibility.allowed).toBe(spec.export_allowed);
      if (spec.reason) expect(eligibility.reasons).toContain(spec.reason);
    }
  });

  it('hides claims that were not yet recorded', () => {
    const visible = visibleClaimIds(demo, expected.historical_known_before_import.known_at);
    expect(visible).toHaveLength(expected.historical_known_before_import.visible_claims);
  });

  it('makes Beta current exactly at the replacement instant and Alpha before it', () => {
    const boundary = { valid_at: expected.effective_boundary.valid_at, known_at: expected.effective_boundary.known_at };
    const current = demo.claims.filter((claim) => claim.predicate === 'architecture.supervisor' && projectClaim(demo, claim.id, boundary).temporal === 'current');
    expect(current.map((claim) => claim.id)).toEqual([expected.effective_boundary.current_supervisor_claim]);
    const before = { valid_at: '2026-10-23T09:59:59Z', known_at: boundary.known_at };
    expect(projectClaim(demo, 'clm_alpha', before).temporal).toBe('current');
    expect(projectClaim(demo, 'clm_beta', before).temporal).toBe('future');
    expect(projectClaim(demo, 'clm_alpha', boundary).temporal).toBe('superseded');
  });

  it('treats a due review as due rather than expired', () => {
    const due = projectClaim(demo, 'clm_tests', { valid_at: '2026-11-02T16:00:00Z', known_at: '2026-11-02T16:00:00Z' });
    expect(due.freshness).toBe('due');
    expect(due.temporal).not.toBe('expired');
    expect(due.reasons).toContain('REVIEW_DUE');
  });
});
