import type { QueryTime } from '../../domain/models.generated';
import { projectClaim, visibleClaimIds } from '../../domain/projection';
import { temporalLabel } from '../format';
import { useAtlas } from '../../service-context';

interface TimelineViewProps {
  at: QueryTime;
  custom: boolean;
  onChange: (next: QueryTime | null) => void;
}

export function TimelineView({ at, custom, onChange }: TimelineViewProps) {
  const { state } = useAtlas();
  const visible = new Set(visibleClaimIds(state.snapshot, at.known_at));
  return (
    <section className="stack">
      <h2>Zeit</h2>
      <p>Gültigkeitszeit und Kenntniszeit sind getrennt. Der Export benutzt weiterhin die aktuelle Uhr.</p>
      <div className="row">
        <label>
          Gültig am
          <input
            type="datetime-local"
            value={toLocal(at.valid_at)}
            onChange={(event) => onChange({ valid_at: new Date(event.target.value).toISOString(), known_at: at.known_at })}
          />
        </label>
        <label>
          Bekannt am
          <input
            type="datetime-local"
            value={toLocal(at.known_at)}
            onChange={(event) => onChange({ valid_at: at.valid_at, known_at: new Date(event.target.value).toISOString() })}
          />
        </label>
        <button type="button" className="button" onClick={() => onChange(null)}>Jetzt</button>
      </div>
      <p>{custom ? 'Zeitfilter ist aktiv.' : 'Ansicht folgt der aktuellen Uhr.'}</p>
      <p>Sichtbare Karten: {visible.size}</p>
      <ul>
        {state.snapshot.claims.map((claim) => {
          const view = projectClaim(state.snapshot, claim.id, at);
          return (
            <li key={claim.id}>
              {claim.value}: {visible.has(claim.id) ? temporalLabel(view.temporal) : 'noch nicht bekannt'}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function toLocal(instant: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
