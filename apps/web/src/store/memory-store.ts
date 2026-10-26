import { AtlasError } from '../domain/errors';
import type { AtlasSnapshot, AtlasStore, Digest } from '../domain/models.generated';
import { snapshotDigest, validateSnapshot } from './snapshot';

export class MemoryStore implements AtlasStore {
  private snapshot: AtlasSnapshot;
  private digest: string;

  constructor(snapshot: AtlasSnapshot) {
    this.snapshot = validateSnapshot(snapshot);
    this.digest = snapshotDigest(this.snapshot);
  }

  read(): AtlasSnapshot {
    return this.snapshot;
  }

  currentSha256(): Digest {
    return this.digest;
  }

  replace(expectedSnapshotSha256: Digest, next: AtlasSnapshot): void {
    if (expectedSnapshotSha256 !== this.digest) {
      throw new AtlasError('SNAPSHOT_CONFLICT', 'Der Speicherstand hat sich geändert. Es wurde nichts teilweise übernommen.');
    }
    const valid = validateSnapshot(next);
    this.snapshot = valid;
    this.digest = snapshotDigest(valid);
  }
}
