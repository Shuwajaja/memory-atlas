import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AtlasError } from '../../src/domain/errors';
import { parseClaudeDocument } from '../../src/importers/claude';
import { detectProfile } from '../../src/importers/detect';
import { parseImport } from '../../src/importers/normalize';
import { MemoryStore } from '../../src/store/memory-store';
import { emptySnapshot } from '../../src/store/snapshot';
import { defaultOptions, fixedClock, fixtureFile, repoRoot } from '../helpers';

const syntheticName = 'SYNTHETIC-account-export.json';
const syntheticBytes = new Uint8Array(readFileSync(resolve(import.meta.dirname, '../fixtures/claude', syntheticName)));

describe('claude profile gate', () => {
  it('decodes the explicitly invented SYNTHETIC fixture without granting profile approval', () => {
    const document = JSON.parse(new TextDecoder().decode(syntheticBytes));
    expect(document[0].SYNTHETIC).toContain('Vollständig erfunden');
    expect(document[0].name).toContain('SYNTHETIC');
    expect(detectProfile(document)).toBe('claude-chat-messages-v1');
    // Test the decoder directly; do not enable the import approval flag.
    const parsed = parseClaudeDocument(document, new AbortController().signal);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].externalId).toBe('SYNTHETIC-claude-conversation-001');
    expect(parsed[0].nodes.map((node) => node.message?.externalId)).toEqual(['SYNTHETIC-human-001', 'SYNTHETIC-assistant-001']);
    expect(parsed[0].nodes.map((node) => node.message?.role)).toEqual(['user', 'assistant']);
    expect(parsed[0].nodes.map((node) => node.message?.sentAt)).toEqual(['2026-10-01T12:00:00Z', '2026-10-01T12:00:01Z']);
    expect(parsed[0].nodes[0].message?.parts).toEqual([
      { kind: 'text', text: document[0].chat_messages[0].text, label: null },
      { kind: 'image_placeholder', text: null, label: 'Bildplatzhalter' },
    ]);
    expect(parsed[0].nodes[1].message?.parts).toEqual([
      { kind: 'text', text: document[0].chat_messages[1].text, label: null },
    ]);
    expect(parsed[0].nodes.every((node) => node.branch === 'unknown')).toBe(true);
    expect(parsed[0].placeholderParts).toBe(1);
    expect(parsed[0].diagnostics).toEqual([]);
    expect(defaultOptions.claude_profile_approved).toBe(false);
  });

  it.each(['auto', 'claude-chat-messages-v1'] as const)('rejects SYNTHETIC data atomically with unapproved profile %s', async (profile) => {
    const store = new MemoryStore(emptySnapshot(fixedClock.now()));
    const before = store.currentSha256();
    const options = { ...defaultOptions, profile };
    expect(options.claude_profile_approved).toBe(false);
    await expect(parseImport([{ name: syntheticName, bytes: syntheticBytes }], store.read(), options, fixedClock, new AbortController().signal)).rejects.toMatchObject({ code: 'PROFILE_NOT_APPROVED' });
    expect(options.claude_profile_approved).toBe(false);
    expect(store.currentSha256()).toBe(before);
    expect(store.read().source_files).toEqual([]);
    expect(store.read().conversations).toEqual([]);
    expect(store.read().messages).toEqual([]);
  });

  it('keeps the product import boundary explicitly unapproved', () => {
    // Static regression guard for the actual UI options, separate from helper defaults.
    const source = readFileSync(resolve(repoRoot, 'apps/web/src/features/import/ImportView.tsx'), 'utf8');
    const flags = [...source.matchAll(/\bclaude_profile_approved\s*:\s*(\w+)\b/g)].map((match) => match[1]);
    expect(flags).toEqual(['false']);
  });

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
