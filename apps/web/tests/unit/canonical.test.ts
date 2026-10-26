import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalize } from '../../src/domain/canonical';
import { sha256Sync, sha256Text, utf8Bytes } from '../../src/domain/sha256';
import { exampleRoot } from '../helpers';

describe('canonical bytes', () => {
  it('matches the published MA-C14N-1 vectors', () => {
    const vectors = JSON.parse(readFileSync(resolve(exampleRoot, 'canonical-vectors.json'), 'utf8')) as {
      vectors: { name: string; input: unknown; canonical_text: string; utf8_hex: string; sha256: string }[];
    };
    expect(vectors.vectors.map((vector) => vector.name)).toEqual(['unicode', 'order', 'controls']);
    for (const vector of vectors.vectors) {
      const text = canonicalize(vector.input);
      expect(text).toBe(vector.canonical_text);
      expect(Buffer.from(utf8Bytes(text)).toString('hex')).toBe(vector.utf8_hex);
      expect(sha256Text(text)).toBe(vector.sha256);
    }
  });

  it('keeps emoji and ignores object key insertion order', () => {
    const left = canonicalize({ b: 'A😀éB', a: 1 });
    const right = canonicalize({ a: 1, b: 'A😀éB' });
    expect(left).toBe(right);
    expect(left).toContain('A😀éB');
    expect(sha256Sync(utf8Bytes(left))).toBe(sha256Sync(utf8Bytes(right)));
  });

  it('hashes abc with the standard SHA-256 digest', () => {
    expect(sha256Text('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
