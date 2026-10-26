export type DetectedProfile = 'chatgpt-mapping-v1' | 'claude-chat-messages-v1' | 'unsupported';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function detectProfile(value: unknown): DetectedProfile {
  if (!Array.isArray(value) || value.length === 0) {
    if (Array.isArray(value)) return 'unsupported';
    return 'unsupported';
  }
  const first = value[0];
  if (!isRecord(first)) return 'unsupported';
  if (isRecord(first.mapping)) return 'chatgpt-mapping-v1';
  if (Array.isArray(first.chat_messages) && typeof first.uuid === 'string') return 'claude-chat-messages-v1';
  return 'unsupported';
}

export function isArchiveName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.zip') || lower.endsWith('.tgz') || lower.endsWith('.tar.gz') || lower.endsWith('.tar');
}
