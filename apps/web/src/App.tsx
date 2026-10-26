import { useEffect, useRef, useState } from 'react';
import { Dialog } from './components/Dialog';
import type { AtlasSnapshot, QueryTime } from './domain/models.generated';
import { ChangesView } from './features/changes/ChangesView';
import { ConversationView } from './features/conversations/ConversationView';
import { DoctorView } from './features/doctor/DoctorView';
import { GraphView } from './features/graph/GraphView';
import { ImportView } from './features/import/ImportView';
import { KnowledgeView } from './features/knowledge/KnowledgeView';
import { MemoryView } from './features/memory-sets/MemoryView';
import { OverviewView } from './features/overview/OverviewView';
import { ReviewView } from './features/review/ReviewView';
import { SettingsView } from './features/settings/SettingsView';
import { Inspector } from './features/shell/Inspector';
import { SearchPanel } from './features/shell/SearchDialog';
import { Icon } from './features/shell/icons';
import { Sidebar } from './features/shell/Sidebar';
import { SourcesView } from './features/sources/SourcesView';
import { TimelineView } from './features/timeline/TimelineView';
import { ShellProvider } from './selection';
import { useAtlas, useLiveQuery } from './service-context';

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
  ['doctor', 'Doctor'],
] as const;

type RouteId = (typeof ROUTES)[number][0];

function parseRoute(hash: string): RouteId {
  const id = hash.replace(/^#\//, '');
  const match = ROUTES.find((route) => route[0] === id);
  return match ? match[0] : 'overview';
}

export function App() {
  return (
    <ShellProvider>
      <Shell />
    </ShellProvider>
  );
}

function Shell() {
  const { service, state } = useAtlas();
  const liveAt = useLiveQuery();
  const [route, setRoute] = useState<RouteId>(() => parseRoute(window.location.hash));
  const [menuOpen, setMenuOpen] = useState(false);
  const [customAt, setCustomAt] = useState<QueryTime | null>(null);
  const [pendingProject, setPendingProject] = useState<AtlasSnapshot | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const at = customAt ?? liveAt;
  const routeLabel = ROUTES.find((item) => item[0] === route)?.[1] ?? 'Überblick';

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip" href="#inhalt">Zum Inhalt</a>
      <Sidebar
        route={route}
        open={menuOpen}
        at={at}
        onNavigate={() => setMenuOpen(false)}
        onOpen={(file) => {
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
      <div className="center-shell">
        <header className="topbar">
          <div className="topbar-lead">
            <button type="button" className="button menu-button" aria-expanded={menuOpen} aria-controls="app-nav" onClick={() => setMenuOpen((open) => !open)}>Menü</button>
            <nav className="breadcrumb" aria-label="Brotkrumen">
              <h1>Memory Atlas</h1>
              <span className="breadcrumb-divider" aria-hidden="true">/</span>
              <strong>{routeLabel}</strong>
            </nav>
            {state.demo ? <span className="badge-sample">Beispieldaten</span> : null}
            {state.demo ? <p className="banner">Demo · synthetisch</p> : null}
          </div>
          <div className="top-actions">
            <span className={state.dirty ? 'status warn' : 'status ok'}>{state.dirty ? 'Nicht als Datei gespeichert' : 'Datei und Sitzung stimmen überein'}</span>
            <div className="search-slot">
              <label className="search-wrap">
                <Icon name="search" />
                <input
                  ref={searchRef}
                  id="global-search"
                  type="search"
                  value={query}
                  placeholder="Wissen durchsuchen ..."
                  aria-label="Wissen durchsuchen"
                  autoComplete="off"
                  onChange={(event) => setQuery(event.target.value)}
                />
                <kbd>⌘ K</kbd>
              </label>
              {query.trim().length >= 2 ? <SearchPanel query={query} onPick={() => setQuery('')} /> : null}
            </div>
            <a className="button primary" href="#/import"><Icon name="plus" /> Importieren</a>
          </div>
        </header>
        <main id="inhalt" className="main">
          <p id="notice" className="live" role="status">{state.notice ?? 'Bereit.'}</p>
          {state.error || openError ? <p id="error" className="live" role="alert">{state.error ?? openError}</p> : null}
          <View route={route} at={at} custom={customAt !== null} reducedMotion={reducedMotion} onTime={setCustomAt} />
        </main>
        <footer className="app-footer">
          <span>MEMORY ATLAS / EXPERIMENTAL INTERFACE</span>
          <span><span className="footer-dot" aria-hidden="true" /> Read-only Demo-Daten · lokaler JSON-Import</span>
        </footer>
      </div>
      <Inspector />
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
      return <OverviewView at={at} />;
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
    case 'doctor':
      return <DoctorView />;
    default: {
      const neverRoute: never = route;
      return <p>Unbekannte Ansicht {String(neverRoute)}</p>;
    }
  }
}
