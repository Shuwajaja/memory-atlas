import type { AtlasSnapshot, Evidence, EvidenceResult } from './models.generated';
import { sha256Text } from './sha256';

export function codePointLength(text: string): number {
  return Array.from(text).length;
}

export function sliceCodePoints(text: string, start: number, end: number): string {
  return Array.from(text).slice(start, end).join('');
}

export function hasLoneSurrogate(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

export function utf16OffsetToCodePoint(text: string, utf16Offset: number): number | null {
  if (utf16Offset < 0 || utf16Offset > text.length) return null;
  let units = 0;
  let points = 0;
  for (const ch of text) {
    if (units === utf16Offset) return points;
    units += ch.length;
    points += 1;
    if (units > utf16Offset) return null;
  }
  return units === utf16Offset ? points : null;
}

export function validateEvidence(snapshot: AtlasSnapshot, evidence: Evidence): EvidenceResult {
  const reasons: string[] = [];
  const message = snapshot.messages.find((item) => item.revision_id === evidence.message_revision_id);
  if (!message) reasons.push('REVISION_MISSING');
  else {
    if (evidence.part_index < 0 || evidence.part_index >= message.parts.length) reasons.push('PART_INDEX');
    else {
      const part = message.parts[evidence.part_index];
      if (!part || part.kind !== 'text' || part.text === null) reasons.push('NOT_TEXT_PART');
      else if (hasLoneSurrogate(part.text)) reasons.push('LONE_SURROGATE');
      else {
        const length = codePointLength(part.text);
        if (evidence.start_cp < 0 || evidence.end_cp <= evidence.start_cp || evidence.end_cp > length) {
          reasons.push('SPAN_BOUNDS');
        } else if (sliceCodePoints(part.text, evidence.start_cp, evidence.end_cp) !== evidence.quote) {
          reasons.push('QUOTE_MISMATCH');
        }
      }
    }
    const node = snapshot.nodes.find((item) => item.id === evidence.node_id);
    if (!node || node.message_revision_id !== message.revision_id) reasons.push('NODE_BINDING');
    else if (!message.occurrences.some((occurrence) => occurrence.node_id === evidence.node_id)) {
      reasons.push('OCCURRENCE_BINDING');
    }
  }
  if (sha256Text(evidence.quote) !== evidence.quote_sha256) reasons.push('QUOTE_HASH');
  if (evidence.relation !== 'supports' && evidence.relation !== 'refutes' && evidence.relation !== 'context') {
    reasons.push('RELATION');
  }
  return { valid: reasons.length === 0, reasons };
}

export function sourceContextChanged(snapshot: AtlasSnapshot, evidence: Evidence): boolean {
  const message = snapshot.messages.find((item) => item.revision_id === evidence.message_revision_id);
  const node = snapshot.nodes.find((item) => item.id === evidence.node_id);
  if (!message || !node) return true;
  const revised = snapshot.messages.some(
    (item) => item.logical_id === message.logical_id && item.revision_id !== message.revision_id,
  );
  if (revised) return true;
  const conversationNodes = snapshot.nodes.filter((item) => item.conversation_id === node.conversation_id);
  const batches = new Map(snapshot.import_batches.map((batch) => [batch.id, batch.completed_at]));
  let latest = '';
  let latestId = '';
  for (const item of conversationNodes) {
    const completed = batches.get(item.import_batch_id) ?? '';
    if (completed >= latest) {
      latest = completed;
      latestId = item.import_batch_id;
    }
  }
  const current = conversationNodes.find(
    (item) => item.import_batch_id === latestId && item.external_node_id === node.external_node_id,
  );
  if (!current) return true;
  if (current.branch_membership !== 'selected') return true;
  if (current.message_revision_id !== evidence.message_revision_id) return true;
  return false;
}
