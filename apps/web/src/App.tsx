import { useEffect, useState } from 'react';
import { Dialog } from './components/Dialog';
import { downloadBytes } from './components/download';
import type { AtlasSnapshot, QueryTime } from './domain/models.generated';
import { ChangesView } from './features/changes/ChangesView';
import { ConversationView } from './features/conversations/ConversationView';
import { GraphView } from './features/graph/GraphView';
import { ImportView } from './features/import/ImportView';
import { KnowledgeView } from './features/knowledge/KnowledgeView';
import { MemoryView } from './features/memory-sets/MemoryView';
import { OverviewView } from './features/overview/OverviewView';
import { ReviewView } from './features/review/ReviewView';
import { SettingsView } from './features/settings/SettingsView';
import { SourcesView } from './features/sources/SourcesView';
import { TimelineView } from './features/timeline/TimelineView';
import { nowQuery, useAtlas } from './service-context';

const ROUTES = [
  ['overview', 'Überblick'],
  ['import', 'Import'],
  ['source', 'Quelle'],
  ['knowledge', 'Wissenskarten'],
  ['changes', 'Alt/Neu'],
  ['timeline', 'Zeit'],
  ['graph', 'Beziehungen'],
  ['review', 'Prüfung'],
  ['sources', 'Quellenlage'],
  ['memory', 'Freigabe'],
  ['settings', 'Einstellungen'],
] as const;

type RouteId = (typeof ROUTES)[number][0];

function parseRoute(hash: string): RouteId {
  const id = hash.replace(/^#\//, '');
  const match = ROUTES.find((route) => route[0] === id);
  return match ? match[0] : 'overview';
}

export function App() {
  const { service, state } = useAtlas();
  const [route, setRoute] = useState<RouteId>(() => parseRoute(window.location.hash));
  const [menuOpen, setMenuOpen] = useState(false);
  const [customAt, setCustomAt] = useState<QueryTime | null>(null);
  const [pendingProject, setPendingProject] = useState<AtlasSnapshot | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const at = customAt ?? nowQuery();

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [state.dirty]);

  return (
    <div className="app">
      <a className="skip" href="#inhalt">Zum Inhalt</a>
      <header className="topbar">
        <div className="brand">
          <h1>Memory Atlas</h1>
          {state.demo ? <p className="banner">Demo · synthetisch</p> : <p className="meta">{state.snapshot.workspace.title}</p>}
        </div>
        <div className="status-row">
          <button type="button" className="button menu-button" aria-expanded={menuOpen} aria-controls="app-nav" onClick={() => setMenuOpen((open) => !open)}>Menü</button>
          <span className={state.dirty ? 'status warn' : 'status ok'}>{state.dirty ? 'Nicht als Datei gespeichert' : 'Datei und Sitzung stimmen überein'}</span>
          <button type="button" className="button" onClick={() => { const file = service.projectBytes(); downloadBytes(file.filename, file.bytes, 'application/json'); }}>Projekt herunterladen</button>
          <label className="button">
            Projekt öffnen
            <input
              className="sr"
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void file.text().then((text) => {
                  try {
                    setPendingProject(service.previewProject(text));
                    setOpenError(null);
                  } catch (error) {
                    setPendingProject(null);
                    setOpenError(error instanceof Error ? error.message : 'Projekt ungültig.');
                  }
                });
              }}
            />
          </label>
        </div>
      </header>
      <div className="layout">
        <nav id="app-nav" className={menuOpen ? 'nav open' : 'nav'} aria-label="Hauptnavigation">
          {ROUTES.map(([id, label]) => (
            <a key={id} href={`#/${id}`} aria-current={route === id ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </nav>
        <main id="inhalt" className="main">
          <p id="notice" className="live" role="status">{state.notice ?? 'Bereit.'}</p>
          {state.error || openError ? <p id="error" className="live" role="alert">{state.error ?? openError}</p> : null}
          <View route={route} at={at} custom={customAt !== null} reducedMotion={reducedMotion} onTime={setCustomAt} />
        </main>
      </div>
      {pendingProject ? (
        <Dialog title="Projekt ersetzen" onClose={() => setPendingProject(null)}>
          <p>Das geöffnete Projekt ersetzt die Sitzung. Es wird nichts zusammengeführt. Importierte Freigaben bleiben untrusted.</p>
          <p>{pendingProject.workspace.title} · {pendingProject.created_at}</p>
          <div className="row">
            <button type="button" className="button primary" onClick={() => { service.openProject(pendingProject); setPendingProject(null); }}>Ersetzen</button>
            <button type="button" className="button" onClick={() => setPendingProject(null)}>Abbrechen</button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function View({ route, at, custom, reducedMotion, onTime }: { route: RouteId; at: QueryTime; custom: boolean; reducedMotion: boolean; onTime: (next: QueryTime | null) => void }) {
  switch (route) {
    case 'overview':
      return <OverviewView />;
    case 'import':
      return <ImportView />;
    case 'source':
      return <ConversationView />;
    case 'knowledge':
      return <KnowledgeView at={at} />;
    case 'changes':
      return <ChangesView at={at} />;
    case 'timeline':
      return <TimelineView at={at} custom={custom} onChange={onTime} />;
    case 'graph':
      return <GraphView at={at} reducedMotion={reducedMotion} />;
    case 'review':
      return <ReviewView at={at} />;
    case 'sources':
      return <SourcesView />;
    case 'memory':
      return <MemoryView />;
    case 'settings':
      return <SettingsView />;
    default: {
      const neverRoute: never = route;
      return <p>Unbekannte Ansicht {String(neverRoute)}</p>;
    }
  }
}
