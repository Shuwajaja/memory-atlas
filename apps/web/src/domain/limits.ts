import { AtlasError } from './errors';

export const LIMITS = {
  fileBytes: 33_554_432,
  batchBytes: 134_217_728,
  files: 500,
  messages: 100_000,
  parentEdges: 10_000,
  jsonDepth: 128,
  snapshotBytes: 268_435_456,
  messageRevisions: 100_000,
  reviews: 100_000,
  maxClaims: 50,
  maxTextBytes: 16_000,
  previewMs: 15 * 60 * 1000,
  approvalMs: 24 * 60 * 60 * 1000,
  graphNodes: 150,
} as const;

export function assertByteLimit(byteLength: number, limit: number, code: string, message: string): void {
  if (byteLength > limit) throw new AtlasError(code, message);
}
