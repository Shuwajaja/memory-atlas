import { useState, useSyncExternalStore } from 'react';
import type { AtlasSnapshot, QueryTime } from './domain/models.generated';
import { AtlasService } from './services/atlas-service';

export const atlas = new AtlasService();

export function useAtlas() {
  const state = useSyncExternalStore(atlas.subscribe, atlas.getState, atlas.getState);
  return { service: atlas, state };
}

export function nowQuery(instant = new Date().toISOString()): QueryTime {
  return { valid_at: instant, known_at: instant };
}

export function useLiveQuery(): QueryTime {
  const { state } = useAtlas();
  const snapshot = state.snapshot;
  const [held, setHeld] = useState<{ snapshot: AtlasSnapshot; query: QueryTime }>(() => ({ snapshot, query: nowQuery() }));
  if (held.snapshot !== snapshot) {
    const query = nowQuery();
    setHeld({ snapshot, query });
    return query;
  }
  return held.query;
}
