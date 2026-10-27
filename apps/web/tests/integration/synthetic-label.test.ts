import { describe, expect, it } from 'vitest';
import { parseImport } from '../../src/importers/normalize';
import { AtlasService } from '../../src/services/atlas-service';
import { defaultOptions, fixtureFile, fixedClock } from '../helpers';

describe('synthetic label', () => {
  it('stays on after an import is committed into the demo workspace', async () => {
    const service = new AtlasService();
    service.loadDemo();
    const before = service.getState().snapshot.conversations.length;
    const staged = await parseImport(
      [fixtureFile('chatgpt/01-linear.json')],
      service.getState().snapshot,
      defaultOptions,
      fixedClock,
      new AbortController().signal,
    );
    service.stageImport(staged);
    service.commitImport();
    const state = service.getState();
    expect(state.demo).toBe(true);
    expect(state.snapshot.workspace.title).toContain('synthetisch');
    expect(state.snapshot.conversations.length).toBeGreaterThan(before);
  });

  it('does not mark a fresh import as the demo', async () => {
    const service = new AtlasService();
    const staged = await parseImport(
      [fixtureFile('chatgpt/01-linear.json')],
      service.getState().snapshot,
      defaultOptions,
      fixedClock,
      new AbortController().signal,
    );
    service.stageImport(staged);
    service.commitImport();
    expect(service.getState().demo).toBe(false);
    expect(service.getState().snapshot.workspace.title).toBe('Arbeitsbereich');
  });
});
