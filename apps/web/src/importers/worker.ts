import type { AtlasSnapshot, ImportOptions } from '../domain/models.generated';
import { isAtlasError } from '../domain/errors';
import { parseImport } from './normalize';

interface WorkerRequest {
  files: { name: string; bytes: Uint8Array }[];
  base: AtlasSnapshot;
  options: ImportOptions;
  now: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  const clock = { now: () => data.now };
  void parseImport(data.files, data.base, data.options, clock, new AbortController().signal)
    .then((result) => {
      self.postMessage({ type: 'result', result });
    })
    .catch((error: unknown) => {
      const code = isAtlasError(error) ? error.code : 'IMPORT_FAILED';
      const message = error instanceof Error ? error.message : 'Import fehlgeschlagen.';
      self.postMessage({ type: 'error', code, message });
    });
};
