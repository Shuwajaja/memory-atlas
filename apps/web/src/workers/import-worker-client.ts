import type { AtlasSnapshot, ImportOptions, NormalizedImport } from '../domain/models.generated';
import { AtlasError } from '../domain/errors';

interface WorkerResult {
  type: 'result';
  result: NormalizedImport;
}

interface WorkerFailure {
  type: 'error';
  code: string;
  message: string;
}

export function createImportWorker(): Worker {
  const source = typeof __MA_WORKER_SOURCE__ === 'string' ? __MA_WORKER_SOURCE__ : '';
  if (source) {
    const blob = new Blob([source], { type: 'text/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }
  return new Worker(new URL('../importers/worker.ts', import.meta.url), { type: 'module' });
}

export function parseInWorker(
  worker: Worker,
  files: { name: string; bytes: Uint8Array }[],
  base: AtlasSnapshot,
  options: ImportOptions,
  now: string,
  signal: AbortSignal,
): Promise<NormalizedImport> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResult | WorkerFailure>) => {
      if (event.data.type === 'result') {
        cleanup();
        resolve(event.data.result);
      } else {
        cleanup();
        reject(new AtlasError(event.data.code, event.data.message));
      }
    };
    const onError = () => {
      cleanup();
      reject(new AtlasError('IMPORT_FAILED', 'Der Import-Worker hat einen Fehler gemeldet.'));
    };
    const onAbort = () => {
      cleanup();
      worker.terminate();
      reject(new AtlasError('CANCELLED', 'Import abgebrochen. Der Speicher ist unverändert.'));
    };
    const cleanup = () => {
      signal.removeEventListener('abort', onAbort);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort);
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ files, base, options, now });
  });
}
