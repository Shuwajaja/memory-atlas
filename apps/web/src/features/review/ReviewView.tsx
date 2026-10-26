import type { QueryTime } from '../../domain/models.generated';
import { projectClaim } from '../../domain/projection';
import { useAtlas } from '../../service-context';
import { curationLabel, evidenceLabel, temporalLabel } from '../format';

export function ReviewView({ at }: { at: QueryTime }) {
  const { state } = useAtlas();
  return (
    <section className="stack">
      <h2>Prüfung</h2>
      <p>Reviews werden ergänzt. Karten und Belege bleiben die ursprünglichen Datensätze.</p>
      {state.snapshot.reviews.length === 0 ? <p className="card">Noch kein Review.</p> : null}
      <div className="table-scroll">
      <table>
        <thead>
          <tr><th>seq</th><th>Aktion</th><th>Ziel</th><th>Zeit</th><th>Grund</th></tr>
        </thead>
        <tbody>
          {state.snapshot.reviews.map((review) => (
            <tr key={review.id}>
              <td>{review.seq}</td>
              <td>{review.action}</td>
              <td>{review.target_id}</td>
              <td>{review.recorded_at}</td>
              <td>{review.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <ul>
        {state.snapshot.claims.map((claim) => {
          const view = projectClaim(state.snapshot, claim.id, at);
          return <li key={claim.id}>{claim.value}: {curationLabel(view.curation)}, {evidenceLabel(view.evidence_status)}, {temporalLabel(view.temporal)}</li>;
        })}
      </ul>
    </section>
  );
}
