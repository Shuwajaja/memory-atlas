import type { BranchMembership, Diagnostic, MessageRole, Part, Provider } from '../domain/models.generated';

export interface DiagnosticSeed {
  code: string;
  severity: Diagnostic['severity'];
  json_pointer: string;
}

export interface ParsedMessage {
  externalId: string;
  role: MessageRole;
  sentAt: string | null;
  parts: Part[];
  pointer: string;
}

export interface ParsedNode {
  externalId: string;
  parentExternalId: string | null;
  childExternalIds: string[];
  branch: BranchMembership;
  message: ParsedMessage | null;
}

export interface ParsedConversation {
  provider: Provider;
  profile: string;
  externalId: string;
  title: string;
  createdAt: string | null;
  nodes: ParsedNode[];
  diagnostics: DiagnosticSeed[];
  placeholderParts: number;
  unknownTimestamps: number;
  messageObjects: number;
}
