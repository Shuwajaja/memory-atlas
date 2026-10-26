import { useRef, useState } from 'react';
import { isArchiveName } from '../../importers/detect';
import { ARCHIVE_MESSAGE, HTML_MESSAGE } from '../../importers/normalize';
import { createImportWorker, parseInWorker } from '../../workers/import-worker-client';
import { useAtlas } from '../../service-context';

export function ImportView() {
  const { service, state } = useAtlas();
  const [namespace, setNamespace] = useState('synthetic-account');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const workerRef = useRef<Worker | null>(null);

  async function inspect(list: File[]): Promise<void> {
    if (list.length === 0) return;
    setLocalError(null);
    const files: { name: string; bytes: Uint8Array }[] = [];
    for (const file of list) {
      if (isArchiveName(file.name)) {
        setLocalError(ARCHIVE_MESSAGE);
        return;
      }
      if (file.name.toLowerCase().endsWith('.html')) {
        setLocalError(HTML_MESSAGE);
        return;
      }
      files.push({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    }
    abortRef.current?.abort();
    workerRef.current?.terminate();
    const worker = createImportWorker();
    const abort = new AbortController();
    workerRef.current = worker;
    abortRef.current = abort;
    setBusy(true);
    try {
      const staged = await parseInWorker(
        worker,
        files,
        state.snapshot,
        { namespace: namespace.trim() || 'synthetic-account', profile: 'auto', claude_profile_approved: false },
        new Date().toISOString(),
        abort.signal,
      );
      service.stageImport(staged);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
    } finally {
      setBusy(false);
      worker.terminate();
    }
  }

  const report = state.staged?.report ?? null;
  return (
    <section className="stack" aria-busy={busy}>
      <h2>Import</h2>
      <p className="muted">JSON-Dateien werden geprüft und erst nach Bestätigung übernommen. Das Claude-Profil ist nicht freigegeben.</p>
      <label>
        Namensraum
        <input value={namespace} onChange={(event) => setNamespace(event.target.value)} />
      </label>
      <label>
        Exportdateien
        <input
          type="file"
          accept=".json,.txt,application/json"
          multiple
          onChange={(event) => {
            const selected = [...(event.target.files ?? [])];
            event.target.value = '';
            void inspect(selected);
          }}
        />
      </label>
      <div className="row">
        <button type="button" className="button danger" disabled={!busy} onClick={() => abortRef.current?.abort()}>
          Prüfung abbrechen
        </button>
      </div>
      {busy ? <p className="status info">Import wird geprüft…</p> : <p className="status info">Keine laufende Prüfung.</p>}
      {localError ? <p className="status bad" role="alert">{localError}</p> : null}
      {report ? (
        <div className="card stack">
          <h2>Prüfbericht</h2>
          <p>Neue Gespräche: {report.new_conversations}</p>
          <p>Neue Nachrichten: {report.new_logical_messages}</p>
          <p>Neue Revisionen: {report.new_revisions}</p>
          <p>Unveränderte Revisionen: {report.unchanged_revisions}</p>
          <p>Platzhalter: {report.placeholder_parts}</p>
          <p>Unbekannte Zeiten: {report.unknown_timestamps}</p>
          {report.diagnostics.length > 0 ? <p className="status warn">Teilweise unterstützt: {report.diagnostics.length} Hinweise</p> : <p className="status ok">Keine Hinweise.</p>}
          <ul>
            {report.diagnostics.map((item, index) => (
              <li key={`${item.code}-${index}`}>{item.severity}: {item.code}</li>
            ))}
          </ul>
          <div className="row">
            <button type="button" className="button primary" onClick={() => service.commitImport()}>Import übernehmen</button>
            <button type="button" className="button" onClick={() => service.discardImport()}>Verwerfen</button>
          </div>
        </div>
      ) : (
        <p className="card">Keine Datei geprüft.</p>
      )}
    </section>
  );
}
