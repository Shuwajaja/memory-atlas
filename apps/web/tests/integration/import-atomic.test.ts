import { describe, expect, it } from 'vitest';
import { AtlasError } from '../../src/domain/errors';
import { parseImport, commitImport } from '../../src/importers/normalize';
import { MemoryStore } from '../../src/store/memory-store';
import { emptySnapshot } from '../../src/store/snapshot';
import { defaultOptions, fixedClock, fixtureFile, importFiles } from '../helpers';

describe('atomic import', () => {
  it('FI06 keeps the old revision when the same logical message changes', async () => {
    const first = await importFiles(['chatgpt/01-linear.json']);
    const oldRevision = first.snapshot.messages.find((message) => message.external_id === 'm1')?.revision_id;
    const second = await importFiles(['chatgpt/06-revision.json'], {}, first.snapshot);
    const logical = new Set(second.snapshot.messages.map((message) => message.logical_id));
    const m1 = second.snapshot.messages.filter((message) => message.external_id === 'm1');
    expect(logical.size).toBe(2);
    expect(second.snapshot.messages).toHaveLength(3);
    expect(m1).toHaveLength(2);
    expect(m1.map((message) => message.revision_id)).toContain(oldRevision);
    expect(new Set(m1.map((message) => message.revision_id)).size).toBe(2);
  });

  it('FI09 adds no logical message or revision on an identical reimport', async () => {
    const first = await importFiles(['chatgpt/01-linear.json']);
    const second = await parseImport(
      [fixtureFile('chatgpt/01-linear.json')],
      first.snapshot,
      defaultOptions,
      fixedClock,
      new AbortController().signal,
    );
    expect(second.report.new_logical_messages).toBe(0);
    expect(second.report.new_revisions).toBe(0);
    const recorded = first.snapshot.messages.map((message) => message.recorded_at);
    commitImport(first.store, second);
    expect(first.store.read().messages.map((message) => message.recorded_at)).toEqual(recorded);
  });

  it('leaves the store digest unchanged when import fails or is aborted', async () => {
    const store = new MemoryStore(emptySnapshot(fixedClock.now()));
    const before = store.currentSha256();
    const controller = new AbortController();
    controller.abort();
    await expect(parseImport([fixtureFile('chatgpt/01-linear.json')], store.read(), defaultOptions, fixedClock, controller.signal)).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(parseImport([fixtureFile('duplicate-key.txt')], store.read(), defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({ code: 'DUPLICATE_JSON_KEY' });
    expect(store.currentSha256()).toBe(before);
    expect(store.read().messages).toHaveLength(0);
  });

  it('rejects a second commit against a stale base', async () => {
    const first = await importFiles(['chatgpt/01-linear.json']);
    const staged = await parseImport([fixtureFile('chatgpt/02-branches.json')], first.snapshot, defaultOptions, fixedClock, new AbortController().signal);
    const changed = structuredClone(first.store.read());
    changed.workspace = { ...changed.workspace, title: 'zwischenzeitlich geändert' };
    first.store.replace(first.store.currentSha256(), changed);
    expect(() => commitImport(first.store, staged)).toThrow(AtlasError);
    expect(first.store.read().conversations).toHaveLength(1);
  });

  it('does not create a revision when only the file name changes', async () => {
    const first = await importFiles(['chatgpt/01-linear.json']);
    const file = fixtureFile('chatgpt/01-linear.json');
    const renamed = { name: 'renamed-linear.json', bytes: file.bytes };
    const staged = await parseImport([renamed], first.snapshot, defaultOptions, fixedClock, new AbortController().signal);
    expect(staged.report.new_revisions).toBe(0);
    expect(staged.report.new_logical_messages).toBe(0);
  });

  it('keeps the same provider ids apart when the namespace differs', async () => {
    const first = await importFiles(['chatgpt/01-linear.json'], { namespace: 'alpha' });
    const second = await importFiles(['chatgpt/01-linear.json'], { namespace: 'beta' }, first.snapshot);
    expect(new Set(second.snapshot.messages.map((message) => message.logical_id)).size).toBe(4);
  });
});
