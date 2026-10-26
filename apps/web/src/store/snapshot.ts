import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import atlasSchema from '../../../../memory-atlas-specc/schemas/atlas.schema.json';
import { canonicalize } from '../domain/canonical';
import { AtlasError } from '../domain/errors';
import { derivedId } from '../domain/ids';
import { LIMITS } from '../domain/limits';
import type {
  AtlasSnapshot,
  Claim,
  Evidence,
  Relation,
  ReviewEvent,
} from '../domain/models.generated';
import { hasLoneSurrogate, sliceCodePoints } from '../domain/provenance';
import { sha256Text, utf8Bytes } from '../domain/sha256';
import { instantMs } from '../domain/time';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(atlasSchema);

function walkPrivileged(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) walkPrivileged(item);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value as object)) {
    if (key === 'execution_verified') {
      throw new AtlasError('PRIVILEGED_FIELD', 'execution_verified darf im Projekt nicht stehen.');
    }
    walkPrivileged((value as Record<string, unknown>)[key]);
  }
}

function unique(ids: string[], table: string): void {
  if (new Set(ids).size !== ids.length) throw new AtlasError('DUPLICATE_ID', `Doppelte IDs in ${table}.`);
}

function assertAcyclic(relations: Relation[]): void {
  const adjacency = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.type !== 'supersedes' && relation.type !== 'revises') continue;
    const next = adjacency.get(relation.from_claim_id) ?? [];
    next.push(relation.to_claim_id);
    adjacency.set(relation.from_claim_id, next);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new AtlasError('RELATION_CYCLE', 'supersedes/revises enthalten einen Zyklus.');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of adjacency.keys()) visit(id);
}

function assertEvidenceSpan(snapshot: AtlasSnapshot, evidence: Evidence): void {
  const message = snapshot.messages.find((item) => item.revision_id === evidence.message_revision_id);
  if (!message) throw new AtlasError('BROKEN_REFERENCE', 'Beleg verweist auf keine Revision.');
  const part = message.parts[evidence.part_index];
  if (!part || part.kind !== 'text' || part.text === null) {
    throw new AtlasError('BROKEN_SPAN', 'Beleg muss genau einen Textteil treffen.');
  }
  if (hasLoneSurrogate(part.text)) throw new AtlasError('LONE_SURROGATE', 'Ungültige Surrogate haben keine Belegspanne.');
  const length = Array.from(part.text).length;
  if (evidence.start_cp < 0 || evidence.end_cp <= evidence.start_cp || evidence.end_cp > length) {
    throw new AtlasError('BROKEN_SPAN', 'Belegspanne liegt außerhalb des Textteils.');
  }
  if (sliceCodePoints(part.text, evidence.start_cp, evidence.end_cp) !== evidence.quote) {
    throw new AtlasError('BROKEN_SPAN', 'Belegtext entspricht nicht der Codepoint-Spanne.');
  }
  if (sha256Text(evidence.quote) !== evidence.quote_sha256) {
    throw new AtlasError('BROKEN_SPAN', 'quote_sha256 passt nicht zum Belegtext.');
  }
  const node = snapshot.nodes.find((item) => item.id === evidence.node_id);
  if (!node || node.message_revision_id !== message.revision_id) {
    throw new AtlasError('BROKEN_REFERENCE', 'node_id bindet nicht die belegte Revision.');
  }
  if (!message.occurrences.some((occurrence) => occurrence.node_id === evidence.node_id)) {
    throw new AtlasError('BROKEN_REFERENCE', 'Belegknoten fehlt in den Fundstellen.');
  }
}

function assertClaimShape(claim: Claim): void {
  if (claim.validity_kind === 'interval') {
    if (!claim.valid_from) throw new AtlasError('INVALID_VALIDITY', 'Ein Intervall braucht valid_from.');
    if (claim.valid_to && claim.valid_to <= claim.valid_from) {
      throw new AtlasError('INVALID_VALIDITY', 'valid_to muss nach valid_from liegen.');
    }
  }
  if (claim.validity_kind === 'timeless' && (claim.valid_from || claim.valid_to || claim.validity_basis !== 'reviewer_assigned')) {
    throw new AtlasError('INVALID_VALIDITY', 'timeless setzt beide Grenzen auf null und reviewer_assigned.');
  }
  if (claim.validity_kind === 'unknown' && (claim.valid_from || claim.valid_to || claim.validity_basis !== 'unknown')) {
    throw new AtlasError('INVALID_VALIDITY', 'unknown setzt beide Grenzen auf null und validity_basis unknown.');
  }
}

function assertReview(snapshot: AtlasSnapshot, review: ReviewEvent, claims: Map<string, Claim>, evidence: Map<string, Evidence>): void {
  if (review.target_type === 'claim' && !claims.has(review.target_id)) {
    throw new AtlasError('BROKEN_REFERENCE', 'Review verweist auf keine Karte.');
  }
  if (review.target_type === 'relation' && !snapshot.relations.some((relation) => relation.id === review.target_id)) {
    throw new AtlasError('BROKEN_REFERENCE', 'Review verweist auf keine Relation.');
  }
  if (review.target_type === 'memory_set' && review.action !== 'revoke_export') {
    throw new AtlasError('INVALID_REVIEW', 'Memory-Set-Reviews sind nur revoke_export.');
  }
  if (review.action === 'confirm_source') {
    const claim = claims.get(review.target_id);
    if (!claim || review.context_checked !== true || review.branch_checked !== true || review.evidence_ids.length === 0) {
      throw new AtlasError('INVALID_REVIEW', 'Quellenbestätigung ist unvollständig.');
    }
    if (!review.evidence_ids.every((id) => claim.evidence_ids.includes(id) && evidence.has(id))) {
      throw new AtlasError('INVALID_REVIEW', 'Quellenbestätigung nutzt fremde Belege.');
    }
    if (!review.evidence_ids.some((id) => evidence.get(id)?.relation === 'supports')) {
      throw new AtlasError('INVALID_REVIEW', 'Quellenbestätigung braucht einen stützenden Beleg.');
    }
  }
}

export function snapshotDigest(snapshot: AtlasSnapshot): string {
  return sha256Text(canonicalize(snapshot));
}

export function stateDigest(snapshot: AtlasSnapshot, selectedMemorySetId: string | null): string {
  const state = {
    workspace: snapshot.workspace,
    source_files: snapshot.source_files,
    import_batches: snapshot.import_batches,
    conversations: snapshot.conversations,
    nodes: snapshot.nodes,
    messages: snapshot.messages,
    claims: snapshot.claims,
    evidence: snapshot.evidence,
    relations: snapshot.relations,
    reviews: snapshot.reviews,
    memory_sets: snapshot.memory_sets,
    selected_memory_set_id: selectedMemorySetId,
  };
  return sha256Text(canonicalize(state));
}

export function validateSnapshot(input: unknown): AtlasSnapshot {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AtlasError('SCHEMA', 'Projekt ist kein Objekt.');
  }
  const version = (input as { schema_version?: unknown }).schema_version;
  if (typeof version === 'string') {
    const major = version.split('.')[0];
    if (major !== '1') throw new AtlasError('UNKNOWN_MAJOR_VERSION', `Schema-Major ${major} wird nicht geladen.`);
    if (version !== '1.0.0') throw new AtlasError('SCHEMA_VERSION', 'Nur Schema 1.0.0 ist in P1 ladbar. Es gibt keine ältere Minor-Version.');
  }
  walkPrivileged(input);
  if (!validateSchema(input)) {
    const detail = validateSchema.errors?.map((error) => `${error.instancePath} ${error.message}`).join('; ') ?? 'Schemafehler';
    throw new AtlasError('SCHEMA', detail);
  }
  const snapshot = input as AtlasSnapshot;
  if (snapshot.messages.length > LIMITS.messageRevisions) {
    throw new AtlasError('TOO_MANY_REVISIONS', 'Höchstens 100.000 Nachrichtenrevisionen.');
  }
  if (snapshot.reviews.length > LIMITS.reviews) {
    throw new AtlasError('TOO_MANY_REVIEWS', 'Höchstens 100.000 Review-Ereignisse.');
  }
  const bytes = utf8Bytes(JSON.stringify(snapshot)).byteLength;
  if (bytes > LIMITS.snapshotBytes) throw new AtlasError('SNAPSHOT_TOO_LARGE', 'Projekt überschreitet 256 MiB.');

  unique(snapshot.source_files.map((item) => item.id), 'source_files');
  unique(snapshot.messages.map((item) => item.revision_id), 'messages');
  unique(snapshot.messages.map((item) => item.logical_id + '\n' + item.revision_id), 'message revisions');
  unique(snapshot.nodes.map((item) => item.id), 'nodes');
  unique(snapshot.claims.map((item) => item.id), 'claims');
  unique(snapshot.evidence.map((item) => item.id), 'evidence');
  unique(snapshot.reviews.map((item) => item.id), 'reviews');
  unique(snapshot.relations.map((item) => item.id), 'relations');
  unique(snapshot.conversations.map((item) => item.id), 'conversations');
  unique(snapshot.import_batches.map((item) => item.id), 'import_batches');
  unique(snapshot.memory_sets.map((item) => item.id), 'memory_sets');

  const sources = new Set(snapshot.source_files.map((item) => item.id));
  const batches = new Set(snapshot.import_batches.map((item) => item.id));
  const conversations = new Set(snapshot.conversations.map((item) => item.id));
  const nodes = new Map(snapshot.nodes.map((item) => [item.id, item]));
  const evidence = new Map(snapshot.evidence.map((item) => [item.id, item]));
  const claims = new Map(snapshot.claims.map((item) => [item.id, item]));

  for (const source of snapshot.source_files) {
    if (sha256Text(source.raw_text) !== source.byte_sha256) {
      throw new AtlasError('SOURCE_HASH', 'Bytehash der Quelle passt nicht zum Text.');
    }
    const expected = derivedId('src_', {
      namespace: source.namespace,
      provider: source.provider,
      byte_sha256: source.byte_sha256,
    });
    if (source.id !== expected) throw new AtlasError('SOURCE_IDENTITY', 'SourceFile.id folgt nicht dem Vertrag.');
  }
  for (const conversation of snapshot.conversations) {
    const expected = derivedId('conv_', {
      namespace: conversation.source_namespace,
      provider: conversation.provider,
      external_id: conversation.external_id,
    });
    if (conversation.id !== expected) throw new AtlasError('CONVERSATION_IDENTITY', 'Conversation.id folgt nicht dem Vertrag.');
  }
  for (const message of snapshot.messages) {
    const conversation = snapshot.conversations.find((item) => item.id === message.conversation_id);
    if (!conversation) throw new AtlasError('BROKEN_REFERENCE', 'Nachricht ohne Gespräch.');
    const expectedLogical = derivedId('msg_', {
      namespace: conversation.source_namespace,
      provider: conversation.provider,
      conversation_external_id: conversation.external_id,
      message_external_id: message.external_id,
    });
    if (message.logical_id !== expectedLogical) throw new AtlasError('LOGICAL_IDENTITY', 'logical_id folgt nicht dem Vertrag.');
    if (message.occurrences.length === 0) throw new AtlasError('BROKEN_REFERENCE', 'Nachricht ohne Fundstelle.');
    const expected = derivedId('rev_', {
      logical_id: message.logical_id,
      role: message.role,
      sent_at: message.sent_at,
      parts: message.parts,
    });
    if (message.revision_id !== expected) throw new AtlasError('REVISION_IDENTITY', 'revision_id folgt nicht dem Inhalt.');
    for (const occurrence of message.occurrences) {
      if (!sources.has(occurrence.source_file_id) || !batches.has(occurrence.import_batch_id)) {
        throw new AtlasError('BROKEN_REFERENCE', 'Fundstelle ohne Quelle oder Import.');
      }
      const node = nodes.get(occurrence.node_id);
      if (!node || node.message_revision_id !== message.revision_id) {
        throw new AtlasError('BROKEN_REFERENCE', 'Fundstelle passt nicht zum Knoten.');
      }
    }
  }
  for (const node of snapshot.nodes) {
    if (!batches.has(node.import_batch_id) || !conversations.has(node.conversation_id)) {
      throw new AtlasError('BROKEN_REFERENCE', 'Knoten ohne Import oder Gespräch.');
    }
    if (node.parent_node_id && !nodes.has(node.parent_node_id)) {
      throw new AtlasError('BROKEN_REFERENCE', 'Elternknoten fehlt.');
    }
    if (node.child_node_ids.some((id) => !nodes.has(id))) throw new AtlasError('BROKEN_REFERENCE', 'Kindknoten fehlt.');
    const expected = derivedId('node_', {
      import_batch_id: node.import_batch_id,
      conversation_id: node.conversation_id,
      external_node_id: node.external_node_id,
    });
    if (node.id !== expected) throw new AtlasError('NODE_IDENTITY', 'Node.id folgt nicht dem Vertrag.');
  }
  for (const evidenceItem of snapshot.evidence) {
    assertEvidenceSpan(snapshot, evidenceItem);
    if (!evidence.has(evidenceItem.lineage_root_id)) throw new AtlasError('BROKEN_REFERENCE', 'lineage_root_id fehlt.');
  }
  for (const claim of snapshot.claims) {
    if (claim.scope.workspace_id !== snapshot.workspace.id) throw new AtlasError('BROKEN_REFERENCE', 'Claim-Workspace weicht ab.');
    if (claim.evidence_ids.length === 0 || claim.evidence_ids.some((id) => !evidence.has(id))) {
      throw new AtlasError('BROKEN_REFERENCE', 'Claim ohne gültige Belege.');
    }
    assertClaimShape(claim);
  }
  for (const relation of snapshot.relations) {
    if (relation.from_claim_id === relation.to_claim_id) throw new AtlasError('RELATION_CYCLE', 'Relation braucht zwei Karten.');
    if (!claims.has(relation.from_claim_id) || !claims.has(relation.to_claim_id)) {
      throw new AtlasError('BROKEN_REFERENCE', 'Relation ohne Karten.');
    }
  }
  assertAcyclic(snapshot.relations);
  const seqs = snapshot.reviews.map((review) => review.seq);
  const sorted = [...seqs].sort((a, b) => a - b);
  if (seqs.some((seq, index) => seq !== index + 1) || sorted.length !== new Set(seqs).size) {
    throw new AtlasError('REVIEW_SEQUENCE', 'Review-Sequenz muss bei 1 lückenlos steigen.');
  }
  let previousMs = Number.NEGATIVE_INFINITY;
  for (const review of snapshot.reviews) {
    const at = instantMs(review.recorded_at);
    if (at < previousMs) throw new AtlasError('REVIEW_TIME', 'Review-Zeit läuft zurück.');
    previousMs = at;
    assertReview(snapshot, review, claims, evidence);
  }
  const memorySetIds = new Set(snapshot.memory_sets.map((set) => set.id));
  for (const history of snapshot.export_history) {
    if (!memorySetIds.has(history.memory_set_id)) {
      throw new AtlasError('BROKEN_REFERENCE', 'Exporthistorie verweist auf kein Memory-Set.');
    }
  }
  for (const memorySet of snapshot.memory_sets) {
    if (memorySet.selected_claim_ids.some((id) => !claims.has(id))) {
      throw new AtlasError('BROKEN_REFERENCE', 'Memory-Set verweist auf eine fehlende Karte.');
    }
    if (memorySet.max_claims > LIMITS.maxClaims || memorySet.max_text_bytes > LIMITS.maxTextBytes) {
      throw new AtlasError('EXPORT_LIMIT', 'Memory-Set überschreitet die P1-Grenzen.');
    }
  }
  return snapshot;
}

export function emptySnapshot(now: string, workspaceId = 'ws_local'): AtlasSnapshot {
  return validateSnapshot({
    schema_version: '1.0.0',
    snapshot_id: 'snap_empty',
    created_at: now,
    workspace: {
      id: workspaceId,
      title: 'Arbeitsbereich',
      timezone: 'Europe/Berlin',
      created_at: now,
      topic_policy: 'ai_projects_only',
      policy_version: '1.0',
    },
    source_files: [],
    import_batches: [],
    conversations: [],
    nodes: [],
    messages: [],
    claims: [],
    evidence: [],
    relations: [],
    reviews: [],
    memory_sets: [],
    export_history: [],
  });
}
