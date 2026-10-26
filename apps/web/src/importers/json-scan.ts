import { AtlasError } from '../domain/errors';
import { LIMITS } from '../domain/limits';

export interface JsonScanResult {
  value: unknown;
  loneSurrogates: number;
}

export function parseJsonText(input: string): JsonScanResult {
  let index = 0;
  let loneSurrogates = 0;
  const length = input.length;

  function fail(code: string, message: string): never {
    throw new AtlasError(code, message);
  }

  function skip(): void {
    while (index < length) {
      const ch = input[index];
      if (ch !== ' ' && ch !== '\n' && ch !== '\r' && ch !== '\t') break;
      index += 1;
    }
  }

  function parseValue(depth: number): unknown {
    skip();
    if (index >= length) fail('INVALID_JSON', 'Unerwartetes Ende der JSON-Datei.');
    const ch = input[index];
    if (ch === '{') return parseObject(depth);
    if (ch === '[') return parseArray(depth);
    if (ch === '"') return parseString();
    if (ch === 't') return parseLiteral('true', true);
    if (ch === 'f') return parseLiteral('false', false);
    if (ch === 'n') return parseLiteral('null', null);
    if (ch === '-' || (ch >= '0' && ch <= '9')) return parseNumber();
    fail('INVALID_JSON', 'Unerwartetes Zeichen in der JSON-Datei.');
  }

  function parseObject(depth: number): Record<string, unknown> {
    if (depth > LIMITS.jsonDepth) fail('JSON_DEPTH', 'JSON-Tiefe 128 ist die Grenze. Die nächste Ebene wird abgewiesen.');
    index += 1;
    const obj = Object.create(null) as Record<string, unknown>;
    const seen = new Set<string>();
    skip();
    if (input[index] === '}') {
      index += 1;
      return obj;
    }
    while (index < length) {
      skip();
      if (input[index] !== '"') fail('INVALID_JSON', 'Objektschlüssel erwartet.');
      const key = parseString();
      if (seen.has(key)) fail('DUPLICATE_JSON_KEY', 'Doppelte JSON-Schlüssel werden nicht übernommen.');
      seen.add(key);
      skip();
      if (input[index] !== ':') fail('INVALID_JSON', 'Doppelpunkt nach dem Schlüssel erwartet.');
      index += 1;
      const value = parseValue(depth + 1);
      Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
      skip();
      if (input[index] === ',') {
        index += 1;
        continue;
      }
      if (input[index] === '}') {
        index += 1;
        return obj;
      }
      fail('INVALID_JSON', 'Objekt ist nicht korrekt geschlossen.');
    }
    fail('INVALID_JSON', 'Objekt endet vorzeitig.');
  }

  function parseArray(depth: number): unknown[] {
    if (depth > LIMITS.jsonDepth) fail('JSON_DEPTH', 'JSON-Tiefe 128 ist die Grenze. Die nächste Ebene wird abgewiesen.');
    index += 1;
    const items: unknown[] = [];
    skip();
    if (input[index] === ']') {
      index += 1;
      return items;
    }
    while (index < length) {
      items.push(parseValue(depth + 1));
      skip();
      if (input[index] === ',') {
        index += 1;
        continue;
      }
      if (input[index] === ']') {
        index += 1;
        return items;
      }
      fail('INVALID_JSON', 'Array ist nicht korrekt geschlossen.');
    }
    fail('INVALID_JSON', 'Array endet vorzeitig.');
  }

  function parseLiteral(text: string, value: unknown): unknown {
    if (input.slice(index, index + text.length) !== text) fail('INVALID_JSON', 'Ungültiges Literal.');
    index += text.length;
    return value;
  }

  function parseNumber(): number {
    const start = index;
    if (input[index] === '-') index += 1;
    if (input[index] === '0') index += 1;
    else if (input[index] >= '1' && input[index] <= '9') {
      while (input[index] >= '0' && input[index] <= '9') index += 1;
    } else fail('INVALID_JSON', 'Ungültige Zahl.');
    if (input[index] === '.') {
      index += 1;
      if (input[index] < '0' || input[index] > '9') fail('INVALID_JSON', 'Ungültige Zahl.');
      while (input[index] >= '0' && input[index] <= '9') index += 1;
    }
    if (input[index] === 'e' || input[index] === 'E') {
      index += 1;
      if (input[index] === '+' || input[index] === '-') index += 1;
      if (input[index] < '0' || input[index] > '9') fail('INVALID_JSON', 'Ungültige Zahl.');
      while (input[index] >= '0' && input[index] <= '9') index += 1;
    }
    const token = input.slice(start, index);
    const value = Number(token);
    if (!Number.isFinite(value)) fail('INVALID_JSON', 'Zahl ist nicht endlich.');
    return value;
  }

  function parseString(): string {
    index += 1;
    let out = '';
    while (index < length) {
      const ch = input[index];
      if (ch === '"') {
        index += 1;
        return out;
      }
      if (ch === '\\') {
        index += 1;
        const esc = input[index];
        index += 1;
        if (esc === '"' || esc === '\\' || esc === '/') out += esc;
        else if (esc === 'b') out += '\b';
        else if (esc === 'f') out += '\f';
        else if (esc === 'n') out += '\n';
        else if (esc === 'r') out += '\r';
        else if (esc === 't') out += '\t';
        else if (esc === 'u') {
          const hex = input.slice(index, index + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('INVALID_JSON', 'Ungültige Unicode-Escape-Sequenz.');
          index += 4;
          const code = Number.parseInt(hex, 16);
          if (code >= 0xd800 && code <= 0xdbff) {
            if (input.slice(index, index + 2) === '\\u') {
              const lowHex = input.slice(index + 2, index + 6);
              const low = /^[0-9a-fA-F]{4}$/.test(lowHex) ? Number.parseInt(lowHex, 16) : 0;
              if (low >= 0xdc00 && low <= 0xdfff) {
                index += 6;
                out += String.fromCharCode(code, low);
                continue;
              }
            }
            loneSurrogates += 1;
            out += String.fromCharCode(code);
          } else if (code >= 0xdc00 && code <= 0xdfff) {
            loneSurrogates += 1;
            out += String.fromCharCode(code);
          } else out += String.fromCharCode(code);
        } else fail('INVALID_JSON', 'Ungültige Escape-Sequenz.');
        continue;
      }
      if (ch.charCodeAt(0) < 0x20) fail('INVALID_JSON', 'Steuerzeichen in einer Zeichenkette.');
      out += ch;
      index += 1;
    }
    fail('INVALID_JSON', 'Zeichenkette ist nicht geschlossen.');
  }

  const value = parseValue(1);
  skip();
  if (index !== length) fail('INVALID_JSON', 'Nach dem JSON-Wert stehen weitere Zeichen.');
  return { value, loneSurrogates };
}

export function decodeUtf8(bytes: Uint8Array, name: string): string {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return text;
  } catch {
    throw new AtlasError('INVALID_UTF8', `${name} ist kein gültiges UTF-8.`);
  }
}
