import { describe, expect, it } from 'vitest';
import { draftMatchesStored } from '../../src/domain/export';
import { isSyntheticSnapshot } from '../../src/store/snapshot';
import { dataOrigin, originFooter, originMark } from '../../src/features/overview/data-origin';
import { emptySnapshot } from '../../src/store/snapshot';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AtlasSnapshot } from '../../src/domain/models.generated';
import { exampleRoot } from '../helpers';

const demo = JSON.parse(readFileSync(resolve(exampleRoot, 'demo.atlas.json'), 'utf8')) as AtlasSnapshot;

describe('sample and inventory labels', () => {
  it('keeps the empty workspace, the demo and an own import apart', () => {
    const empty = emptySnapshot('2026-10-26T16:00:00Z');
    expect(isSyntheticSnapshot(empty)).toBe(false);
    expect(dataOrigin(empty, false)).toBe('illustration');
    expect(originMark('illustration')).toBe('PRIVATE VORSCHAU · BEISPIELDATEN');
    expect(originFooter('illustration')).toBe('Beispieldaten · nicht der geladene Bestand');

    expect(isSyntheticSnapshot(demo)).toBe(true);
    expect(dataOrigin(demo, true)).toBe('synthetic');
    expect(originMark('synthetic')).toBe('DEMO · SYNTHETISCH');
    expect(originFooter('synthetic')).toBe('Demo · synthetisch · kein echter Chat');

    const own = emptySnapshot('2026-10-26T16:00:00Z');
    own.conversations.push(demo.conversations[0]!);
    expect(dataOrigin(own, false)).toBe('own');
    expect(originFooter('own')).toBe('Eigener Bestand · lokaler JSON-Import');
    expect(originMark('own')).toBe('GELADENER BESTAND');
  });

  it('treats an unsaved recipient change as not stored', () => {
    const draft = demo.memory_sets[0];
    if (!draft) throw new Error('set missing');
    expect(draftMatchesStored(demo, draft)).toBe(true);
    expect(draftMatchesStored(demo, { ...draft, scope: { ...draft.scope, consumer_id: 'anderer-empfaenger' } })).toBe(false);
  });
});
