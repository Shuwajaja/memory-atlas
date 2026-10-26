import { useState } from 'react';
import { evaluateEligibility } from '../../domain/export';
import { randomId } from '../../domain/ids';
import type { ExportFiles, MemorySetDraft } from '../../domain/models.generated';
import { downloadBytes } from '../../components/download';
import { useAtlas, useLiveQuery } from '../../service-context';

export function MemoryView() {
  const { service, state } = useAtlas();
  const at = useLiveQuery();
  const [draft, setDraft] = useState<MemorySetDraft>(() => freshDraft(state.snapshot.workspace.id, state.snapshot.memory_sets[0]));
  const [bundle, setBundle] = useState<{ files: ExportFiles; jsonSha: string; markdownSha: string } | null>(null);
  const active = state.snapshot.memory_sets.find((set) => set.id === draft.id) ?? null;

  return (
    <section className="stack">
      <h2>Freigabe</h2>
      <p>Der Export verwendet die aktuelle Uhr, nicht den Zeitfilter. Eine Freigabe bindet genau die Vorschau-Bytes und gilt nur in dieser Sitzung.</p>
      <p className="meta">Importierte Freigaben: {state.importedApprovals}. Sie erlauben keinen Download.</p>
      <label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Projekt<input value={draft.scope.project_id ?? ''} onChange={(event) => setDraft({ ...draft, scope: { ...draft.scope, project_id: event.target.value || null } })} /></label>
      <label>Umgebung<input value={draft.scope.environment} onChange={(event) => setDraft({ ...draft, scope: { ...draft.scope, environment: event.target.value } })} /></label>
      <label>Empfänger<input value={draft.scope.consumer_id} onChange={(event) => setDraft({ ...draft, scope: { ...draft.scope, consumer_id: event.target.value } })} /></label>
      <label>Zweck<input value={draft.scope.purpose} onChange={(event) => setDraft({ ...draft, scope: { ...draft.scope, purpose: event.target.value } })} /></label>
      <label><input type="checkbox" checked={draft.include_research_notes} onChange={(event) => setDraft({ ...draft, include_research_notes: event.target.checked })} /> Recherche-Notizen aufnehmen</label>
      <ul className="stack">
        {state.snapshot.claims.map((claim) => {
          const selected = draft.selected_claim_ids.includes(claim.id);
          const eligibility = evaluateEligibility(state.snapshot, claim.id, { ...draft, selected_claim_ids: [claim.id] }, at);
          return (
            <li key={claim.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    const ids = event.target.checked
                      ? [...draft.selected_claim_ids, claim.id]
                      : draft.selected_claim_ids.filter((id) => id !== claim.id);
                    setDraft({ ...draft, selected_claim_ids: ids });
                  }}
                />
                {claim.value} — {claim.text}
              </label>
              <p>{eligibility.allowed ? 'exportierbar' : eligibility.reasons.join(', ')}</p>
            </li>
          );
        })}
      </ul>
      <div className="row">
        <button type="button" className="button primary" onClick={() => service.saveMemorySet(draft)}>Auswahl speichern</button>
        <button type="button" className="button" disabled={!active} onClick={() => service.prepare(draft.id)}>Vorschau erzeugen</button>
        <button type="button" className="button" disabled={!active} onClick={() => service.reviewClaim('revoke_export', draft.id, 'Freigabe widerrufen')}>Freigabe widerrufen</button>
      </div>
      {active ? <p className="status ok">Auswahl gespeichert.</p> : <p className="status warn">Auswahl nicht gespeichert.</p>}
      {state.preview ? (
        <div className="card stack">
          <h2>Vorschau</h2>
          <p data-testid="json-sha">JSON-SHA256: {state.preview.json_sha256}</p>
          <p data-testid="markdown-sha">Markdown-SHA256: {state.preview.markdown_sha256}</p>
          <p>Vorschau gültig bis {state.preview.preview_expires_at}</p>
          <pre className="quote">{new TextDecoder().decode(state.preview.json_bytes)}</pre>
          <pre className="quote">{new TextDecoder().decode(state.preview.markdown_bytes)}</pre>
          <button type="button" className="button primary" onClick={() => service.approve()}>Freigeben</button>
        </div>
      ) : <p className="card">Keine Vorschau.</p>}
      {state.approval ? (
        <div className="card stack">
          <h2>Export</h2>
          <p>Freigegeben bis {state.approval.expires_at}. Session {state.approval.session_id}.</p>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              const preview = state.preview;
              const files = service.exportFiles();
              if (preview && files) setBundle({ files, jsonSha: preview.json_sha256, markdownSha: preview.markdown_sha256 });
            }}
          >
            Export bereitstellen
          </button>
        </div>
      ) : null}
      {bundle ? (
        <div className="card stack">
          <h2>Downloads</h2>
          <p data-testid="export-json-sha">JSON-SHA256: {bundle.jsonSha}</p>
          <div className="row">
            <button type="button" className="button" onClick={() => downloadBytes('memory.json', bundle.files.json_bytes, 'application/json')}>JSON herunterladen</button>
            <button type="button" className="button" onClick={() => downloadBytes('MEMORY.md', bundle.files.markdown_bytes, 'text/markdown')}>Markdown herunterladen</button>
            <button type="button" className="button" onClick={() => downloadBytes('manifest.json', bundle.files.manifest_bytes, 'application/json')}>Manifest herunterladen</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function freshDraft(workspaceId: string, existing: MemorySetDraft | undefined): MemorySetDraft {
  if (existing) return structuredClone(existing);
  return {
    id: randomId('set_'),
    name: 'Lokale Auswahl',
    scope: { workspace_id: workspaceId, project_id: 'orion', environment: 'local', consumer_id: 'local', purpose: 'memory' },
    selected_claim_ids: [],
    include_research_notes: false,
    max_claims: 50,
    max_text_bytes: 16000,
    policy_version: '1.0',
    created_at: new Date().toISOString(),
  };
}
