import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixtureRoot, importFiles, loadJson, messageExternalIds } from '../helpers';

const cases = loadJson<{ cases: { id: string; files: string[]; expect: Record<string, unknown> }[] }>(
  resolve(fixtureRoot, 'expected/import-cases.json'),
).cases;

function expectCase(id: string) {
  const found = cases.find((item) => item.id === id);
  if (!found) throw new Error(`missing case ${id}`);
  return found;
}

describe('chatgpt fixtures', () => {
  it('FI01 keeps two messages, the selected chain and one null root', async () => {
    const spec = expectCase('FI01');
    const { snapshot, staged } = await importFiles(spec.files, { profile: 'chatgpt-mapping-v1' });
    expect(snapshot.conversations).toHaveLength(Number(spec.expect.conversations));
    expect(snapshot.nodes).toHaveLength(Number(spec.expect.nodes));
    expect(snapshot.messages).toHaveLength(Number(spec.expect.messages));
    expect(messageExternalIds(snapshot, 'selected').sort()).toEqual([...(spec.expect.selected_external_message_ids as string[])].sort());
    const nullRoots = snapshot.nodes.filter((node) => node.parent_node_id === null && node.message_revision_id === null);
    expect(nullRoots).toHaveLength(Number(spec.expect.null_roots));
    expect(staged.report.new_logical_messages).toBe(2);
  });

  it('FI02 keeps the selected and alternate answers', async () => {
    const spec = expectCase('FI02');
    const { snapshot } = await importFiles(spec.files);
    expect(snapshot.messages).toHaveLength(Number(spec.expect.messages));
    expect(messageExternalIds(snapshot, 'selected').sort()).toEqual([...(spec.expect.selected_external_message_ids as string[])].sort());
    expect(messageExternalIds(snapshot, 'alternate').sort()).toEqual([...(spec.expect.alternate_external_message_ids as string[])].sort());
  });

  it('FI03 preserves missing times instead of inventing an epoch', async () => {
    const spec = expectCase('FI03');
    const { snapshot, staged } = await importFiles(spec.files);
    expect(snapshot.messages).toHaveLength(Number(spec.expect.messages));
    expect(snapshot.messages.every((message) => message.sent_at === null)).toBe(true);
    expect(snapshot.messages.some((message) => message.sent_at === '1970-01-01T00:00:00Z')).toBe(false);
    expect(snapshot.messages.some((message) => message.sent_at === '2026-10-26T16:00:00Z')).toBe(false);
    expect(staged.report.unknown_timestamps).toBe(spec.expect.unknown_timestamps);
    const codes = staged.report.diagnostics.map((item) => item.code);
    for (const code of spec.expect.diagnostic_codes as string[]) expect(codes).toContain(code);
  });

  it('FI04 keeps text parts and typed media placeholders without fetching them', async () => {
    const spec = expectCase('FI04');
    const { snapshot, staged } = await importFiles(spec.files);
    expect(snapshot.messages).toHaveLength(Number(spec.expect.messages));
    const placeholders = snapshot.messages.flatMap((message) => message.parts).filter((part) => part.kind !== 'text');
    expect(placeholders).toHaveLength(Number(spec.expect.placeholder_parts));
    expect(placeholders.map((part) => part.kind).sort()).toEqual(['audio_placeholder', 'image_placeholder']);
    expect(placeholders.every((part) => part.text === null)).toBe(true);
    expect(staged.report.placeholder_parts).toBe(2);
    expect(JSON.stringify(snapshot.messages)).not.toContain('https://');
  });

  it('FI05 marks a parent cycle unknown and selects nothing', async () => {
    const spec = expectCase('FI05');
    const { snapshot, staged } = await importFiles(spec.files);
    expect(snapshot.messages).toHaveLength(Number(spec.expect.messages));
    expect(messageExternalIds(snapshot, 'selected')).toEqual(spec.expect.selected_external_message_ids);
    expect(messageExternalIds(snapshot, 'unknown')).toHaveLength(Number(spec.expect.unknown_branch_messages));
    expect(staged.report.diagnostics.map((item) => item.code)).toContain('PARENT_CYCLE');
  });

  it('FI07 stores hostile text as data and does not pollute Object.prototype', async () => {
    const spec = expectCase('FI07');
    const { snapshot } = await importFiles(spec.files);
    expect(snapshot.messages).toHaveLength(Number(spec.expect.messages));
    const blob = snapshot.messages.map((message) => message.parts.map((part) => part.text ?? '').join('\n')).join('\n');
    expect(blob).toContain('<script>');
    expect(blob).toContain('javascript:alert');
    expect(blob).toContain('__proto__');
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('FI08 deduplicates a conversation split across two files', async () => {
    const spec = expectCase('FI08');
    const forward = await importFiles(spec.files);
    const backward = await importFiles([...spec.files].reverse());
    expect(forward.snapshot.conversations).toHaveLength(Number(spec.expect.conversations));
    expect(new Set(forward.snapshot.messages.map((message) => message.logical_id)).size).toBe(Number(spec.expect.logical_messages));
    expect(forward.snapshot.messages).toHaveLength(Number(spec.expect.message_revisions));
    expect(backward.snapshot.messages.map((message) => message.logical_id).sort()).toEqual(
      forward.snapshot.messages.map((message) => message.logical_id).sort(),
    );
  });

  it('reads the raw hostile fixture from disk', () => {
    const text = readFileSync(resolve(fixtureRoot, 'chatgpt/07-hostile.json'), 'utf8');
    expect(text).toContain('fetch');
  });
});
