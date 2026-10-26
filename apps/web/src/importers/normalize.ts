import { AtlasError } from '../domain/errors';
import { derivedId, randomId } from '../domain/ids';
import { LIMITS } from '../domain/limits';
import type {
  AtlasSnapshot,
  Clock,
  Diagnostic,
  ImportOptions,
  InputFile,
  Message,
  Node,
  NormalizedImport,
} from '../domain/models.generated';
import { sha256Sync } from '../domain/sha256';
import { snapshotDigest, validateSnapshot } from '../store/snapshot';
import { parseChatGptDocument } from './chatgpt';
import { parseClaudeDocument } from './claude';
import { detectProfile, isArchiveName } from './detect';
import { decodeUtf8, parseJsonText } from './json-scan';
import type { ParsedConversation } from './types';

const ADAPTER_VERSION = 'p1.0.0';
export const ARCHIVE_MESSAGE = 'Entpacke den Export auf deinem Gerät. Wähle anschließend conversations.json beziehungsweise alle nummerierten Conversation-JSON-Dateien gemeinsam aus.';
export const HTML_MESSAGE = 'chat.html wird nicht ausgeführt und nicht als Import angenommen.';

export async function parseImport(
  files: readonly InputFile[],
  base: AtlasSnapshot,
  options: ImportOptions,
  clock: Clock,
  signal: AbortSignal,
): Promise<NormalizedImport> {
  if (signal.aborted) throw new AtlasError('CANCELLED', 'Import abgebrochen.');
  if (files.length > LIMITS.files) throw new AtlasError('TOO_MANY_FILES', 'Höchstens 500 Dateien pro Auswahl.');
  let totalBytes = 0;
  for (const file of files) {
    if (isArchiveName(file.name)) throw new AtlasError('ARCHIVE_NOT_SUPPORTED', ARCHIVE_MESSAGE);
    if (file.name.toLowerCase().endsWith('.html')) throw new AtlasError('HTML_NOT_SUPPORTED', HTML_MESSAGE);
    if (file.bytes.byteLength > LIMITS.fileBytes) {
      throw new AtlasError('FILE_TOO_LARGE', `${file.name} überschreitet 32 MiB. Teile die Auswahl oder entferne die Datei.`);
    }
    totalBytes += file.bytes.byteLength;
    if (totalBytes > LIMITS.batchBytes) throw new AtlasError('BATCH_TOO_LARGE', 'Die Auswahl überschreitet 128 MiB.');
  }
  const validatedBase = validateSnapshot(base);
  const baseSha = snapshotDigest(validatedBase);
  const next = structuredClone(validatedBase);
  const now = clock.now();
  const diagnostics: Diagnostic[] = [];
  const report = {
    new_conversations: 0,
    new_logical_messages: 0,
    new_revisions: 0,
    unchanged_revisions: 0,
    placeholder_parts: 0,
    unknown_timestamps: 0,
    diagnostics,
  };
  let seenMessages = 0;
  const countMessage = () => {
    seenMessages += 1;
    if (seenMessages > LIMITS.messages) {
      throw new AtlasError('TOO_MANY_MESSAGES', 'Höchstens 100.000 Nachrichten vor der Deduplizierung.');
    }
  };
  const sourceIds: string[] = [];
  for (const file of files) {
    if (signal.aborted) throw new AtlasError('CANCELLED', 'Import abgebrochen.');
    const text = decodeUtf8(file.bytes, file.name);
    const scanned = parseJsonText(text.replace(/^\uFEFF/, ''));
    if (Array.isArray(scanned.value) && scanned.value.length === 0) {
      const sourceId = rememberSource(next, file, text, options, now, 'manual');
      sourceIds.push(sourceId);
      const diagnostic = { code: 'EMPTY_IMPORT', severity: 'info' as const, source_file_id: sourceId, json_pointer: '' };
      diagnostics.push(diagnostic);
      next.import_batches.push({
        id: randomId('imp_'),
        source_file_ids: [sourceId],
        completed_at: now,
        adapter_version: ADAPTER_VERSION,
        diagnostics: [diagnostic],
      });
      continue;
    }
    const detected = detectProfile(scanned.value);
    const profile = options.profile === 'auto' ? detected : options.profile;
    if (profile === 'unsupported' || detected === 'unsupported' || (options.profile !== 'auto' && detected !== options.profile)) {
      throw new AtlasError('UNSUPPORTED_PROFILE', `${file.name} hat kein freigegebenes Importprofil. Der Inhalt wird nicht als eine Nachricht übernommen.`);
    }
    if (profile === 'claude-chat-messages-v1' && !options.claude_profile_approved) {
      throw new AtlasError('PROFILE_NOT_APPROVED', 'Das Claude-Profil ist nicht freigegeben. Synthetische Fixtures ersetzen kein reales Sample.');
    }
    const provider = profile === 'chatgpt-mapping-v1' ? 'chatgpt' : 'claude';
    const sourceId = rememberSource(next, file, text, options, now, provider, profile);
    sourceIds.push(sourceId);
    const batchId = randomId('imp_');
    const diagnosticStart = diagnostics.length;
    if (scanned.loneSurrogates > 0) {
      diagnostics.push({ code: 'LONE_SURROGATE', severity: 'warning', source_file_id: sourceId, json_pointer: '' });
    }
    const parsed = profile === 'chatgpt-mapping-v1'
      ? parseChatGptDocument(scanned.value, { signal, countMessage })
      : parseClaudeDocument(scanned.value, signal);
    if (profile === 'claude-chat-messages-v1') {
      for (const conversation of parsed) {
        for (let index = 0; index < conversation.messageObjects; index += 1) countMessage();
      }
    }
    for (const conversation of parsed) mergeConversation(next, conversation, sourceId, batchId, options.namespace, now, report);
    next.import_batches.push({
      id: batchId,
      source_file_ids: [sourceId],
      completed_at: now,
      adapter_version: ADAPTER_VERSION,
      diagnostics: diagnostics.slice(diagnosticStart).map((item) => ({ ...item })),
    });
  }
  if (sourceIds.length === 0) throw new AtlasError('EMPTY_IMPORT', 'Keine Datei ausgewählt.');
  next.snapshot_id = randomId('snap_');
  next.created_at = now;
  const validated = validateSnapshot(next);
  return { base_snapshot_sha256: baseSha, next_snapshot: validated, report };
}

function rememberSource(
  snapshot: AtlasSnapshot,
  file: InputFile,
  text: string,
  options: ImportOptions,
  now: string,
  provider: 'chatgpt' | 'claude' | 'manual',
  profile = 'none',
): string {
  const byteSha = sha256Sync(file.bytes);
  const id = derivedId('src_', { namespace: options.namespace, provider, byte_sha256: byteSha });
  if (!snapshot.source_files.some((source) => source.id === id)) {
    snapshot.source_files.push({
      id,
      namespace: options.namespace,
      provider,
      original_name: file.name,
      byte_sha256: byteSha,
      imported_at: now,
      adapter_profile: profile,
      raw_text: text,
    });
  }
  return id;
}

function mergeConversation(
  snapshot: AtlasSnapshot,
  parsed: ParsedConversation,
  sourceId: string,
  batchId: string,
  namespace: string,
  now: string,
  report: {
    new_conversations: number;
    new_logical_messages: number;
    new_revisions: number;
    unchanged_revisions: number;
    placeholder_parts: number;
    unknown_timestamps: number;
    diagnostics: Diagnostic[];
  },
): void {
  report.placeholder_parts += parsed.placeholderParts;
  report.unknown_timestamps += parsed.unknownTimestamps;
  for (const diagnostic of parsed.diagnostics) {
    report.diagnostics.push({ ...diagnostic, source_file_id: sourceId });
  }
  const conversationId = derivedId('conv_', { namespace, provider: parsed.provider, external_id: parsed.externalId });
  if (!snapshot.conversations.some((conversation) => conversation.id === conversationId)) {
    snapshot.conversations.push({
      id: conversationId,
      source_namespace: namespace,
      provider: parsed.provider,
      external_id: parsed.externalId,
      title: parsed.title,
      created_at: parsed.createdAt,
    });
    report.new_conversations += 1;
  } else if (snapshot.conversations.some((conversation) => conversation.id === conversationId && conversation.title !== parsed.title)) {
    report.diagnostics.push({ code: 'TITLE_CHANGED', severity: 'info', source_file_id: sourceId, json_pointer: '' });
  }
  const internal = new Map<string, string>();
  for (const node of parsed.nodes) {
    internal.set(node.externalId, derivedId('node_', { import_batch_id: batchId, conversation_id: conversationId, external_node_id: node.externalId }));
  }
  for (const node of parsed.nodes) {
    let revisionId: string | null = null;
    if (node.message) {
      const logicalId = derivedId('msg_', {
        namespace,
        provider: parsed.provider,
        conversation_external_id: parsed.externalId,
        message_external_id: node.message.externalId,
      });
      const draft: Message = {
        revision_id: 'pending',
        logical_id: logicalId,
        conversation_id: conversationId,
        external_id: node.message.externalId,
        role: node.message.role,
        sent_at: node.message.sentAt,
        recorded_at: now,
        parts: node.message.parts,
        occurrences: [],
      };
      draft.revision_id = derivedId('rev_', {
        logical_id: draft.logical_id,
        role: draft.role,
        sent_at: draft.sent_at,
        parts: draft.parts,
      });
      revisionId = draft.revision_id;
      const nodeId = internal.get(node.externalId);
      if (!nodeId) throw new AtlasError('BROKEN_REFERENCE', 'Knoten-ID fehlt.');
      const occurrence = { source_file_id: sourceId, import_batch_id: batchId, json_pointer: node.message.pointer, node_id: nodeId };
      const existing = snapshot.messages.find((message) => message.revision_id === draft.revision_id);
      if (existing) {
        if (!existing.occurrences.some((item) => item.node_id === occurrence.node_id && item.json_pointer === occurrence.json_pointer && item.source_file_id === occurrence.source_file_id)) {
          existing.occurrences.push(occurrence);
        }
        report.unchanged_revisions += 1;
      } else {
        draft.occurrences = [occurrence];
        const prior = snapshot.messages.some((message) => message.logical_id === logicalId);
        snapshot.messages.push(draft);
        if (prior) report.new_revisions += 1;
        else report.new_logical_messages += 1;
      }
    }
    const nodeId = internal.get(node.externalId);
    if (!nodeId) continue;
    const stored: Node = {
      id: nodeId,
      import_batch_id: batchId,
      conversation_id: conversationId,
      external_node_id: node.externalId,
      parent_node_id: node.parentExternalId ? internal.get(node.parentExternalId) ?? null : null,
      child_node_ids: node.childExternalIds.flatMap((child) => {
        const id = internal.get(child);
        return id ? [id] : [];
      }),
      message_revision_id: revisionId,
      branch_membership: node.branch,
    };
    snapshot.nodes.push(stored);
  }
}

export function commitImport(store: { read(): AtlasSnapshot; replace(expected: string, next: AtlasSnapshot): void }, staged: NormalizedImport): void {
  store.replace(staged.base_snapshot_sha256, staged.next_snapshot);
}
