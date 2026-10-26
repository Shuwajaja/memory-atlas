import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AtlasSnapshot } from '../../src/domain/models.generated';
import { AtlasService } from '../../src/services/atlas-service';
import { validateSnapshot } from '../../src/store/snapshot';
import { exampleRoot } from '../helpers';

describe('session approval', () => {
  it('keeps imported export history from authorizing a download', () => {
    const demo = validateSnapshot(JSON.parse(readFileSync(resolve(exampleRoot, 'demo.atlas.json'), 'utf8')) as AtlasSnapshot);
    demo.export_history.push({
      id: 'hist_imported',
      memory_set_id: 'set_orion_ready',
      payload_sha256: 'ab'.repeat(32),
      json_sha256: 'cd'.repeat(32),
      markdown_sha256: 'ef'.repeat(32),
      approved_at: '2026-10-26T16:15:00Z',
      expires_at: '2026-10-27T16:15:00Z',
      actor_id: 'imported',
    });
    const service = new AtlasService();
    service.openProject(validateSnapshot(demo));
    expect(service.getState().approval).toBeNull();
    expect(service.getState().preview).toBeNull();
    expect(service.getState().importedApprovals).toBe(1);
    expect(service.getState().notice).toContain('untrusted');
    expect(service.exportFiles()).toBeNull();
    expect(service.sessionId().startsWith('ses_')).toBe(true);
  });
});
