import { describe, expect, it } from 'vitest';
import { prettyJson } from '../../src/domain/export';
import { parseJsonText } from '../../src/importers/json-scan';
import type { AtlasSnapshot } from '../../src/domain/models.generated';
import { MemoryStore } from '../../src/store/memory-store';
import { validateSnapshot } from '../../src/store/snapshot';
import { importFiles } from '../helpers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { exampleRoot } from '../helpers';

describe('project roundtrip', () => {
  it('keeps ids, revisions, evidence and reviews, but not an active approval', async () => {
    const demo = validateSnapshot(JSON.parse(readFileSync(resolve(exampleRoot, 'demo.atlas.json'), 'utf8')) as AtlasSnapshot);
    const downloaded = prettyJson(demo);
    const opened = validateSnapshot(parseJsonText(downloaded).value);
    expect(opened.messages.map((message) => message.revision_id)).toEqual(demo.messages.map((message) => message.revision_id));
    expect(opened.evidence).toEqual(demo.evidence);
    expect(opened.reviews.map((review) => review.id)).toEqual(demo.reviews.map((review) => review.id));
    expect(opened.export_history).toEqual([]);
    const store = new MemoryStore(opened);
    expect(store.read().claims.map((claim) => claim.id)).toEqual(demo.claims.map((claim) => claim.id));
    const imported = await importFiles(['chatgpt/01-linear.json']);
    const withHistory: AtlasSnapshot = {
      ...imported.snapshot,
      export_history: [{
        id: 'hist_1',
        memory_set_id: 'set_missing',
        payload_sha256: 'a'.repeat(64),
        json_sha256: 'b'.repeat(64),
        markdown_sha256: 'c'.repeat(64),
        approved_at: '2026-10-26T16:00:00Z',
        expires_at: '2026-10-27T16:00:00Z',
        actor_id: 'imported',
      }],
    };
    expect(() => validateSnapshot(withHistory)).toThrow();
  });
});
