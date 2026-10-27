import { useEffect, useRef, useState } from 'react';
import { downloadBytes } from './components/download';
import { Dialog } from './components/Dialog';
import type { AtlasSnapshot, QueryTime } from './domain/models.generated';
import { ChangesView } from './features/changes/ChangesView';
import { ConversationView } from './features/conversations/ConversationView';
import { DoctorView } from './features/doctor/DoctorView';
import { GraphView } from './features/graph/GraphView';
import { ImportView } from './features/import/ImportView';
import { KnowledgeView } from './features/knowledge/KnowledgeView';
import { MemoryView } from './features/memory-sets/MemoryView';
import { dataOrigin, originFooter } from './features/overview/data-origin';
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
  ['overview', 'Übersicht'],
  ['import', 'Import & Export'],
  ['source', 'Quelle'],
  ['knowledge', 'Wissensbibliothek'],
  ['changes', 'Alt/Neu'],
  ['timeline', 'Zeitreise'],
  ['graph', 'Beziehungen'],
  ['review', 'Prüflabor'],
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
  const [customAt, setCustomAt] = useState<QueryTime | null>(null);
  const [pendingProject, setPendingProject] = useState<AtlasSnapshot | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [query, setQuery] = useState('');
  const [help, setHelp] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const at = customAt ?? liveAt;
  const routeLabel = ROUTES.find((item) => item[0] === route)?.[1] ?? 'Übersicht';

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
      if (event.key === 'Escape') setHelp(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openProject(file: File | undefined): void {
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
  }

  return (
    <div className="app-shell">
      <a className="skip" href="#inhalt">Zum Inhalt</a>
      <Sidebar route={route} at={at} onNavigate={() => undefined} />
      <div className="center-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{routeLabel}</strong>
          </div>
          <div className="top-actions">
            <div className="search-slot">
              <label className="search-wrap">
                <span><Icon name="search" /></span>
                <input
                  ref={searchRef}
                  id="globalSearch"
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
            <span className="top-separator" />
            <button type="button" className="icon-button" title="So funktioniert der Prototyp" aria-label="Hilfe" onClick={() => setHelp(true)}>
              <span><Icon name="help" /></span>
            </button>
            <a className="btn-primary top-import" href="#/import"><span><Icon name="plus" /></span> Importieren</a>
          </div>
        </header>
        <main id="inhalt" className="main-content" tabIndex={-1}>
          <p id="notice" className="sr" role="status">{state.notice ?? 'Bereit.'}</p>
          <View route={route} at={at} custom={customAt !== null} reducedMotion={reducedMotion} onTime={setCustomAt} />
          <SessionTools onOpen={openProject} />
        </main>
        <footer className="app-footer">
          <span>MEMORY ATLAS / EXPERIMENTAL INTERFACE</span>
          <span><span className="footer-dot" /> {originFooter(dataOrigin(state.snapshot, state.demo))}</span>
        </footer>
      </div>
      <Inspector />
      {state.error || openError ? <div className="toast visible error" role="alert">{state.error ?? openError}</div> : null}
      {help ? <HelpModal onClose={() => setHelp(false)} /> : null}
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

function SessionTools({ onOpen }: { onOpen: (file: File | undefined) => void }) {
  const { service, state } = useAtlas();
  return (
    <div className="session-tools">
      <button type="button" className="btn-muted" onClick={() => service.loadDemo()}>Demo laden</button>
      <button type="button" className="btn-muted" onClick={() => { const file = service.projectBytes(); downloadBytes(file.filename, file.bytes, 'application/json'); }}>Projekt herunterladen</button>
      <label className="btn-muted file-label">
        Projekt öffnen
        <input
          className="sr"
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            onOpen(file);
          }}
        />
      </label>
      <a className="btn-muted" href="#/source">Quelle</a>
      <a className="btn-muted" href="#/memory">Freigabe</a>
      <a className="btn-muted" href="#/graph">Beziehungen</a>
      <a className="btn-muted" href="#/changes">Alt/Neu</a>
      <a className="btn-muted" href="#/sources">Quellenlage</a>
      <a className="btn-muted" href="#/settings">Einstellungen</a>
      <a className="btn-muted" href="#/doctor">Doctor</a>
      <span>{state.snapshot.workspace.title}</span>
      <span>Gespräche: {state.snapshot.conversations.length}</span>
      {state.demo ? <span>Demo · synthetisch</span> : null}
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div className="eyebrow">MEMORY ATLAS / GUIDE</div>
        <h2 id="modalTitle">So arbeitet diese Vorschau.</h2>
        <p>Die App demonstriert eine Wissensoberfläche – sie prüft keine Live-Systeme und versendet keine Daten.</p>
        <ul>
          <li><strong>Wissensbibliothek:</strong> Aussagen finden, Status vergleichen, Quellen im Inspector betrachten.</li>
          <li><strong>Zeitreise:</strong> zeigen, wann ein Plan überholt wurde.</li>
          <li><strong>Prüflabor:</strong> offene Aussagen sichtbar halten.</li>
          <li><strong>Import:</strong> ChatGPT-JSON lokal laden. Das Claude-Profil ist nicht freigegeben. Mögliche Nutzerentscheidungen werden als Kandidaten markiert.</li>
          <li><strong>Freigabe:</strong> nur eine gespeicherte Auswahl, die die Exportpolicy besteht, wird nach ausdrücklicher Freigabe als Markdown oder JSON exportiert.</li>
        </ul>
        <p>Derzeit werden Kandidaten über einfache Schlüsselwortregeln gewonnen. Für echte semantische Analyse, Dubletten und externe Quellenprüfung sind zusätzliche Komponenten nötig.</p>
        <button type="button" className="btn-primary" onClick={onClose}>Verstanden <Icon name="check" /></button>
      </div>
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
