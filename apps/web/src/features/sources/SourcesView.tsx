import { validateEvidence } from '../../domain/provenance';
import { useAtlas } from '../../service-context';

export function SourcesView() {
  const { state } = useAtlas();
  return (
    <section className="stack">
      <h2>Quellenlage</h2>
      {state.snapshot.evidence.length === 0 ? <p className="card">Noch kein Beleg.</p> : null}
      <ul className="stack">
        {state.snapshot.evidence.map((evidence) => {
          const result = validateEvidence(state.snapshot, evidence);
          const message = state.snapshot.messages.find((item) => item.revision_id === evidence.message_revision_id);
          return (
            <li key={evidence.id} className="card stack">
              <p className="quote">{evidence.quote}</p>
              <p>Spanne {evidence.start_cp}:{evidence.end_cp} · Teil {evidence.part_index}</p>
              <p>Rolle: {message?.role ?? 'fehlt'}</p>
              <p>{result.valid ? 'Belegspanne gültig' : `Belegspanne ungültig: ${result.reasons.join(', ')}`}</p>
            </li>
          );
        })}
      </ul>
      <h2>Dateien</h2>
      <ul>
        {state.snapshot.source_files.map((file) => (
          <li key={file.id}>{file.original_name} · {file.provider} · {file.namespace}</li>
        ))}
      </ul>
    </section>
  );
}
