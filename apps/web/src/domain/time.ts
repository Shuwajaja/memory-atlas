import { AtlasError } from './errors';

export function isRfc3339(value: string): boolean {
  if (!value.includes('T')) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

export function normalizeInstant(value: string): string {
  if (!isRfc3339(value)) throw new AtlasError('INVALID_TIMESTAMP', 'Zeitstempel braucht einen Offset.');
  const iso = new Date(value).toISOString();
  return iso.endsWith('.000Z') ? iso.slice(0, -5) + 'Z' : iso;
}

export function instantMs(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new AtlasError('INVALID_TIMESTAMP', 'Zeitstempel ist nicht lesbar.');
  return parsed;
}

export function addMs(value: string, delta: number): string {
  const iso = new Date(instantMs(value) + delta).toISOString();
  return iso.endsWith('.000Z') ? iso.slice(0, -5) + 'Z' : iso;
}

export function minInstant(values: string[]): string {
  return values.reduce((best, value) => (instantMs(value) < instantMs(best) ? value : best));
}

export interface ParsedTime {
  iso: string | null;
  code: 'MISSING_TIMESTAMP' | 'INVALID_TIMESTAMP' | null;
}

export function parseProviderTime(value: unknown, kind: 'unix-seconds' | 'rfc3339'): ParsedTime {
  if (value === null || value === undefined) return { iso: null, code: 'MISSING_TIMESTAMP' };
  if (kind === 'unix-seconds') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return { iso: null, code: 'INVALID_TIMESTAMP' };
    const date = new Date(value * 1000);
    if (Number.isNaN(date.getTime())) return { iso: null, code: 'INVALID_TIMESTAMP' };
    const iso = date.toISOString();
    return { iso: iso.endsWith('.000Z') ? iso.slice(0, -5) + 'Z' : iso, code: null };
  }
  if (typeof value !== 'string' || !isRfc3339(value)) return { iso: null, code: 'INVALID_TIMESTAMP' };
  return { iso: normalizeInstant(value), code: null };
}
