/**
 * Types mirrored from memory-atlas-specc/schemas/atlas.schema.json and
 * memory-export.schema.json (schema 1.0.0). Field names and nullability follow
 * the schema; they are not the contract file's JsonObject placeholders.
 */

export type Id = string;
export type Instant = string;
export type Digest = string;

export interface Scope {
  workspace_id: string;
  project_id: string | null;
  environment: string;
}

export interface ConsumerScope {
  workspace_id: string;
  project_id: string | null;
  environment: string;
  consumer_id: string;
  purpose: string;
}

export interface Workspace {
  id: string;
  title: string;
  timezone: string;
  created_at: Instant;
  topic_policy: 'ai_projects_only';
  policy_version: '1.0';
}

export type Provider = 'chatgpt' | 'claude' | 'gemini' | 'manual';

export interface SourceFile {
  id: string;
  namespace: string;
  provider: Provider;
  original_name: string;
  byte_sha256: Digest;
  imported_at: Instant;
  adapter_profile: string;
  raw_text: string;
}

export interface Diagnostic {
  code: string;
  severity: 'info' | 'warning' | 'error';
  source_file_id: Id;
  json_pointer: string;
}

export interface ImportBatch {
  id: string;
  source_file_ids: string[];
  completed_at: Instant;
  adapter_version: string;
  diagnostics: Diagnostic[];
}

export interface Conversation {
  id: string;
  source_namespace: string;
  provider: Provider;
  external_id: string;
  title: string;
  created_at: Instant | null;
}

export type PartKind =
  | 'text'
  | 'image_placeholder'
  | 'audio_placeholder'
  | 'file_placeholder'
  | 'tool_placeholder'
  | 'unsupported';

export interface Part {
  kind: PartKind;
  text: string | null;
  label: string | null;
}

export interface Occurrence {
  source_file_id: string;
  import_batch_id: string;
  json_pointer: string;
  node_id: string;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'unknown';

export interface Message {
  revision_id: string;
  logical_id: string;
  conversation_id: string;
  external_id: string;
  role: MessageRole;
  sent_at: Instant | null;
  recorded_at: Instant;
  parts: Part[];
  occurrences: Occurrence[];
}

export type BranchMembership = 'selected' | 'alternate' | 'unknown';

export interface Node {
  id: string;
  import_batch_id: string;
  conversation_id: string;
  external_node_id: string;
  parent_node_id: string | null;
  child_node_ids: string[];
  message_revision_id: string | null;
  branch_membership: BranchMembership;
}

export type EvidenceRelation = 'supports' | 'refutes' | 'context';

export interface Evidence {
  id: string;
  message_revision_id: string;
  part_index: number;
  start_cp: number;
  end_cp: number;
  quote: string;
  quote_sha256: Digest;
  relation: EvidenceRelation;
  lineage_root_id: string;
  node_id: string;
}

export type ClaimKind =
  | 'decision'
  | 'preference'
  | 'fact'
  | 'project_status'
  | 'task'
  | 'research_finding'
  | 'open_question';

export type SourceKind =
  | 'user_decision'
  | 'user_report'
  | 'assistant_recommendation'
  | 'assistant_execution_claim'
  | 'tool_observation'
  | 'external_reference'
  | 'inference';

export type ExtractionMethod = 'manual' | 'heuristic' | 'llm';

export type Modality = 'asserted' | 'proposed' | 'hypothetical' | 'negated' | 'quoted' | 'uncertain';

export type Cardinality = 'single' | 'multiple';

export type Category =
  | 'architecture'
  | 'projects'
  | 'agents'
  | 'models'
  | 'tools'
  | 'research'
  | 'workflows'
  | 'costs'
  | 'decisions'
  | 'preferences'
  | 'other_ai'
  | 'excluded_private';

export type ValidityKind = 'interval' | 'timeless' | 'unknown';

export type ValidityBasis = 'explicit' | 'reviewer_assigned' | 'message_time_confirmed' | 'unknown';

export interface Claim {
  id: string;
  text: string;
  kind: ClaimKind;
  source_kind: SourceKind;
  extraction_method: ExtractionMethod;
  modality: Modality;
  scope: Scope;
  subject_id: string;
  predicate: string;
  value: string;
  cardinality: Cardinality;
  category: Category;
  evidence_ids: string[];
  asserted_at: Instant | null;
  recorded_at: Instant;
  validity_kind: ValidityKind;
  valid_from: Instant | null;
  valid_to: Instant | null;
  validity_basis: ValidityBasis;
}

export type RelationType = 'supersedes' | 'contradicts' | 'duplicate_of' | 'revises' | 'supports' | 'related_to';

export interface Relation {
  id: string;
  type: RelationType;
  from_claim_id: string;
  to_claim_id: string;
  effective_at: Instant | null;
  recorded_at: Instant;
  reason: string;
}

export type ReviewAction =
  | 'accept'
  | 'reject'
  | 'exclude'
  | 'reopen'
  | 'confirm_source'
  | 'classify_privacy'
  | 'renew_review'
  | 'confirm_relation'
  | 'revoke_relation'
  | 'revoke_export';

export type Sensitivity = 'shareable' | 'private' | 'secret' | 'unknown';

export interface ReviewEvent {
  id: string;
  target_type: 'claim' | 'relation' | 'memory_set';
  target_id: string;
  action: ReviewAction;
  actor_id: string;
  recorded_at: Instant;
  reason: string;
  evidence_ids: string[];
  context_checked: boolean | null;
  branch_checked: boolean | null;
  sensitivity: Sensitivity | null;
  review_due_at: Instant | null;
  seq: number;
}

export interface MemorySetDraft {
  id: string;
  name: string;
  scope: ConsumerScope;
  selected_claim_ids: string[];
  include_research_notes: boolean;
  max_claims: number;
  max_text_bytes: number;
  policy_version: '1.0';
  created_at: Instant;
}

export interface ExportHistory {
  id: string;
  memory_set_id: string;
  payload_sha256: Digest;
  json_sha256: Digest;
  markdown_sha256: Digest;
  approved_at: Instant;
  expires_at: Instant;
  actor_id: string;
}

export interface AtlasSnapshot {
  schema_version: '1.0.0';
  snapshot_id: string;
  created_at: Instant;
  workspace: Workspace;
  source_files: SourceFile[];
  import_batches: ImportBatch[];
  conversations: Conversation[];
  nodes: Node[];
  messages: Message[];
  claims: Claim[];
  evidence: Evidence[];
  relations: Relation[];
  reviews: ReviewEvent[];
  memory_sets: MemorySetDraft[];
  export_history: ExportHistory[];
}

export interface Citation {
  source_file_id: string;
  message_revision_id: string;
  quote_sha256: Digest;
}

export type Representation = 'user_decision' | 'dated_report' | 'proposal' | 'research_note';

export interface MemoryEntry {
  claim_id: string;
  claim_sha256: Digest;
  statement: string;
  kind: ClaimKind;
  source_kind: SourceKind;
  modality: Modality;
  scope: Scope;
  valid_from: Instant | null;
  valid_to: Instant | null;
  evidence_status: 'source_correlated' | 'execution_verified';
  review_due_at: Instant;
  citations: Citation[];
  representation: Representation;
  source_asserted_at: Instant | null;
}

export interface MemoryPayload {
  schema_version: '1.0.0';
  memory_set_id: string;
  policy_version: '1.0';
  generated_at: Instant;
  expires_at: Instant;
  scope: ConsumerScope;
  context_only: true;
  entries: MemoryEntry[];
}

export interface MemoryEnvelope {
  payload: MemoryPayload;
  payload_sha256: Digest;
}

export interface Clock {
  now(): Instant;
}

export interface SessionContext {
  readonly id: Id;
}

export interface QueryTime {
  readonly valid_at: Instant;
  readonly known_at: Instant;
}

export interface InputFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface ImportOptions {
  readonly namespace: string;
  readonly profile: 'auto' | 'chatgpt-mapping-v1' | 'claude-chat-messages-v1';
  readonly claude_profile_approved: boolean;
}

export interface ImportReport {
  readonly new_conversations: number;
  readonly new_logical_messages: number;
  readonly new_revisions: number;
  readonly unchanged_revisions: number;
  readonly placeholder_parts: number;
  readonly unknown_timestamps: number;
  readonly diagnostics: readonly Diagnostic[];
}

export interface NormalizedImport {
  readonly base_snapshot_sha256: Digest;
  readonly next_snapshot: AtlasSnapshot;
  readonly report: ImportReport;
}

export interface EvidenceResult {
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

export interface ClaimProjection {
  readonly claim_id: Id;
  readonly curation: 'candidate' | 'accepted' | 'rejected' | 'excluded';
  readonly temporal: 'current' | 'future' | 'superseded' | 'disputed' | 'expired' | 'unknown';
  readonly evidence_status: 'unverified' | 'source_correlated' | 'execution_verified';
  readonly freshness: 'fresh' | 'due' | 'unknown';
  readonly sensitivity: Sensitivity;
  readonly review_due_at: Instant | null;
  readonly reasons: readonly string[];
}

export interface ConflictCandidate {
  readonly slot_key: string;
  readonly claim_ids: readonly Id[];
  readonly reason: string;
}

export interface Eligibility {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
}

export interface MemoryPreview {
  readonly memory_set_id: Id;
  readonly payload: MemoryPayload;
  readonly payload_sha256: Digest;
  readonly state_sha256: Digest;
  readonly json_bytes: Uint8Array;
  readonly markdown_bytes: Uint8Array;
  readonly json_sha256: Digest;
  readonly markdown_sha256: Digest;
  readonly prepared_at: Instant;
  readonly preview_expires_at: Instant;
}

export interface MemoryApproval {
  readonly id: Id;
  readonly actor_id: Id;
  readonly payload_sha256: Digest;
  readonly state_sha256: Digest;
  readonly json_sha256: Digest;
  readonly markdown_sha256: Digest;
  readonly approved_at: Instant;
  readonly expires_at: Instant;
  readonly session_id: Id;
}

export interface ExportFiles {
  readonly json_bytes: Uint8Array;
  readonly markdown_bytes: Uint8Array;
  readonly manifest_bytes: Uint8Array;
}

export interface AtlasStore {
  read(): AtlasSnapshot;
  replace(expectedSnapshotSha256: Digest, next: AtlasSnapshot): void;
}
