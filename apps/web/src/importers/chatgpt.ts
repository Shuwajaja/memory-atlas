import { AtlasError } from '../domain/errors';
import { LIMITS } from '../domain/limits';
import type { BranchMembership, Diagnostic, MessageRole, Part } from '../domain/models.generated';
import { parseProviderTime } from '../domain/time';
import type { ParsedConversation, ParsedNode } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function roleOf(value: unknown): { role: MessageRole; unknown: boolean } {
  const role = isRecord(value) && typeof value.role === 'string' ? value.role : '';
  if (role === 'user' || role === 'assistant' || role === 'system' || role === 'tool') return { role, unknown: false };
  return { role: 'unknown', unknown: true };
}

function placeholder(kind: Part['kind'], label: string): Part {
  return { kind, text: null, label };
}

function partsFromContent(content: unknown, pointer: string, diagnostics: DiagnosticSeed[]): Part[] {
  if (!isRecord(content)) {
    diagnostics.push({ code: 'UNKNOWN_CONTENT', severity: 'warning', json_pointer: pointer });
    return [placeholder('unsupported', 'Nicht unterstützter Inhalt')];
  }
  const rawParts = Array.isArray(content.parts) ? content.parts : [];
  if (rawParts.length === 0) {
    diagnostics.push({ code: 'EMPTY_CONTENT', severity: 'warning', json_pointer: pointer });
    return [placeholder('unsupported', 'Leerer Inhalt')];
  }
  return rawParts.map((part, index) => {
    if (typeof part === 'string') return { kind: 'text', text: part, label: null };
    if (!isRecord(part)) {
      diagnostics.push({ code: 'UNKNOWN_PART', severity: 'warning', json_pointer: `${pointer}/parts/${index}` });
      return placeholder('unsupported', 'Nicht unterstützter Inhalt');
    }
    const type = typeof part.content_type === 'string' ? part.content_type : 'unknown';
    const ref = typeof part.asset_pointer === 'string' ? part.asset_pointer : type;
    if (type.includes('image')) return placeholder('image_placeholder', `Bildplatzhalter ${ref}`);
    if (type.includes('audio')) return placeholder('audio_placeholder', `Audioplatzhalter ${ref}`);
    if (type.includes('file')) return placeholder('file_placeholder', `Dateiplatzhalter ${ref}`);
    if (type.includes('tool')) return placeholder('tool_placeholder', `Werkzeugplatzhalter ${ref}`);
    diagnostics.push({ code: 'UNKNOWN_PART', severity: 'warning', json_pointer: `${pointer}/parts/${index}` });
    return placeholder('unsupported', `Nicht unterstützter Inhalt ${type}`);
  });
}

interface DiagnosticSeed {
  code: string;
  severity: Diagnostic['severity'];
  json_pointer: string;
}

interface RawNode {
  externalId: string;
  parent: string | null;
  children: string[];
  message: Record<string, unknown> | null;
}

export function parseChatGptDocument(
  value: unknown,
  options: { signal: AbortSignal; countMessage: () => void },
): ParsedConversation[] {
  if (!Array.isArray(value)) throw new AtlasError('UNSUPPORTED_PROFILE', 'ChatGPT-Mapping erwartet ein Array von Gesprächen.');
  return value.map((conversation, conversationIndex) => {
    if (options.signal.aborted) throw new AtlasError('CANCELLED', 'Import abgebrochen.');
    if (!isRecord(conversation) || !isRecord(conversation.mapping)) {
      throw new AtlasError('UNSUPPORTED_PROFILE', 'Die Datei hat kein ChatGPT-mapping.');
    }
    const externalId = typeof conversation.id === 'string' && conversation.id
      ? conversation.id
      : typeof conversation.conversation_id === 'string' && conversation.conversation_id
        ? conversation.conversation_id
        : `synthetic-${conversationIndex}`;
    const diagnostics: DiagnosticSeed[] = [];
    if (typeof conversation.id === 'string' && typeof conversation.conversation_id === 'string' && conversation.id !== conversation.conversation_id) {
      diagnostics.push({ code: 'ID_CONFLICT', severity: 'warning', json_pointer: `/${conversationIndex}` });
    }
    if (typeof conversation.id !== 'string' && typeof conversation.conversation_id !== 'string') {
      diagnostics.push({ code: 'MISSING_EXTERNAL_ID', severity: 'warning', json_pointer: `/${conversationIndex}` });
    }
    const created = parseProviderTime(conversation.create_time, 'unix-seconds');
    if (created.code) diagnostics.push({ code: created.code, severity: 'warning', json_pointer: `/${conversationIndex}/create_time` });
    const rawNodes: RawNode[] = [];
    for (const [key, nodeValue] of Object.entries(conversation.mapping)) {
      if (!isRecord(nodeValue)) {
        diagnostics.push({ code: 'INVALID_NODE', severity: 'error', json_pointer: `/${conversationIndex}/mapping/${key}` });
        continue;
      }
      const externalNodeId = typeof nodeValue.id === 'string' && nodeValue.id ? nodeValue.id : key;
      if (externalNodeId !== key) diagnostics.push({ code: 'NODE_KEY_MISMATCH', severity: 'info', json_pointer: `/${conversationIndex}/mapping/${key}` });
      const parent = nodeValue.parent === null || nodeValue.parent === undefined ? null : typeof nodeValue.parent === 'string' ? nodeValue.parent : null;
      if (nodeValue.parent !== null && nodeValue.parent !== undefined && typeof nodeValue.parent !== 'string') {
        diagnostics.push({ code: 'MISSING_PARENT', severity: 'warning', json_pointer: `/${conversationIndex}/mapping/${key}/parent` });
      }
      const children = Array.isArray(nodeValue.children) ? nodeValue.children.filter((child): child is string => typeof child === 'string') : [];
      const message = nodeValue.message === null || nodeValue.message === undefined ? null : isRecord(nodeValue.message) ? nodeValue.message : null;
      if (nodeValue.message !== null && nodeValue.message !== undefined && !isRecord(nodeValue.message)) {
        diagnostics.push({ code: 'INVALID_MESSAGE', severity: 'warning', json_pointer: `/${conversationIndex}/mapping/${key}/message` });
      }
      rawNodes.push({ externalId: externalNodeId, parent, children, message });
    }
    const byId = new Map(rawNodes.map((node) => [node.externalId, node]));
    for (const node of rawNodes) {
      for (const child of node.children) {
        const childNode = byId.get(child);
        if (!childNode) diagnostics.push({ code: 'MISSING_CHILD', severity: 'warning', json_pointer: `/${conversationIndex}/mapping/${node.externalId}/children` });
        else if (childNode.parent !== node.externalId) {
          diagnostics.push({ code: 'CHILDREN_MISMATCH', severity: 'warning', json_pointer: `/${conversationIndex}/mapping/${node.externalId}/children` });
        }
      }
    }
    const membership = classify(rawNodes, typeof conversation.current_node === 'string' ? conversation.current_node : null, diagnostics, conversationIndex, options.signal);
    let placeholderParts = 0;
    let unknownTimestamps = 0;
    let messageObjects = 0;
    const nodes: ParsedNode[] = rawNodes.map((node) => {
      const branch = membership.get(node.externalId) ?? 'unknown';
      if (!node.message) {
        return {
          externalId: node.externalId,
          parentExternalId: node.parent && byId.has(node.parent) ? node.parent : null,
          childExternalIds: node.children.filter((child) => byId.has(child)),
          branch,
          message: null,
        };
      }
      options.countMessage();
      messageObjects += 1;
      const messageId = typeof node.message.id === 'string' && node.message.id ? node.message.id : node.externalId;
      if (typeof node.message.id !== 'string') diagnostics.push({ code: 'MISSING_EXTERNAL_ID', severity: 'warning', json_pointer: `/${conversationIndex}/mapping/${node.externalId}/message` });
      const mappedRole = roleOf(node.message.author);
      if (mappedRole.unknown) diagnostics.push({ code: 'UNKNOWN_ROLE', severity: 'warning', json_pointer: `/${conversationIndex}/mapping/${node.externalId}/message/author` });
      const sent = parseProviderTime(node.message.create_time, 'unix-seconds');
      if (sent.code) {
        unknownTimestamps += 1;
        diagnostics.push({ code: sent.code, severity: 'warning', json_pointer: `/${conversationIndex}/mapping/${node.externalId}/message/create_time` });
      }
      const pointer = `/${conversationIndex}/mapping/${node.externalId}/message`;
      const parts = partsFromContent(node.message.content, pointer, diagnostics);
      placeholderParts += parts.filter((part) => part.kind !== 'text').length;
      return {
        externalId: node.externalId,
        parentExternalId: node.parent && byId.has(node.parent) ? node.parent : null,
        childExternalIds: node.children.filter((child) => byId.has(child)),
        branch,
        message: { externalId: messageId, role: mappedRole.role, sentAt: sent.iso, parts, pointer },
      };
    });
    return {
      provider: 'chatgpt',
      profile: 'chatgpt-mapping-v1',
      externalId,
      title: typeof conversation.title === 'string' && conversation.title ? conversation.title : 'Ohne Titel',
      createdAt: created.iso,
      nodes,
      diagnostics,
      placeholderParts,
      unknownTimestamps,
      messageObjects,
    };
  });
}

function classify(
  nodes: RawNode[],
  current: string | null,
  diagnostics: DiagnosticSeed[],
  conversationIndex: number,
  signal: AbortSignal,
): Map<string, BranchMembership> {
  const byId = new Map(nodes.map((node) => [node.externalId, node]));
  const result = new Map<string, BranchMembership>();
  const walk = (start: string): { chain: string[]; problem: 'PARENT_CYCLE' | 'MISSING_PARENT' | null } => {
    const chain: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null = start;
    let edges = 0;
    while (cursor) {
      if (signal.aborted) throw new AtlasError('CANCELLED', 'Import abgebrochen.');
      if (seen.has(cursor)) return { chain, problem: 'PARENT_CYCLE' };
      const node = byId.get(cursor);
      if (!node) return { chain, problem: 'MISSING_PARENT' };
      seen.add(cursor);
      chain.push(cursor);
      if (node.parent === null) break;
      edges += 1;
      if (edges > LIMITS.parentEdges) {
        throw new AtlasError('PARENT_TRAVERSAL_LIMIT', 'Mehr als 10.000 Elternkanten. Der nächste Schritt ist blockiert.');
      }
      if (!byId.has(node.parent)) return { chain, problem: 'MISSING_PARENT' };
      cursor = node.parent;
    }
    return { chain, problem: null };
  };
  const markUnknown = (code: string) => {
    diagnostics.push({ code, severity: 'warning', json_pointer: `/${conversationIndex}/current_node` });
    for (const node of nodes) result.set(node.externalId, 'unknown');
  };
  if (!current || !byId.has(current)) {
    markUnknown('INVALID_CURRENT_NODE');
    return result;
  }
  const selected = walk(current);
  if (selected.problem) {
    markUnknown(selected.problem);
    return result;
  }
  for (const id of selected.chain) result.set(id, 'selected');
  for (const node of nodes) {
    if (result.has(node.externalId)) continue;
    const walked = walk(node.externalId);
    if (walked.problem) {
      diagnostics.push({ code: walked.problem, severity: 'warning', json_pointer: `/${conversationIndex}/mapping/${node.externalId}` });
      result.set(node.externalId, 'unknown');
    } else result.set(node.externalId, 'alternate');
  }
  return result;
}

export type { BranchMembership };
