/** Memory Atlas v1.0 — contracts only; no runtime implementation.
 * Generate model types from schemas/atlas.schema.json in the target repo.
 * The named model interfaces below intentionally define boundaries, not a second field schema.
 */
export type Id = string;
export type Instant = string;
export type Digest = string;
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject;

// Replace these aliases with schema-generated definitions in the implementation.
// Contract imports then point to the generated model module; do not widen validation.
export type AtlasSnapshot = JsonObject;
export type Claim = JsonObject;
export type Evidence = JsonObject;
export type ReviewEvent = JsonObject;
export type Relation = JsonObject;
export type ConsumerScope = JsonObject;
export type MemorySetDraft = JsonObject;
export type MemoryPayload = JsonObject;

export interface Clock { now(): Instant; }
export interface SessionContext { readonly id: Id; }
export interface QueryTime { readonly valid_at: Instant; readonly known_at: Instant; }
export interface InputFile { readonly name: string; readonly bytes: Uint8Array; }
export interface ImportOptions {
  readonly namespace: string;
  readonly profile: 'auto' | 'chatgpt-mapping-v1' | 'claude-chat-messages-v1';
  readonly claude_profile_approved: boolean;
}
export interface Diagnostic {
  readonly code: string;
  readonly severity: 'info' | 'warning' | 'error';
  readonly source_file_id: Id;
  readonly json_pointer: string;
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
  readonly sensitivity: 'shareable' | 'private' | 'secret' | 'unknown';
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

export declare function parseImport(
  files: readonly InputFile[], base: AtlasSnapshot, options: ImportOptions,
  clock: Clock, signal: AbortSignal
): Promise<NormalizedImport>;
export declare function commitImport(store: AtlasStore, staged: NormalizedImport): void;
export declare function validateSnapshot(input: unknown): AtlasSnapshot;
export declare function validateEvidence(snapshot: AtlasSnapshot, evidence: Evidence): EvidenceResult;
export declare function appendReview(snapshot: AtlasSnapshot, event: ReviewEvent): AtlasSnapshot;
export declare function projectClaim(snapshot: AtlasSnapshot, claimId: Id, at: QueryTime): ClaimProjection;
export declare function detectConflicts(snapshot: AtlasSnapshot, at: QueryTime): readonly ConflictCandidate[];
export declare function evaluateEligibility(
  snapshot: AtlasSnapshot, claimId: Id, draft: MemorySetDraft, at: QueryTime
): Eligibility;
export declare function prepareMemorySet(snapshot: AtlasSnapshot, draft: MemorySetDraft, clock: Clock): MemoryPreview;
export declare function approveMemorySet(preview: MemoryPreview, actorId: Id, clock: Clock, session: SessionContext): MemoryApproval;
export declare function exportMemorySet(
  snapshot: AtlasSnapshot, preview: MemoryPreview, approval: MemoryApproval, clock: Clock, session: SessionContext
): ExportFiles;

// SessionContext is created by a trusted local runtime session service,
// never from imported JSON. It and Clock are explicit injectable dependencies.
// P1 returns no execution_verified projection, even for a forged imported field.
