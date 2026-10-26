import { useSyncExternalStore } from 'react';
import type { QueryTime } from './domain/models.generated';
import { AtlasService } from './services/atlas-service';

export const atlas = new AtlasService();

export function useAtlas() {
  const state = useSyncExternalStore(atlas.subscribe, atlas.getState, atlas.getState);
  return { service: atlas, state };
}

export function nowQuery(): QueryTime {
  const now = new Date().toISOString();
  return { valid_at: now, known_at: now };
}
