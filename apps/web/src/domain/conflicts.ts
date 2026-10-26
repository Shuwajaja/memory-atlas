import type { AtlasSnapshot, ConflictCandidate, QueryTime } from './models.generated';
import {
  coversInstant,
  effectiveInterval,
  knowledgeAt,
  slotKey,
  type KnowledgeState,
} from './knowledge-state';

export function conflictingClaimIds(snapshot: AtlasSnapshot, at: QueryTime, state: KnowledgeState = knowledgeAt(snapshot, at.known_at)): Map<string, string> {
  const reasons = new Map<string, string>();
  const participants = snapshot.claims.filter((claim) => {
    const curation = state.curation.get(claim.id);
    return curation === 'candidate' || curation === 'accepted';
  });
  const groups = new Map<string, typeof participants>();
  for (const claim of participants) {
    const key = slotKey(claim);
    const group = groups.get(key) ?? [];
    group.push(claim);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const active = group.filter((claim) => coversInstant(effectiveInterval(snapshot, claim, state), at.valid_at));
    for (let left = 0; left < active.length; left += 1) {
      for (let right = left + 1; right < active.length; right += 1) {
        const a = active[left];
        const b = active[right];
        if (!a || !b) continue;
        if (a.cardinality !== 'single' || b.cardinality !== 'single') continue;
        if (a.value === b.value) continue;
        reasons.set(a.id, 'SINGLE_SLOT_OVERLAP');
        reasons.set(b.id, 'SINGLE_SLOT_OVERLAP');
      }
    }
  }
  for (const relation of snapshot.relations) {
    if (relation.type !== 'contradicts' || !state.activeRelations.has(relation.id)) continue;
    const a = participants.find((claim) => claim.id === relation.from_claim_id);
    const b = participants.find((claim) => claim.id === relation.to_claim_id);
    if (!a || !b) continue;
    const aCovers = coversInstant(effectiveInterval(snapshot, a, state), at.valid_at);
    const bCovers = coversInstant(effectiveInterval(snapshot, b, state), at.valid_at);
    if (aCovers && bCovers) {
      reasons.set(a.id, 'CONFIRMED_CONTRADICTION');
      reasons.set(b.id, 'CONFIRMED_CONTRADICTION');
    }
  }
  return reasons;
}

export function detectConflicts(snapshot: AtlasSnapshot, at: QueryTime): readonly ConflictCandidate[] {
  const state = knowledgeAt(snapshot, at.known_at);
  const hits = conflictingClaimIds(snapshot, at, state);
  const groups = new Map<string, string[]>();
  for (const claim of snapshot.claims) {
    if (!hits.has(claim.id)) continue;
    const key = slotKey(claim);
    const ids = groups.get(key) ?? [];
    ids.push(claim.id);
    groups.set(key, ids);
  }
  return [...groups.entries()]
    .map(([slot_key, claim_ids]) => ({
      slot_key,
      claim_ids: [...claim_ids].sort(),
      reason: hits.get(claim_ids[0] ?? '') ?? 'SINGLE_SLOT_OVERLAP',
    }))
    .sort((a, b) => a.slot_key.localeCompare(b.slot_key));
}
