import { canonicalize } from './canonical';
import { sha256Text } from './sha256';

export function derivedId(prefix: string, payload: unknown): string {
  return prefix + sha256Text(canonicalize(payload));
}

export function randomId(prefix: string): string {
  return prefix + crypto.randomUUID();
}
