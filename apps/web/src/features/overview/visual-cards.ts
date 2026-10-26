import type { AtlasSnapshot, Category, ClaimKind, QueryTime, RelationType } from '../../domain/models.generated';
import { projectClaim } from '../../domain/projection';
import { relationLabel, reviewActionLabel } from '../format';
import {
  ILLUSTRATION,
  ILLUSTRATION_ACTIVITY,
  type ActivityRow,
  type TopicId,
  type VisualCard,
  type VisualKind,
  type VisualStatus,
  shortDay,
} from './reference-demo';

export function usesIllustration(snapshot: AtlasSnapshot): boolean {
  return snapshot.claims.length === 0 && snapshot.conversations.length === 0 && snapshot.messages.length === 0;
}

export function visualCards(snapshot: AtlasSnapshot, at: QueryTime): VisualCard[] {
  if (usesIllustration(snapshot)) return [...ILLUSTRATION];
  return snapshot.claims.flatMap((claim) => {
    const topic = topicOf(claim.category);
    if (!topic) return [];
    const view = projectClaim(snapshot, claim.id, at);
    const card: VisualCard = {
      id: claim.id,
      title: claim.value || claim.text,
      detail: claim.text,
      kind: kindOf(claim.kind),
      category: topic,
      status: statusOf(view.curation, view.temporal),
      date: (claim.asserted_at ?? claim.recorded_at).slice(0, 10),
      sourceTitle: claim.predicate || claim.source_kind,
      source: claim.source_kind,
      sourceId: claim.id,
      sourceExcerpt: claim.text,
      demo: false,
    };
    return [card];
  });
}

export function activityRows(snapshot: AtlasSnapshot, cards: readonly VisualCard[], illustration: boolean): ActivityRow[] {
  if (illustration) return [...ILLUSTRATION_ACTIVITY];
  const claimTitle = (id: string) => snapshot.claims.find((claim) => claim.id === id)?.value ?? id;
  const fromRelations: Stamped[] = snapshot.relations.map((relation) => ({
    id: relation.from_claim_id,
    title: `${claimTitle(relation.from_claim_id)} · ${relationLabel(relation.type)}`,
    sub: relation.reason || claimTitle(relation.to_claim_id),
    icon: iconForRelation(relation.type),
    tone: toneForRelation(relation.type),
    day: shortDay(relation.recorded_at),
    at: relation.recorded_at,
  }));
  const fromReviews: Stamped[] = snapshot.reviews.map((review) => ({
    id: review.target_id,
    title: reviewActionLabel(review.action),
    sub: review.reason,
    icon: review.action === 'reject' || review.action === 'exclude' ? 'alert' : 'shield',
    tone: review.action === 'reject' || review.action === 'exclude' ? 'red' : review.action === 'reopen' ? 'amber' : '',
    day: shortDay(review.recorded_at),
    at: review.recorded_at,
  }));
  const events = [...fromRelations, ...fromReviews].sort((left, right) => right.at.localeCompare(left.at)).slice(0, 3);
  if (events.length > 0) return events;
  return [...cards]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 3)
    .map((card) => ({
      id: card.id,
      title: card.title,
      sub: card.sourceTitle,
      icon: card.kind === 'decision' ? 'git' : card.status === 'review' ? 'alert' : 'shield',
      tone: card.status === 'review' || card.status === 'conflict' ? 'amber' : card.status === 'outdated' ? 'red' : '',
      day: shortDay(card.date),
    }));
}

interface Stamped extends ActivityRow {
  at: string;
}

function topicOf(category: Category): TopicId | null {
  switch (category) {
    case 'agents':
    case 'models':
    case 'tools':
      return 'agents';
    case 'projects':
    case 'decisions':
      return 'projects';
    case 'architecture':
    case 'research':
    case 'other_ai':
      return 'memory';
    case 'preferences':
      return 'design';
    case 'workflows':
      return 'infra';
    case 'costs':
      return 'business';
    case 'excluded_private':
      return null;
    default: {
      const neverCategory: never = category;
      return neverCategory;
    }
  }
}

function kindOf(kind: ClaimKind): VisualKind {
  switch (kind) {
    case 'decision':
      return 'decision';
    case 'preference':
      return 'preference';
    case 'project_status':
      return 'plan';
    case 'task':
    case 'open_question':
      return 'task';
    case 'fact':
    case 'research_finding':
      return 'architecture';
    default: {
      const neverKind: never = kind;
      return neverKind;
    }
  }
}

function statusOf(curation: 'candidate' | 'accepted' | 'rejected' | 'excluded', temporal: 'current' | 'future' | 'superseded' | 'disputed' | 'expired' | 'unknown'): VisualStatus {
  if (curation === 'excluded' || curation === 'rejected') return 'excluded';
  switch (temporal) {
    case 'superseded':
    case 'expired':
      return 'outdated';
    case 'disputed':
      return 'conflict';
    case 'future':
      return 'planned';
    case 'unknown':
      return 'review';
    case 'current':
      return curation === 'accepted' ? 'approved' : curation === 'candidate' ? 'review' : 'current';
    default: {
      const neverTemporal: never = temporal;
      return neverTemporal;
    }
  }
}

function iconForRelation(type: RelationType): ActivityRow['icon'] {
  switch (type) {
    case 'supersedes':
    case 'revises':
      return 'git';
    case 'contradicts':
      return 'alert';
    case 'duplicate_of':
    case 'supports':
    case 'related_to':
      return 'shield';
    default: {
      const neverType: never = type;
      return neverType;
    }
  }
}

function toneForRelation(type: RelationType): ActivityRow['tone'] {
  switch (type) {
    case 'contradicts':
      return 'amber';
    case 'supersedes':
    case 'revises':
    case 'duplicate_of':
    case 'supports':
    case 'related_to':
      return '';
    default: {
      const neverType: never = type;
      return neverType;
    }
  }
}

export function cardById(cards: readonly VisualCard[], id: string): VisualCard | undefined {
  return cards.find((card) => card.id === id);
}
