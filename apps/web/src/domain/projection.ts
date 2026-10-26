import { conflictingClaimIds } from './conflicts';
import { AtlasError } from './errors';
import {
  effectiveInterval,
  futureBecauseReplacement,
  knowledgeAt,
  replacementPending,
  type Curation,
} from './knowledge-state';
import type { AtlasSnapshot, ClaimProjection, QueryTime, ReviewEvent } from './models.generated';
import { validateEvidence } from './provenance';
import { instantMs } from './time';
import { validateSnapshot } from '../store/snapshot';

export function visibleClaimIds(snapshot: AtlasSnapshot, knownAt: string): string[] {
  const known = instantMs(knownAt);
  return snapshot.claims.filter((claim) => instantMs(claim.recorded_at) <= known).map((claim) => claim.id);
}

export function projectClaim(snapshot: AtlasSnapshot, claimId: string, at: QueryTime): ClaimProjection {
  const claim = snapshot.claims.find((item) => item.id === claimId);
  if (!claim) throw new AtlasError('MISSING_CLAIM', 'Karte fehlt.');
  if (instantMs(claim.recorded_at) > instantMs(at.known_at)) {
    return {
      claim_id: claimId,
      curation: 'candidate',
      temporal: 'unknown',
      evidence_status: 'unverified',
      freshness: 'unknown',
      sensitivity: 'unknown',
      review_due_at: null,
      reasons: ['NOT_YET_RECORDED'],
    };
  }
  const state = knowledgeAt(snapshot, at.known_at);
  const curation = state.curation.get(claimId) ?? 'candidate';
  const evidenceStatus = state.evidence.get(claimId) ?? 'unverified';
  const sensitivity = state.sensitivity.get(claimId) ?? 'unknown';
  const reviewDue = state.reviewDue.get(claimId) ?? null;
  const interval = effectiveInterval(snapshot, claim, state);
  const conflicts = conflictingClaimIds(snapshot, at, state);
  const reasons: string[] = [];
  let temporal: ClaimProjection['temporal'];
  if (conflicts.has(claimId) && (curation === 'candidate' || curation === 'accepted')) {
    temporal = 'disputed';
    reasons.push('DISPUTED');
  } else if (interval.shortened && interval.to && instantMs(at.valid_at) >= instantMs(interval.to)) {
    temporal = 'superseded';
    reasons.push('SUPERSEDED');
  } else if (interval.kind === 'unknown') {
    temporal = 'unknown';
    reasons.push('UNKNOWN_VALIDITY');
  } else if (futureBecauseReplacement(snapshot, claim, state, at.valid_at) || (interval.from && instantMs(at.valid_at) < instantMs(interval.from))) {
    temporal = 'future';
    reasons.push('FUTURE');
  } else if (interval.to && instantMs(at.valid_at) >= instantMs(interval.to)) {
    temporal = 'expired';
    reasons.push('EXPIRED');
  } else {
    temporal = 'current';
  }
  if (replacementPending(snapshot, claim, state)) reasons.push('OPEN_SUPERSESSION');
  const freshness: ClaimProjection['freshness'] = !reviewDue
    ? 'unknown'
    : instantMs(at.valid_at) >= instantMs(reviewDue)
      ? 'due'
      : 'fresh';
  if (freshness === 'due') reasons.push('REVIEW_DUE');
  if (freshness === 'unknown') reasons.push('REVIEW_MISSING');
  return {
    claim_id: claimId,
    curation,
    temporal,
    evidence_status: evidenceStatus,
    freshness,
    sensitivity,
    review_due_at: reviewDue,
    reasons,
  };
}

function requireNeutral(event: ReviewEvent): void {
  if (event.evidence_ids.length !== 0 || event.context_checked !== null || event.branch_checked !== null) {
    throw new AtlasError('INVALID_REVIEW', 'Diese Aktion darf keine Quellenfelder setzen.');
  }
}

export function appendReview(snapshot: AtlasSnapshot, event: ReviewEvent): AtlasSnapshot {
  const next = structuredClone(validateSnapshot(snapshot));
  if (event.seq !== next.reviews.length + 1) throw new AtlasError('REVIEW_SEQUENCE', 'seq muss die nächste Nummer sein.');
  if (next.reviews.length > 0) {
    const previous = next.reviews[next.reviews.length - 1];
    if (previous && instantMs(event.recorded_at) < instantMs(previous.recorded_at)) {
      throw new AtlasError('REVIEW_TIME', 'Review-Zeit läuft zurück.');
    }
  }
  if (!event.reason.trim()) throw new AtlasError('INVALID_REVIEW', 'Begründung fehlt.');
  switch (event.action) {
    case 'accept':
    case 'renew_review':
      if (event.target_type !== 'claim' || !next.claims.some((claim) => claim.id === event.target_id)) {
        throw new AtlasError('INVALID_REVIEW', 'Zielkarte fehlt.');
      }
      if (!event.review_due_at || instantMs(event.review_due_at) <= instantMs(event.recorded_at)) {
        throw new AtlasError('INVALID_REVIEW', 'Die Frist muss nach dem Ereignis liegen.');
      }
      requireNeutral(event);
      if (event.sensitivity !== null) throw new AtlasError('INVALID_REVIEW', 'Diese Aktion setzt keine Sensitivität.');
      break;
    case 'reject':
    case 'exclude':
    case 'reopen':
      if (event.target_type !== 'claim' || !next.claims.some((claim) => claim.id === event.target_id)) {
        throw new AtlasError('INVALID_REVIEW', 'Zielkarte fehlt.');
      }
      requireNeutral(event);
      if (event.sensitivity !== null || event.review_due_at !== null) {
        throw new AtlasError('INVALID_REVIEW', 'Ablehnung ändert den Belegstatus nicht.');
      }
      break;
    case 'confirm_source': {
      if (event.target_type !== 'claim') throw new AtlasError('INVALID_REVIEW', 'Quellenbestätigung zielt auf eine Karte.');
      const claim = next.claims.find((item) => item.id === event.target_id);
      if (!claim) throw new AtlasError('INVALID_REVIEW', 'Zielkarte fehlt.');
      if (event.context_checked !== true || event.branch_checked !== true || event.evidence_ids.length === 0) {
        throw new AtlasError('INVALID_REVIEW', 'Rolle, Zweig, Modalität und Beleg müssen geprüft sein.');
      }
      if (event.sensitivity !== null || event.review_due_at !== null) {
        throw new AtlasError('INVALID_REVIEW', 'Quellenbestätigung ist keine Freigabe.');
      }
      if (!event.evidence_ids.every((id) => claim.evidence_ids.includes(id))) {
        throw new AtlasError('INVALID_REVIEW', 'Fremde Belege sind nicht zulässig.');
      }
      const supports = event.evidence_ids.some((id) => next.evidence.find((item) => item.id === id)?.relation === 'supports');
      if (!supports) throw new AtlasError('INVALID_REVIEW', 'Mindestens ein stützender Beleg ist nötig.');
      for (const id of event.evidence_ids) {
        const evidence = next.evidence.find((item) => item.id === id);
        if (!evidence || !validateEvidence(next, evidence).valid) throw new AtlasError('INVALID_REVIEW', 'Belegspanne ist ungültig.');
      }
      break;
    }
    case 'classify_privacy':
      if (event.target_type !== 'claim' || !event.sensitivity) throw new AtlasError('INVALID_REVIEW', 'Datenschutz braucht eine Klasse.');
      requireNeutral(event);
      if (event.review_due_at !== null) throw new AtlasError('INVALID_REVIEW', 'Datenschutz setzt keine Frist.');
      break;
    case 'confirm_relation':
    case 'revoke_relation': {
      if (event.target_type !== 'relation') throw new AtlasError('INVALID_REVIEW', 'Relationsaktion zielt auf eine Relation.');
      const relation = next.relations.find((item) => item.id === event.target_id);
      if (!relation) throw new AtlasError('INVALID_REVIEW', 'Relation fehlt.');
      requireNeutral(event);
      if (event.sensitivity !== null || event.review_due_at !== null) {
        throw new AtlasError('INVALID_REVIEW', 'Relationsaktion setzt keine Kartendaten.');
      }
      if (event.action === 'confirm_relation' && (relation.type === 'supersedes' || relation.type === 'revises') && !relation.effective_at) {
        throw new AtlasError('INVALID_REVIEW', 'Ersetzung braucht ein Wirksamkeitsdatum.');
      }
      break;
    }
    case 'revoke_export':
      if (event.target_type !== 'memory_set' || !next.memory_sets.some((set) => set.id === event.target_id)) {
        throw new AtlasError('INVALID_REVIEW', 'Memory-Set fehlt.');
      }
      requireNeutral(event);
      if (event.sensitivity !== null || event.review_due_at !== null) {
        throw new AtlasError('INVALID_REVIEW', 'Widerruf setzt keine Kartendaten.');
      }
      break;
    default: {
      const neverAction: never = event.action;
      throw new AtlasError('INVALID_REVIEW', `Unbekannte Aktion ${String(neverAction)}.`);
    }
  }
  next.reviews.push(event);
  return validateSnapshot(next);
}

export function curationOf(snapshot: AtlasSnapshot, claimId: string, knownAt: string): Curation {
  return projectClaim(snapshot, claimId, { valid_at: knownAt, known_at: knownAt }).curation;
}
