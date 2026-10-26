import { useState } from 'react';
import { detectConflicts } from '../../domain/conflicts';
import type { QueryTime } from '../../domain/models.generated';
import { projectClaim } from '../../domain/projection';
import { Dialog } from '../../components/Dialog';
import { useAtlas } from '../../service-context';
import { temporalLabel, utcNoon } from '../format';

interface ChangesViewProps {
  at: QueryTime;
}

export function ChangesView({ at }: ChangesViewProps) {
  const { service, state } = useAtlas();
  const conflicts = detectConflicts(state.snapshot, at);
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [effective, setEffective] = useState('2020-06-01');
  const [reason, setReason] = useState('Neue ausdrückliche Entscheidung');
  const claims = state.snapshot.claims;

  return (
    <section className="stack">
      <h2>Alt/Neu</h2>
      <p>Eine neuere Assistenzantwort ersetzt keine ausdrückliche Nutzerentscheidung. Ersetzung wirkt erst nach Bestätigung.</p>
      {conflicts.length === 0 ? <p className="card">Kein offener Konflikt zum Zeitpunkt {at.valid_at}.</p> : null}
      {conflicts.map((conflict) => (
        <article key={conflict.slot_key} className="card stack">
          <h2>Konflikt</h2>
          <p>Grund: {conflict.reason}</p>
          <ul>
            {conflict.claim_ids.map((id) => {
              const claim = claims.find((item) => item.id === id);
              const view = projectClaim(state.snapshot, id, at);
              return <li key={id}>{claim?.value}: {temporalLabel(view.temporal)} — {claim?.text}</li>;
            })}
          </ul>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setFromId(conflict.claim_ids[1] ?? '');
              setToId(conflict.claim_ids[0] ?? '');
              setOpen(true);
            }}
          >
            Konflikt lösen
          </button>
        </article>
      ))}
      <div className="stack">
        {claims.map((claim) => {
          const view = projectClaim(state.snapshot, claim.id, at);
          return <p key={claim.id}>{claim.value}: {temporalLabel(view.temporal)}</p>;
        })}
      </div>
      {open ? (
        <Dialog title="Ersetzung bestätigen" onClose={() => setOpen(false)}>
          <label>
            Neue Karte
            <select value={fromId} onChange={(event) => setFromId(event.target.value)}>
              {claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.value}</option>)}
            </select>
          </label>
          <label>
            Alte Karte
            <select value={toId} onChange={(event) => setToId(event.target.value)}>
              {claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.value}</option>)}
            </select>
          </label>
          <label>Wirksam ab<input type="date" value={effective} onChange={(event) => setEffective(event.target.value)} /></label>
          <label>Begründung<input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="row">
            <button
              type="button"
              className="button primary"
              onClick={() => {
                service.supersede(fromId, toId, utcNoon(effective), reason);
                setOpen(false);
              }}
            >
              Ersetzung bestätigen
            </button>
            <button type="button" className="button" onClick={() => setOpen(false)}>Abbrechen</button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
