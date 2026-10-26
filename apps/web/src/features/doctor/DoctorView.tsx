import { LIMITS } from '../../domain/limits';
import { useAtlas } from '../../service-context';

export function DoctorView() {
  const { service, state } = useAtlas();
  const storage = window.localStorage.length + window.sessionStorage.length;
  const checks = [
    { name: 'Schema 1.0.0', ok: state.snapshot.schema_version === '1.0.0', detail: state.snapshot.schema_version },
    { name: 'Kein Ladefehler', ok: state.error === null, detail: state.error ?? 'kein Fehler' },
    { name: 'Sitzungs-ID', ok: service.sessionId().startsWith('ses_'), detail: service.sessionId() },
    { name: 'Browser-Speicher leer', ok: storage === 0, detail: `${storage} Einträge` },
    { name: 'Nachrichtengrenze', ok: state.snapshot.messages.length <= LIMITS.messages, detail: `${state.snapshot.messages.length} / ${LIMITS.messages}` },
    { name: 'Reviewgrenze', ok: state.snapshot.reviews.length <= LIMITS.reviews, detail: `${state.snapshot.reviews.length} / ${LIMITS.reviews}` },
  ];
  const healthy = checks.every((check) => check.ok);
  return (
    <section className="stack">
      <h2>Doctor</h2>
      <p className="subtitle">Prüft den geladenen Bestand und diese Sitzung. Es wird nichts nach außen gesendet.</p>
      <p className={healthy ? 'status ok' : 'status bad'}>{healthy ? 'Keine Auffälligkeit in diesen Prüfungen.' : 'Mindestens eine Prüfung ist offen.'}</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Prüfung</th><th>Ergebnis</th><th>Wert</th></tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.name}>
                <td>{check.name}</td>
                <td><span className={check.ok ? 'pill ok' : 'pill bad'}>{check.ok ? 'bestanden' : 'offen'}</span></td>
                <td className="mono">{check.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">Das Claude-Profil ist nicht freigegeben. Gemini wird nicht importiert. Doctor misst keine Laufzeit und keinen Screenreader.</p>
    </section>
  );
}
