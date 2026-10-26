import { AtlasError } from '../domain/errors';
import type { MessageRole, Part } from '../domain/models.generated';
import { parseProviderTime } from '../domain/time';
import type { DiagnosticSeed, ParsedConversation, ParsedNode } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function roleOf(sender: unknown): MessageRole {
  if (sender === 'human' || sender === 'user') return 'user';
  if (sender === 'assistant') return 'assistant';
  if (sender === 'system') return 'system';
  if (sender === 'tool') return 'tool';
  return 'unknown';
}

export function parseClaudeDocument(value: unknown, signal: AbortSignal): ParsedConversation[] {
  if (!Array.isArray(value)) throw new AtlasError('UNSUPPORTED_PROFILE', 'Claude-Chatnachrichten erwarten ein Array.');
  return value.map((conversation, conversationIndex) => {
    if (signal.aborted) throw new AtlasError('CANCELLED', 'Import abgebrochen.');
    if (!isRecord(conversation) || !Array.isArray(conversation.chat_messages)) {
      throw new AtlasError('UNSUPPORTED_PROFILE', 'Keine chat_messages-Hülle.');
    }
    const diagnostics: DiagnosticSeed[] = [];
    const externalId = typeof conversation.uuid === 'string' && conversation.uuid ? conversation.uuid : `synthetic-claude-${conversationIndex}`;
    if (typeof conversation.uuid !== 'string') diagnostics.push({ code: 'MISSING_EXTERNAL_ID', severity: 'warning', json_pointer: `/${conversationIndex}` });
    let placeholderParts = 0;
    let unknownTimestamps = 0;
    const nodes: ParsedNode[] = conversation.chat_messages.map((message, messageIndex) => {
      if (!isRecord(message)) throw new AtlasError('UNSUPPORTED_PROFILE', 'Claude-Nachricht ist kein Objekt.');
      const pointer = `/${conversationIndex}/chat_messages/${messageIndex}`;
      const content = Array.isArray(message.content) ? message.content : [];
      const textBlocks = content.filter((block) => isRecord(block) && block.type === 'text' && typeof block.text === 'string');
      const parts: Part[] = [];
      if (textBlocks.length > 0) {
        for (const [blockIndex, block] of content.entries()) {
          if (!isRecord(block)) {
            diagnostics.push({ code: 'UNKNOWN_PART', severity: 'warning', json_pointer: `${pointer}/content/${blockIndex}` });
            parts.push({ kind: 'unsupported', text: null, label: 'Nicht unterstützter Inhalt' });
            continue;
          }
          if (block.type === 'text' && typeof block.text === 'string') parts.push({ kind: 'text', text: block.text, label: null });
          else if (block.type === 'image') parts.push({ kind: 'image_placeholder', text: null, label: 'Bildplatzhalter' });
          else if (typeof block.type === 'string' && block.type.includes('tool')) parts.push({ kind: 'tool_placeholder', text: null, label: 'Werkzeugplatzhalter' });
          else {
            diagnostics.push({ code: 'UNKNOWN_PART', severity: 'warning', json_pointer: `${pointer}/content/${blockIndex}` });
            parts.push({ kind: 'unsupported', text: null, label: 'Nicht unterstützter Inhalt' });
          }
        }
        if (typeof message.text === 'string' && !textBlocks.some((block) => isRecord(block) && block.text === message.text)) {
          diagnostics.push({ code: 'TEXT_FIELD_DIVERGENCE', severity: 'warning', json_pointer: `${pointer}/text` });
          parts.push({ kind: 'text', text: message.text, label: null });
        }
      } else if (typeof message.text === 'string') parts.push({ kind: 'text', text: message.text, label: null });
      else parts.push({ kind: 'unsupported', text: null, label: 'Leerer Inhalt' });
      placeholderParts += parts.filter((part) => part.kind !== 'text').length;
      const sent = parseProviderTime(message.created_at, 'rfc3339');
      if (sent.code) {
        unknownTimestamps += 1;
        diagnostics.push({ code: sent.code, severity: 'warning', json_pointer: `${pointer}/created_at` });
      }
      const role = roleOf(message.sender);
      if (role === 'unknown') diagnostics.push({ code: 'UNKNOWN_ROLE', severity: 'warning', json_pointer: `${pointer}/sender` });
      const messageId = typeof message.uuid === 'string' && message.uuid ? message.uuid : `synthetic-${conversationIndex}-${messageIndex}`;
      return {
        externalId: messageId,
        parentExternalId: null,
        childExternalIds: [],
        branch: 'unknown' as const,
        message: { externalId: messageId, role, sentAt: sent.iso, parts, pointer },
      };
    });
    return {
      provider: 'claude',
      profile: 'claude-chat-messages-v1',
      externalId,
      title: typeof conversation.name === 'string' && conversation.name ? conversation.name : 'Ohne Titel',
      createdAt: null,
      nodes,
      diagnostics,
      placeholderParts,
      unknownTimestamps,
      messageObjects: nodes.length,
    };
  });
}
