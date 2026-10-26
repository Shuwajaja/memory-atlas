import { describe, expect, it } from 'vitest';
import { AtlasError } from '../../src/domain/errors';
import { parseImport } from '../../src/importers/normalize';
import { MemoryStore } from '../../src/store/memory-store';
import { emptySnapshot } from '../../src/store/snapshot';
import { defaultOptions, fixedClock, fixtureFile } from '../helpers';

describe('claude profile gate', () => {
  it('FI10 refuses an unapproved profile and does not change the store', async () => {
    const store = new MemoryStore(emptySnapshot(fixedClock.now()));
    const before = store.currentSha256();
    await expect(parseImport([fixtureFile('claude/01-content.json')], store.read(), defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({
      code: 'PROFILE_NOT_APPROVED',
    });
    expect(store.currentSha256()).toBe(before);
  });

  it('FI11 does not duplicate text that is also present as a content block', async () => {
    const staged = await parseImport(
      [fixtureFile('claude/01-content.json')],
      emptySnapshot(fixedClock.now()),
      { ...defaultOptions, profile: 'claude-chat-messages-v1', claude_profile_approved: true },
      fixedClock,
      new AbortController().signal,
    );
    expect(staged.report.new_logical_messages).toBe(2);
    const first = staged.next_snapshot.messages.find((message) => message.external_id === 'c1');
    expect(first?.parts.filter((part) => part.kind === 'text')).toHaveLength(1);
    expect(first?.parts.filter((part) => part.kind !== 'text')).toHaveLength(1);
    expect(staged.next_snapshot.nodes.every((node) => node.branch_membership === 'unknown')).toBe(true);
    expect(staged.report.placeholder_parts).toBe(1);
  });

  it('FI12 rejects an unknown envelope', async () => {
    const store = new MemoryStore(emptySnapshot(fixedClock.now()));
    await expect(parseImport([fixtureFile('claude/02-unknown.json')], store.read(), defaultOptions, fixedClock, new AbortController().signal)).rejects.toBeInstanceOf(AtlasError);
    await expect(parseImport([fixtureFile('claude/02-unknown.json')], store.read(), defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({
      code: 'UNSUPPORTED_PROFILE',
    });
    expect(store.read().messages).toHaveLength(0);
  });
});
