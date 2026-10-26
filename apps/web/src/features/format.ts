import type { BranchMembership, Category, ClaimProjection, MessageRole, Part, RelationType, ReviewAction } from '../domain/models.generated';

export function roleLabel(role: MessageRole): string {
  switch (role) {
    case 'user':
      return 'Nutzer';
    case 'assistant':
      return 'Assistenz';
    case 'system':
      return 'System';
    case 'tool':
      return 'Werkzeug';
    case 'unknown':
      return 'Unbekannt';
    default: {
      const neverRole: never = role;
      return neverRole;
    }
  }
}

export function branchLabel(branch: BranchMembership): string {
  switch (branch) {
    case 'selected':
      return 'ausgewählt';
    case 'alternate':
      return 'alternativ';
    case 'unknown':
      return 'unklar';
    default: {
      const neverBranch: never = branch;
      return neverBranch;
    }
  }
}

export function curationLabel(value: ClaimProjection['curation']): string {
  switch (value) {
    case 'candidate':
      return 'Kandidat';
    case 'accepted':
      return 'angenommen';
    case 'rejected':
      return 'abgelehnt';
    case 'excluded':
      return 'ausgeschlossen';
    default: {
      const neverValue: never = value;
      return neverValue;
    }
  }
}

export function evidenceLabel(value: ClaimProjection['evidence_status']): string {
  switch (value) {
    case 'unverified':
      return 'Beleg nicht geprüft';
    case 'source_correlated':
      return 'Quelle korreliert';
    case 'execution_verified':
      return 'Ausführung geprüft';
    default: {
      const neverValue: never = value;
      return neverValue;
    }
  }
}

export function temporalLabel(value: ClaimProjection['temporal']): string {
  switch (value) {
    case 'current':
      return 'aktuell';
    case 'future':
      return 'künftig';
    case 'superseded':
      return 'ersetzt';
    case 'disputed':
      return 'umstritten';
    case 'expired':
      return 'abgelaufen';
    case 'unknown':
      return 'Gültigkeit unbekannt';
    default: {
      const neverValue: never = value;
      return neverValue;
    }
  }
}

export function partText(part: Part): string {
  if (part.kind === 'text' && part.text !== null) return part.text;
  return part.label ?? 'Medienplatzhalter ohne Abruf';
}

export function utcNoon(day: string): string {
  return `${day}T12:00:00.000Z`;
}

export function categoryLabel(value: Category): string {
  switch (value) {
    case 'architecture':
      return 'Architektur';
    case 'projects':
      return 'Projekte';
    case 'agents':
      return 'Agenten';
    case 'models':
      return 'Modelle';
    case 'tools':
      return 'Werkzeuge';
    case 'research':
      return 'Recherche';
    case 'workflows':
      return 'Abläufe';
    case 'costs':
      return 'Kosten';
    case 'decisions':
      return 'Entscheidungen';
    case 'preferences':
      return 'Präferenzen';
    case 'other_ai':
      return 'Weiteres';
    case 'excluded_private':
      return 'Privat';
    default: {
      const neverValue: never = value;
      return neverValue;
    }
  }
}

export function relationLabel(value: RelationType): string {
  switch (value) {
    case 'supersedes':
      return 'Aussage ersetzt';
    case 'contradicts':
      return 'Widerspruch';
    case 'duplicate_of':
      return 'Duplikat';
    case 'revises':
      return 'Fassung geändert';
    case 'supports':
      return 'Stützt eine Aussage';
    case 'related_to':
      return 'Verknüpft';
    default: {
      const neverValue: never = value;
      return neverValue;
    }
  }
}

export function reviewActionLabel(value: ReviewAction): string {
  switch (value) {
    case 'accept':
      return 'Aussage angenommen';
    case 'reject':
      return 'Aussage abgelehnt';
    case 'exclude':
      return 'Aussage ausgeschlossen';
    case 'reopen':
      return 'Prüfung wieder geöffnet';
    case 'confirm_source':
      return 'Quelle bestätigt';
    case 'classify_privacy':
      return 'Datenschutz gesetzt';
    case 'renew_review':
      return 'Frist erneuert';
    case 'confirm_relation':
      return 'Beziehung bestätigt';
    case 'revoke_relation':
      return 'Beziehung zurückgezogen';
    case 'revoke_export':
      return 'Freigabe zurückgezogen';
    default: {
      const neverValue: never = value;
      return neverValue;
    }
  }
}
