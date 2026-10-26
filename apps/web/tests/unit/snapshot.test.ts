import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AtlasError } from '../../src/domain/errors';
import { canonicalize } from '../../src/domain/canonical';
import { sha256Text } from '../../src/domain/sha256';
import type { AtlasSnapshot } from '../../src/domain/models.generated';
import { MemoryStore } from '../../src/store/memory-store';
import { emptySnapshot, snapshotDigest, stateDigest, validateSnapshot } from '../../src/store/snapshot';
import { exampleRoot } from '../helpers';

const demo = JSON.parse(readFileSync(resolve(exampleRoot, 'demo.atlas.json'), 'utf8')) as AtlasSnapshot;
const manifest = JSON.parse(readFileSync(resolve(exampleRoot, 'export-manifest.json'), 'utf8')) as { state_sha256: string };

describe('snapshot validation', () => {
  it('accepts the synthetic demo and binds the published state digest', () => {
    const snapshot = validateSnapshot(demo);
    expect(snapshot.claims.map((claim) => claim.id)).toEqual(['clm_alpha', 'clm_beta', 'clm_tests', 'clm_language', 'clm_gamma', 'clm_private']);
    expect(stateDigest(snapshot, 'set_orion_ready')).toBe(manifest.state_sha256);
    expect(snapshot.messages[0]?.parts[0]?.text).toContain('Alpha');
  });

  it('rejects an unknown major version and a privileged field', () => {
    const future = structuredClone(demo) as AtlasSnapshot;
    future.schema_version = '2.0.0' as '1.0.0';
    expect(() => validateSnapshot(future)).toThrowError(AtlasError);
    try {
      validateSnapshot(future);
    } catch (error) {
      expect(error).toBeInstanceOf(AtlasError);
      expect((error as AtlasError).code).toBe('UNKNOWN_MAJOR_VERSION');
    }
    const forged = structuredClone(demo) as unknown as { claims: Record<string, unknown>[] };
    forged.claims[0] = { ...forged.claims[0], execution_verified: true };
    try {
      validateSnapshot(forged);
      throw new Error('privileged field was accepted');
    } catch (error) {
      expect(error).toBeInstanceOf(AtlasError);
      expect((error as AtlasError).code).toBe('PRIVILEGED_FIELD');
    }
  });

  it('replaces the store only when the expected digest matches', () => {
    const store = new MemoryStore(emptySnapshot('2026-10-26T16:00:00Z'));
    const original = store.currentSha256();
    const next = structuredClone(store.read());
    next.workspace = { ...next.workspace, title: 'Geändert' };
    expect(() => store.replace('0'.repeat(64), next)).toThrowError(AtlasError);
    expect(store.currentSha256()).toBe(original);
    expect(store.read().workspace.title).toBe('Arbeitsbereich');
    store.replace(original, validateSnapshot(next));
    expect(store.read().workspace.title).toBe('Geändert');
    expect(store.currentSha256()).not.toBe(original);
  });

  it('gives the same digest when keys were inserted in another order', () => {
    const first = validateSnapshot(demo);
    const reordered = JSON.parse(canonicalize(first)) as AtlasSnapshot;
    expect(snapshotDigest(validateSnapshot(reordered))).toBe(snapshotDigest(first));
    expect(sha256Text(canonicalize({ z: '😀', a: 'A' }))).toBe(sha256Text(canonicalize({ a: 'A', z: '😀' })));
  });
});
