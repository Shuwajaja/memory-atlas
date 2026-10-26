import { AtlasError } from './errors';

function encodeString(value: string): string {
  let out = '"';
  for (const ch of value) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || (cp >= 0xd800 && cp <= 0xdfff)) {
      throw new AtlasError('CANONICAL_SURROGATE', 'Kanonisierung erlaubt keine ungepaarten Surrogate.');
    }
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\f') out += '\\f';
    else if (ch === '\r') out += '\\r';
    else if (cp <= 0x1f) out += `\\u${cp.toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return `${out}"`;
}

function encode(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new AtlasError('CANONICAL_NUMBER', 'Kanonisierung erlaubt nur sichere ganze Zahlen ab 0.');
    }
    return String(value);
  }
  if (typeof value === 'string') return encodeString(value);
  if (Array.isArray(value)) return `[${value.map((item) => encode(item)).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${encodeString(key)}:${encode(record[key])}`).join(',')}}`;
  }
  throw new AtlasError('CANONICAL_TYPE', 'Dieser Wert kann nicht kanonisiert werden.');
}

export function canonicalize(value: unknown): string {
  return encode(value);
}
