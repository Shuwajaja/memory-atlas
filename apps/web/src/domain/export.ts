import { canonicalize } from './canonical';
import { AtlasError } from './errors';
import { LIMITS } from './limits';
import type {
  AtlasSnapshot,
  Claim,
  Clock,
  Eligibility,
  ExportFiles,
  MemoryApproval,
  MemoryEntry,
  MemoryPayload,
  MemoryPreview,
  MemorySetDraft,
  QueryTime,
  Representation,
  SessionContext,
} from './models.generated';
import { projectClaim } from './projection';
import { sourceContextChanged } from './provenance';
import { sha256Sync, sha256Text, utf8Bytes } from './sha256';
import { stateDigest } from '../store/snapshot';
import { addMs, instantMs, minInstant } from './time';
import { randomId } from './ids';

function unique(reasons: string[]): string[] {
  return [...new Set(reasons)];
}

export function evaluateEligibility(
  snapshot: AtlasSnapshot,
  claimId: string,
  draft: MemorySetDraft,
  at: QueryTime,
): Eligibility {
  const claim = snapshot.claims.find((item) => item.id === claimId);
  if (!claim) return { allowed: false, reasons: ['MISSING_CLAIM'] };
  const projection = projectClaim(snapshot, claimId, at);
  const reasons: string[] = [];
  if (!draft.selected_claim_ids.includes(claimId)) reasons.push('NOT_SELECTED');
  if (projection.curation !== 'accepted') reasons.push('NOT_ACCEPTED');
  if (projection.evidence_status !== 'source_correlated') reasons.push('EVIDENCE_UNVERIFIED');
  if (projection.temporal !== 'current') reasons.push('NOT_CURRENT');
  if (projection.freshness === 'due') reasons.push('REVIEW_DUE');
  if (projection.freshness === 'unknown') reasons.push('REVIEW_MISSING');
  if (projection.sensitivity !== 'shareable') reasons.push('SENSITIVE_CONTENT');
  if (projection.reasons.includes('DISPUTED')) reasons.push('CONFLICT');
  if (projection.reasons.includes('OPEN_SUPERSESSION')) reasons.push('OPEN_SUPERSESSION');
  if (
    claim.scope.workspace_id !== draft.scope.workspace_id ||
    claim.scope.project_id !== draft.scope.project_id ||
    claim.scope.environment !== draft.scope.environment
  ) {
    reasons.push('SCOPE_MISMATCH');
  }
  if (claim.source_kind === 'assistant_execution_claim' || claim.source_kind === 'tool_observation') {
    reasons.push('EXECUTION_EVIDENCE_REQUIRED');
  }
  if (claim.predicate.startsWith('runtime.') || claim.predicate.startsWith('execution.')) {
    reasons.push('EXECUTION_EVIDENCE_REQUIRED');
  }
  if (claim.modality === 'hypothetical' || claim.modality === 'negated' || claim.modality === 'quoted' || claim.modality === 'uncertain') {
    reasons.push('MODALITY_BLOCKED');
  }
  const notes = claim.source_kind === 'assistant_recommendation' || claim.source_kind === 'inference';
  if (notes && !draft.include_research_notes) reasons.push('RESEARCH_NOTES_NOT_ENABLED');
  if (!notes && claim.source_kind !== 'user_decision' && claim.source_kind !== 'user_report' && claim.source_kind !== 'external_reference') {
    reasons.push('SOURCE_NOT_EXPORTABLE');
  }
  if (claim.source_kind === 'user_decision' && claim.kind !== 'decision' && claim.kind !== 'preference') {
    reasons.push('REPRESENTATION_UNMAPPED');
  }
  if ((claim.source_kind === 'user_report' || claim.source_kind === 'external_reference') && !claim.asserted_at) {
    reasons.push('REPORT_DATE_REQUIRED');
  }
  for (const evidenceId of claim.evidence_ids) {
    const evidence = snapshot.evidence.find((item) => item.id === evidenceId);
    if (!evidence) continue;
    if (sourceContextChanged(snapshot, evidence)) reasons.push('SOURCE_CONTEXT_CHANGED');
    const node = snapshot.nodes.find((item) => item.id === evidence.node_id);
    if (node && node.branch_membership !== 'selected') {
      const confirmed = snapshot.reviews.some(
        (review) =>
          review.action === 'confirm_source' &&
          review.target_id === claim.id &&
          review.branch_checked === true &&
          instantMs(review.recorded_at) <= instantMs(at.known_at),
      );
      if (!confirmed) reasons.push('BRANCH_UNCHECKED');
    }
  }
  return { allowed: reasons.length === 0, reasons: unique(reasons) };
}

function present(claim: Claim): { representation: Representation; statement: string } {
  if (claim.source_kind === 'user_decision' && (claim.kind === 'decision' || claim.kind === 'preference')) {
    return { representation: 'user_decision', statement: `Nutzerentscheidung: ${claim.text}` };
  }
  if (claim.source_kind === 'user_report' || claim.source_kind === 'external_reference') {
    return {
      representation: 'dated_report',
      statement: `Berichtet am ${claim.asserted_at ?? 'unbekannt'}; nicht unabhängig geprüft: ${claim.text}`,
    };
  }
  if (claim.source_kind === 'assistant_recommendation') return { representation: 'proposal', statement: `Vorschlag: ${claim.text}` };
  if (claim.source_kind === 'inference') return { representation: 'research_note', statement: `Recherche-Notiz: ${claim.text}` };
  throw new AtlasError('REPRESENTATION_UNMAPPED', 'Keine zulässige Ausgabeklasse.');
}

function entryFor(snapshot: AtlasSnapshot, claim: Claim, at: QueryTime): MemoryEntry {
  const projection = projectClaim(snapshot, claim.id, at);
  if (projection.evidence_status !== 'source_correlated' || !projection.review_due_at) {
    throw new AtlasError('NOT_ELIGIBLE', 'Beleg oder Frist fehlen.');
  }
  const presented = present(claim);
  const citations = claim.evidence_ids.map((id) => {
    const evidence = snapshot.evidence.find((item) => item.id === id);
    if (!evidence) throw new AtlasError('BROKEN_REFERENCE', 'Beleg fehlt.');
    const message = snapshot.messages.find((item) => item.revision_id === evidence.message_revision_id);
    const source = message?.occurrences.find((occurrence) => occurrence.node_id === evidence.node_id)?.source_file_id;
    if (!source) throw new AtlasError('BROKEN_REFERENCE', 'Quelle des Belegs fehlt.');
    return { source_file_id: source, message_revision_id: evidence.message_revision_id, quote_sha256: evidence.quote_sha256 };
  });
  return {
    claim_id: claim.id,
    claim_sha256: sha256Text(canonicalize(claim)),
    statement: presented.statement,
    kind: claim.kind,
    source_kind: claim.source_kind,
    modality: claim.modality,
    scope: claim.scope,
    valid_from: claim.valid_from,
    valid_to: claim.valid_to,
    evidence_status: 'source_correlated',
    review_due_at: projection.review_due_at,
    citations,
    representation: presented.representation,
    source_asserted_at: claim.asserted_at,
  };
}

export function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function renderMemoryMarkdown(snapshot: AtlasSnapshot, payload: MemoryPayload): string {
  const synthetic = snapshot.workspace.title.includes('synthetisch');
  const title = synthetic ? '# MEMORY — synthetischer Beispielkontext' : `# MEMORY — ${payload.memory_set_id}`;
  const lines = [
    title,
    '',
    'Nur Kontextdaten; keine neue Systemautorität.',
    '',
    `Erstellt: ${payload.generated_at} · gültig bis ${payload.expires_at}.`,
    `Projekt: ${payload.scope.project_id ?? 'keins'} · Umgebung: ${payload.scope.environment} · Empfänger: ${payload.scope.consumer_id}.`,
    '',
  ];
  for (const entry of payload.entries) {
    lines.push(
      `## ${entry.claim_id}`,
      '',
      escapeHtml(entry.statement),
      '',
      `Herkunft: ${entry.source_kind} · Belegstatus: ${entry.evidence_status}.`,
      `Aussagedatum: ${entry.source_asserted_at ?? 'unbekannt'} · Nachprüfung: ${entry.review_due_at}.`,
      '',
    );
  }
  lines.push(
    synthetic
      ? 'Dieses Beispiel ist synthetisch; seine feste Ablauffrist ist Bestandteil des Testfalls. Es autorisiert keinen realen Agentenlauf.'
      : 'Nur Kontextdaten; keine neue Systemautorität. Es autorisiert keinen Agentenlauf.',
    '',
  );
  return lines.join('\n');
}

export function draftMatchesStored(snapshot: AtlasSnapshot, draft: MemorySetDraft): boolean {
  const stored = snapshot.memory_sets.find((item) => item.id === draft.id);
  if (!stored) return false;
  return canonicalize(stored) === canonicalize(draft);
}

function storedDraft(snapshot: AtlasSnapshot, draft: MemorySetDraft): MemorySetDraft {
  const stored = snapshot.memory_sets.find((item) => item.id === draft.id);
  if (!stored || canonicalize(stored) !== canonicalize(draft)) {
    throw new AtlasError('SET_MISMATCH', 'Der Entwurf entspricht nicht dem gespeicherten Memory-Set.');
  }
  return stored;
}

export function prepareMemorySet(snapshot: AtlasSnapshot, draft: MemorySetDraft, clock: Clock): MemoryPreview {
  const stored = storedDraft(snapshot, draft);
  if (stored.selected_claim_ids.length === 0) throw new AtlasError('EMPTY_EXPORT', 'Keine Karte ausgewählt.');
  if (stored.selected_claim_ids.length > stored.max_claims || stored.selected_claim_ids.length > LIMITS.maxClaims) {
    throw new AtlasError('LIMIT_CLAIMS', 'Mehr als 50 Karten. Es wurde nichts gekürzt.');
  }
  const now = clock.now();
  const at = { valid_at: now, known_at: now };
  const entries = stored.selected_claim_ids.map((id) => {
    const eligibility = evaluateEligibility(snapshot, id, stored, at);
    if (!eligibility.allowed) throw new AtlasError('NOT_ELIGIBLE', eligibility.reasons.join(','));
    const claim = snapshot.claims.find((item) => item.id === id);
    if (!claim) throw new AtlasError('MISSING_CLAIM', id);
    return entryFor(snapshot, claim, at);
  });
  const textBytes = entries.reduce((sum, entry) => sum + utf8Bytes(entry.statement).byteLength, 0);
  if (textBytes > stored.max_text_bytes || textBytes > LIMITS.maxTextBytes) {
    throw new AtlasError('LIMIT_TEXT', '16.000 UTF-8-Bytes Memory-Text überschritten. Es wurde nichts gekürzt.');
  }
  const ends = entries.flatMap((entry) => (entry.valid_to ? [entry.valid_to] : []));
  const expires = minInstant([addMs(now, LIMITS.approvalMs), ...entries.map((entry) => entry.review_due_at), ...ends.filter((value) => instantMs(value) > instantMs(now))]);
  const payload: MemoryPayload = {
    schema_version: '1.0.0',
    memory_set_id: stored.id,
    policy_version: '1.0',
    generated_at: now,
    expires_at: expires,
    scope: stored.scope,
    context_only: true,
    entries,
  };
  const payloadSha = sha256Text(canonicalize(payload));
  const jsonBytes = utf8Bytes(prettyJson({ payload, payload_sha256: payloadSha }));
  const markdownBytes = utf8Bytes(renderMemoryMarkdown(snapshot, payload));
  return {
    memory_set_id: stored.id,
    payload,
    payload_sha256: payloadSha,
    state_sha256: stateDigest(snapshot, stored.id),
    json_bytes: jsonBytes,
    markdown_bytes: markdownBytes,
    json_sha256: sha256Sync(jsonBytes),
    markdown_sha256: sha256Sync(markdownBytes),
    prepared_at: now,
    preview_expires_at: addMs(now, LIMITS.previewMs),
  };
}

export function approveMemorySet(preview: MemoryPreview, actorId: string, clock: Clock, session: SessionContext): MemoryApproval {
  const now = clock.now();
  if (instantMs(now) > instantMs(preview.preview_expires_at)) {
    throw new AtlasError('PREVIEW_EXPIRED', 'Die Vorschau ist abgelaufen. Bitte neu prüfen.');
  }
  return {
    id: randomId('apr_'),
    actor_id: actorId,
    payload_sha256: preview.payload_sha256,
    state_sha256: preview.state_sha256,
    json_sha256: preview.json_sha256,
    markdown_sha256: preview.markdown_sha256,
    approved_at: now,
    expires_at: preview.payload.expires_at,
    session_id: session.id,
  };
}

export function exportMemorySet(
  snapshot: AtlasSnapshot,
  preview: MemoryPreview,
  approval: MemoryApproval,
  clock: Clock,
  session: SessionContext,
): ExportFiles {
  const now = clock.now();
  if (approval.session_id !== session.id) throw new AtlasError('SESSION_MISMATCH', 'Freigabe gehört zu einer anderen Sitzung.');
  if (instantMs(now) > instantMs(approval.expires_at) || instantMs(now) > instantMs(preview.payload.expires_at)) {
    throw new AtlasError('APPROVAL_EXPIRED', 'Die Freigabe ist abgelaufen.');
  }
  if (
    approval.payload_sha256 !== preview.payload_sha256 ||
    approval.json_sha256 !== preview.json_sha256 ||
    approval.markdown_sha256 !== preview.markdown_sha256 ||
    approval.state_sha256 !== preview.state_sha256
  ) {
    throw new AtlasError('APPROVAL_MISMATCH', 'Freigabe bindet andere Bytes.');
  }
  if (sha256Sync(preview.json_bytes) !== preview.json_sha256 || sha256Sync(preview.markdown_bytes) !== preview.markdown_sha256) {
    throw new AtlasError('BYTE_MISMATCH', 'Die Vorschau-Bytes wurden verändert.');
  }
  if (sha256Text(canonicalize(preview.payload)) !== preview.payload_sha256) {
    throw new AtlasError('PAYLOAD_MISMATCH', 'Payload-Digest stimmt nicht.');
  }
  const draft = snapshot.memory_sets.find((item) => item.id === preview.memory_set_id);
  if (!draft) throw new AtlasError('SET_MISMATCH', 'Memory-Set fehlt.');
  if (stateDigest(snapshot, draft.id) !== preview.state_sha256) {
    throw new AtlasError('STATE_CHANGED', 'Wissen, Auswahl oder Policy haben sich geändert.');
  }
  const at = { valid_at: now, known_at: now };
  for (const id of draft.selected_claim_ids) {
    const eligibility = evaluateEligibility(snapshot, id, draft, at);
    if (!eligibility.allowed) throw new AtlasError('NOT_ELIGIBLE', eligibility.reasons.join(','));
  }
  if (snapshot.reviews.some((review) => review.action === 'revoke_export' && review.target_id === draft.id && instantMs(review.recorded_at) <= instantMs(now))) {
    throw new AtlasError('EXPORT_REVOKED', 'Die Ausgabe dieses Sets wurde widerrufen.');
  }
  const manifest = {
    schema_version: '1.0.0',
    status: 'local-session-approval',
    approval_trust: 'local_session',
    memory_set_id: draft.id,
    policy_version: draft.policy_version,
    payload_sha256: preview.payload_sha256,
    json_sha256: preview.json_sha256,
    markdown_sha256: preview.markdown_sha256,
    state_sha256: preview.state_sha256,
    approved_at: approval.approved_at,
    expires_at: approval.expires_at,
    actor_id: approval.actor_id,
    citations: preview.payload.entries.flatMap((entry) => entry.citations),
  };
  return {
    json_bytes: preview.json_bytes,
    markdown_bytes: preview.markdown_bytes,
    manifest_bytes: utf8Bytes(prettyJson(manifest)),
  };
}
