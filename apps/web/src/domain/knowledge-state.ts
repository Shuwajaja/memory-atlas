import { AtlasError } from './errors';
import type { AtlasSnapshot, Claim, ReviewEvent, Sensitivity } from './models.generated';
import { instantMs } from './time';

export type Curation = 'candidate' | 'accepted' | 'rejected' | 'excluded';
export type EvidenceAxis = 'unverified' | 'source_correlated';

export interface KnowledgeState {
  curation: Map<string, Curation>;
  sensitivity: Map<string, Sensitivity>;
  evidence: Map<string, EvidenceAxis>;
  reviewDue: Map<string, string | null>;
  activeRelations: Set<string>;
}

export function knowledgeAt(snapshot: AtlasSnapshot, knownAt: string): KnowledgeState {
  const knownMs = instantMs(knownAt);
  const curation = new Map<string, Curation>();
  const sensitivity = new Map<string, Sensitivity>();
  const evidence = new Map<string, EvidenceAxis>();
  const reviewDue = new Map<string, string | null>();
  for (const claim of snapshot.claims) {
    if (instantMs(claim.recorded_at) > knownMs) continue;
    curation.set(claim.id, 'candidate');
    sensitivity.set(claim.id, 'unknown');
    evidence.set(claim.id, 'unverified');
    reviewDue.set(claim.id, null);
  }
  const activeRelations = new Set<string>();
  const reviews = snapshot.reviews
    .filter((review) => instantMs(review.recorded_at) <= knownMs)
    .sort((a, b) => a.seq - b.seq);
  for (const review of reviews) {
    applyReview(review, curation, sensitivity, evidence, reviewDue, activeRelations);
  }
  return { curation, sensitivity, evidence, reviewDue, activeRelations };
}

function applyReview(
  review: ReviewEvent,
  curation: Map<string, Curation>,
  sensitivity: Map<string, Sensitivity>,
  evidence: Map<string, EvidenceAxis>,
  reviewDue: Map<string, string | null>,
  activeRelations: Set<string>,
): void {
  switch (review.action) {
    case 'accept':
      curation.set(review.target_id, 'accepted');
      reviewDue.set(review.target_id, review.review_due_at);
      break;
    case 'reject':
      curation.set(review.target_id, 'rejected');
      break;
    case 'exclude':
      curation.set(review.target_id, 'excluded');
      break;
    case 'reopen':
      curation.set(review.target_id, 'candidate');
      break;
    case 'confirm_source':
      evidence.set(review.target_id, 'source_correlated');
      break;
    case 'classify_privacy':
      if (review.sensitivity) sensitivity.set(review.target_id, review.sensitivity);
      break;
    case 'renew_review':
      reviewDue.set(review.target_id, review.review_due_at);
      break;
    case 'confirm_relation':
      activeRelations.add(review.target_id);
      break;
    case 'revoke_relation':
      activeRelations.delete(review.target_id);
      break;
    case 'revoke_export':
      break;
    default: {
      const neverAction: never = review.action;
      throw new AtlasError('INVALID_REVIEW', `Unbekannte Review-Aktion ${String(neverAction)}.`);
    }
  }
}

export interface EffectiveInterval {
  kind: 'interval' | 'timeless' | 'unknown';
  from: string | null;
  to: string | null;
  shortened: boolean;
}

export function effectiveInterval(snapshot: AtlasSnapshot, claim: Claim, state: KnowledgeState): EffectiveInterval {
  if (claim.validity_kind === 'timeless') return { kind: 'timeless', from: null, to: null, shortened: false };
  if (claim.validity_kind === 'unknown') return { kind: 'unknown', from: null, to: null, shortened: false };
  let to = claim.valid_to;
  let shortened = false;
  for (const relation of snapshot.relations) {
    if (relation.type !== 'supersedes' || relation.to_claim_id !== claim.id || !relation.effective_at) continue;
    if (!state.activeRelations.has(relation.id)) continue;
    if (!to || instantMs(relation.effective_at) < instantMs(to)) {
      to = relation.effective_at;
      shortened = true;
    }
  }
  return { kind: 'interval', from: claim.valid_from, to, shortened };
}

export function coversInstant(interval: EffectiveInterval, validAt: string): boolean {
  if (interval.kind === 'timeless') return true;
  if (interval.kind === 'unknown' || !interval.from) return false;
  const at = instantMs(validAt);
  if (at < instantMs(interval.from)) return false;
  if (interval.to && at >= instantMs(interval.to)) return false;
  return true;
}

export function slotKey(claim: Claim): string {
  return [claim.scope.workspace_id, claim.scope.project_id ?? '', claim.scope.environment, claim.subject_id, claim.predicate].join('\u001f');
}

export function replacementPending(snapshot: AtlasSnapshot, claim: Claim, state: KnowledgeState): boolean {
  return snapshot.relations.some((relation) => {
    if (relation.type !== 'supersedes' || state.activeRelations.has(relation.id)) return false;
    if (relation.from_claim_id !== claim.id && relation.to_claim_id !== claim.id) return false;
    const otherId = relation.from_claim_id === claim.id ? relation.to_claim_id : relation.from_claim_id;
    const other = state.curation.get(otherId);
    return other === 'candidate' || other === 'accepted';
  });
}

export function futureBecauseReplacement(snapshot: AtlasSnapshot, claim: Claim, state: KnowledgeState, validAt: string): boolean {
  return snapshot.relations.some((relation) => {
    if (relation.type !== 'supersedes' || relation.from_claim_id !== claim.id || !relation.effective_at) return false;
    if (!state.activeRelations.has(relation.id)) return false;
    return instantMs(validAt) < instantMs(relation.effective_at);
  });
}
