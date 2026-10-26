import { useAtlas } from '../../service-context';

export function OverviewView() {
  const { service, state } = useAtlas();
  const snapshot = state.snapshot;
  return (
    <section className="stack">
      <h2>Überblick</h2>
      {state.demo ? <p className="banner">Demo · synthetisch</p> : null}
      <p>Gespräche: {snapshot.conversations.length}</p>
      <p>Nachrichten: {snapshot.messages.length}</p>
      <p>Karten: {snapshot.claims.length}</p>
      <p>Reviews: {snapshot.reviews.length}</p>
      <p>Arbeitsbereich: {snapshot.workspace.title}</p>
      <div className="row">
        <a className="button primary" href="#/import">Zum Import</a>
        <button type="button" className="button" onClick={() => service.loadDemo()}>Demo laden</button>
      </div>
      <p className="muted">Speichern heißt eine Projektdatei herunterladen. Ein Neuladen stellt die Sitzung nicht wieder her.</p>
    </section>
  );
}
