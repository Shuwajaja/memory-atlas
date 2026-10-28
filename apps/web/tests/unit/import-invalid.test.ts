import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../src/domain/limits';
import { parseImport } from '../../src/importers/normalize';
import { parseJsonText } from '../../src/importers/json-scan';
import { MemoryStore } from '../../src/store/memory-store';
import { emptySnapshot, validateSnapshot } from '../../src/store/snapshot';
import { defaultOptions, fixedClock, fixtureFile, loadJson } from '../helpers';
import type { AtlasSnapshot } from '../../src/domain/models.generated';
import { resolve } from 'node:path';
import { exampleRoot } from '../helpers';

describe('invalid inputs', () => {
  it('FI13 rejects duplicate keys before any commit', async () => {
    const store = new MemoryStore(emptySnapshot(fixedClock.now()));
    const before = store.currentSha256();
    await expect(parseImport([fixtureFile('duplicate-key.txt')], store.read(), defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({
      code: 'DUPLICATE_JSON_KEY',
    });
    expect(store.currentSha256()).toBe(before);
  });

  it('does not let __proto__ or a quoted brace change depth or the prototype', () => {
    const parsed = parseJsonText('{"__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}},"text":"{"}');
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(parsed.value).toMatchObject({ text: '{' });
    const nested = (parsed.value as { __proto__?: { polluted?: boolean } })['__proto__'];
    expect(nested && typeof nested === 'object' ? nested.polluted : undefined).toBe(true);
    expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('allows JSON depth 128 and rejects 129', () => {
    let allowed = '0';
    for (let index = 0; index < 128; index += 1) allowed = `[${allowed}]`;
    const nested = parseJsonText(allowed).value;
    let depth = 0;
    let cursor: unknown = nested;
    while (Array.isArray(cursor)) {
      depth += 1;
      cursor = cursor[0];
    }
    expect(depth).toBe(128);
    expect(cursor).toBe(0);
    let rejected = '0';
    for (let index = 0; index < 129; index += 1) rejected = `[${rejected}]`;
    expect(() => parseJsonText(rejected)).toThrowError(expect.objectContaining({ code: 'JSON_DEPTH' }));
    expect(parseJsonText('{"a":"{\\"depth\\":[1]}"}').value).toEqual({ a: '{"depth":[1]}' });
  });

  it('rejects an unknown JSON object as unsupported and creates no conversation from the raw text', async () => {
    const raw = 'Rohtext ohne freigegebenes Importprofil.';
    const bytes = new TextEncoder().encode(JSON.stringify({ note: raw, items: [{ text: raw }] }));
    const store = new MemoryStore(emptySnapshot(fixedClock.now()));
    const before = store.currentSha256();
    await expect(parseImport([{ name: 'notes.json', bytes }], store.read(), defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({
      code: 'UNSUPPORTED_PROFILE',
    });
    const after = store.read();
    expect(store.currentSha256()).toBe(before);
    expect(after.conversations).toEqual([]);
    expect(after.messages).toEqual([]);
    expect(JSON.stringify(after)).not.toContain(raw);
  });

  it('rejects invalid UTF-8, archives and oversized files without a partial store change', async () => {
    const store = new MemoryStore(emptySnapshot(fixedClock.now()));
    const before = store.currentSha256();
    const base = store.read();
    await expect(parseImport([{ name: 'bad.json', bytes: Uint8Array.from([0xff, 0xfe, 0xfd]) }], base, defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({ code: 'INVALID_UTF8' });
    await expect(parseImport([{ name: 'export.zip', bytes: Uint8Array.from([1, 2, 3]) }], base, defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({ code: 'ARCHIVE_NOT_SUPPORTED' });
    await expect(parseImport([{ name: 'chat.html', bytes: new TextEncoder().encode('<script>alert(1)</script>') }], base, defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({ code: 'HTML_NOT_SUPPORTED' });
    await expect(parseImport([{ name: 'big.json', bytes: new Uint8Array(LIMITS.fileBytes + 1) }], base, defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
    expect(store.currentSha256()).toBe(before);
  });

  it('rejects a forged execution_verified field inside a project file', () => {
    const demo = loadJson<AtlasSnapshot>(resolve(exampleRoot, 'demo.atlas.json'));
    const forged = structuredClone(demo) as unknown as { claims: Record<string, unknown>[] };
    forged.claims[1] = { ...forged.claims[1], execution_verified: true };
    expect(() => validateSnapshot(forged)).toThrowError(expect.objectContaining({ code: 'PRIVILEGED_FIELD' }));
  });

  it('blocks the parent walk after 10000 edges', () => {
    const mapping: Record<string, unknown> = {};
    const count = LIMITS.parentEdges + 2;
    for (let index = 0; index < count; index += 1) {
      const id = `n${index}`;
      mapping[id] = {
        id,
        parent: index === 0 ? null : `n${index - 1}`,
        children: index === count - 1 ? [] : [`n${index + 1}`],
        message: index === 0 ? null : { id, author: { role: 'user' }, create_time: 1777629600, content: { content_type: 'text', parts: ['x'] } },
      };
    }
    const document = [{ id: 'long', title: 'long', create_time: 1777629600, current_node: `n${count - 1}`, mapping }];
    const bytes = new TextEncoder().encode(JSON.stringify(document));
    return expect(parseImport([{ name: 'long.json', bytes }], emptySnapshot(fixedClock.now()), defaultOptions, fixedClock, new AbortController().signal)).rejects.toMatchObject({
      code: 'PARENT_TRAVERSAL_LIMIT',
    });
  });
});
