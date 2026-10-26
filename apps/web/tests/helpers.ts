import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseImport } from '../src/importers/normalize';
import type { AtlasSnapshot, Clock, ImportOptions, InputFile } from '../src/domain/models.generated';
import { emptySnapshot } from '../src/store/snapshot';
import { MemoryStore } from '../src/store/memory-store';

export const repoRoot = resolve(import.meta.dirname, '../../..');
export const fixtureRoot = resolve(repoRoot, 'memory-atlas-specc/fixtures');
export const exampleRoot = resolve(repoRoot, 'memory-atlas-specc/examples');

export function readBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

export function fixtureFile(name: string): InputFile {
  return { name: name.split('/').pop() ?? name, bytes: readBytes(resolve(fixtureRoot, name)) };
}

export function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export const fixedClock: Clock = { now: () => '2026-10-26T16:00:00Z' };

export const defaultOptions: ImportOptions = {
  namespace: 'synthetic-account',
  profile: 'auto',
  claude_profile_approved: false,
};

export async function importFiles(names: string[], options: Partial<ImportOptions> = {}, base?: AtlasSnapshot) {
  const snapshot = base ?? emptySnapshot(fixedClock.now());
  const staged = await parseImport(names.map(fixtureFile), snapshot, { ...defaultOptions, ...options }, fixedClock, new AbortController().signal);
  const store = new MemoryStore(snapshot);
  store.replace(staged.base_snapshot_sha256, staged.next_snapshot);
  return { store, staged, snapshot: store.read() };
}

export function messageExternalIds(snapshot: AtlasSnapshot, branch?: 'selected' | 'alternate' | 'unknown'): string[] {
  const ids: string[] = [];
  for (const node of snapshot.nodes) {
    if (branch && node.branch_membership !== branch) continue;
    if (!node.message_revision_id) continue;
    const message = snapshot.messages.find((item) => item.revision_id === node.message_revision_id);
    if (message) ids.push(message.external_id);
  }
  return ids;
}
