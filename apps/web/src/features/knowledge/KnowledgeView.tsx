import { useEffect, useState } from 'react';
import type { ClaimProjection, QueryTime, Sensitivity } from '../../domain/models.generated';
import { projectClaim } from '../../domain/projection';
import { useShell } from '../../selection';
import { useAtlas } from '../../service-context';
import { curationLabel, evidenceLabel, temporalLabel, utcNoon } from '../format';

interface KnowledgeViewProps {
  at: QueryTime;
}

export function KnowledgeView({ at }: KnowledgeViewProps) {
  const { service, state } = useAtlas();
  const { projectId, setSelection } = useShell();
  const [selected, setSelected] = useState<string | null>(null);
  const [due, setDue] = useState('2099-01-01');
  const [reason, setReason] = useState('manuell geprüft');
  const [contextChecked, setContextChecked] = useState(false);
  const [branchChecked, setBranchChecked] = useState(false);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('shareable');
  const [aiOnly, setAiOnly] = useState(true);
  const claims = state.snapshot.claims.filter((claim) => {
    if (projectId && claim.scope.project_id !== projectId) return false;
    return aiOnly ? claim.category !== 'excluded_private' : true;
  });
  const hiddenPrivate = state.snapshot.claims.length - state.snapshot.claims.filter((claim) => claim.category !== 'excluded_private').length;
  const active = claims.find((claim) => claim.id === selected) ?? claims[0] ?? null;
  const projection = active ? projectClaim(state.snapshot, active.id, at) : null;

  useEffect(() => {
    if (active) setSelection({ type: 'claim', id: active.id });
  }, [active, setSelection]);

  return (
    <section className="stack">
      <h2>Wissenskarten</h2>
      <label>
        <input type="checkbox" checked={aiOnly} onChange={(event) => setAiOnly(event.target.checked)} /> Nur KI-Projekte
      </label>
      <p>Durch den KI-Filter ausgeblendet: {aiOnly ? hiddenPrivate : 0}</p>
      {claims.length === 0 ? <p className="card">Noch keine Wissenskarte.</p> : null}
      <div className="with-inspector">
        <div className="stack">
          {claims.map((claim) => {
            const view = projectClaim(state.snapshot, claim.id, at);
            return (
              <article key={claim.id} className={`knowledge-card${active?.id === claim.id ? ' is-selected' : ''}`} aria-label={`${claim.value}: ${claim.text}`}>
                <button type="button" className="k-card-icon" aria-pressed={active?.id === claim.id} onClick={() => setSelected(claim.id)}>
                  {claim.value}
                </button>
                <div className="k-card-content">
                  <p className="k-card-excerpt">{claim.text}</p>
                  <div className="card-meta">
                    <span className={`status-tag ${temporalClass(view.temporal)}`}>{temporalLabel(view.temporal)}</span>
                    <span className="meta-pill">{curationLabel(view.curation)}</span>
                    <span className="meta-pill">{evidenceLabel(view.evidence_status)}</span>
                    <span className="meta-pill">Sensitivität: {view.sensitivity}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="panel stack lab-card">
          {active && projection ? (
            <>
              <h2>Prüfung</h2>
              <p className="quote">{state.snapshot.evidence.filter((item) => active.evidence_ids.includes(item.id)).map((item) => item.quote).join('\n')}</p>
              <p>Annahme verändert den Belegstatus nicht.</p>
              <label>Frist<input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
              <label>Begründung<input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
              <button type="button" className="button primary" onClick={() => service.reviewClaim('accept', active.id, reason, { review_due_at: utcNoon(due) })}>Annehmen</button>
              <button type="button" className="button" onClick={() => service.reviewClaim('reject', active.id, reason)}>Ablehnen</button>
              <button type="button" className="button" onClick={() => service.reviewClaim('exclude', active.id, reason)}>Ausschließen</button>
              <button type="button" className="button" onClick={() => service.reviewClaim('reopen', active.id, reason)}>Wieder öffnen</button>
              <label><input type="checkbox" checked={contextChecked} onChange={(event) => setContextChecked(event.target.checked)} /> Rolle und Kontext geprüft</label>
              <label><input type="checkbox" checked={branchChecked} onChange={(event) => setBranchChecked(event.target.checked)} /> Zweig geprüft</label>
              <button
                type="button"
                className="button primary"
                disabled={!contextChecked || !branchChecked}
                onClick={() => service.reviewClaim('confirm_source', active.id, reason, {
                  context_checked: true,
                  branch_checked: true,
                  evidence_ids: [...active.evidence_ids],
                })}
              >
                Quelle bestätigen
              </button>
              <label>
                Datenschutz
                <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value as Sensitivity)}>
                  <option value="shareable">shareable</option>
                  <option value="private">private</option>
                  <option value="secret">secret</option>
                  <option value="unknown">unknown</option>
                </select>
              </label>
              <button type="button" className="button" onClick={() => service.reviewClaim('classify_privacy', active.id, reason, { sensitivity })}>Datenschutz speichern</button>
              <p className="meta">Status bleibt {evidenceLabel(projection.evidence_status)}. Ausführung geprüft ist in P1 nicht erreichbar.</p>
            </>
          ) : <p>Keine Karte ausgewählt.</p>}
        </div>
      </div>
    </section>
  );
}

function temporalClass(value: ClaimProjection['temporal']): string {
  switch (value) {
    case 'current':
      return 'current';
    case 'superseded':
    case 'expired':
      return 'outdated';
    case 'disputed':
      return 'conflict';
    case 'future':
      return 'planned';
    case 'unknown':
      return 'review';
    default: {
      const neverValue: never = value;
      return neverValue;
    }
  }
}
