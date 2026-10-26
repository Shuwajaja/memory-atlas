import type { BranchMembership, ClaimProjection, MessageRole, Part } from '../domain/models.generated';

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
