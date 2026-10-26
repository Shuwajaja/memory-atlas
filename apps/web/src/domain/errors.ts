export class AtlasError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AtlasError';
    this.code = code;
  }
}

export function isAtlasError(error: unknown): error is AtlasError {
  return error instanceof AtlasError;
}
