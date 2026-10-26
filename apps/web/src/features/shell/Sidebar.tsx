import { downloadBytes } from '../../components/download';
import { detectConflicts } from '../../domain/conflicts';
import type { QueryTime } from '../../domain/models.generated';
import { useAtlas } from '../../service-context';
import { useShell } from '../../selection';

const discover = [
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
] as const;

interface SidebarProps {
  route: string;
  open: boolean;
  at: QueryTime;
  onNavigate: () => void;
  onOpen: (file: File | undefined) => void;
}

export function Sidebar({ route, open, at, onNavigate, onOpen }: SidebarProps) {
  const { service, state } = useAtlas();
  const { projectId, setProjectId } = useShell();
  const snapshot = state.snapshot;
  const conflicts = detectConflicts(snapshot, at).length;
  const counts: Record<string, number> = {
    overview: snapshot.conversations.length,
    source: snapshot.conversations.length,
    knowledge: snapshot.claims.length,
    changes: conflicts,
    graph: snapshot.relations.length,
    review: snapshot.reviews.length,
    memory: snapshot.memory_sets.length,
    sources: snapshot.evidence.length,
    import: snapshot.source_files.length,
    timeline: snapshot.claims.length,
  };
  const projects = [...new Set(snapshot.claims.map((claim) => claim.scope.project_id).filter((id): id is string => Boolean(id)))].sort();

  return (
    <nav id="app-nav" className={open ? 'sidebar open' : 'sidebar'} aria-label="Hauptnavigation">
      <div className="brand-row">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-text">
          <strong>memory atlas</strong>
          <small>Lokal</small>
        </span>
      </div>
      <div className="workspace-switch">
        <span className="workspace-avatar" aria-hidden="true">W</span>
        <span className="workspace-copy">
          <strong className="workspace-title">{snapshot.workspace.title}</strong>
          <span>{snapshot.workspace.timezone}</span>
        </span>
      </div>
      <p className="side-label">Entdecken</p>
      <div className="nav-links">
        {discover.map(([id, label]) => (
          <a key={id} href={`#/${id}`} aria-current={route === id ? 'page' : undefined} onClick={onNavigate}>
            <span>{label}</span>
            <span className="nav-count" aria-hidden="true">{counts[id] ?? 0}</span>
          </a>
        ))}
      </div>
      <p className="side-label">Projekte</p>
      {projects.length === 0 ? <p className="nav-empty">Keine Projekte</p> : null}
      <div className="nav-links">
        <button type="button" className="project-link" aria-pressed={projectId === null} onClick={() => setProjectId(null)}>
          <span className="dot" style={{ background: '#A1A1AA' }} aria-hidden="true" />
          <span>Alle Projekte</span>
        </button>
        {projects.map((id) => (
          <button key={id} type="button" className="project-link" aria-pressed={projectId === id} onClick={() => setProjectId(id)}>
            <span className="dot" style={{ background: projectColor(id) }} aria-hidden="true" />
            <span className="mono">{id}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-spacer" />
      <div className="side-bottom">
        <button type="button" onClick={() => { const file = service.projectBytes(); downloadBytes(file.filename, file.bytes, 'application/json'); }}>Projekt herunterladen</button>
        <label className="file-label">
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
        <a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined} onClick={onNavigate}>Einstellungen</a>
        <a href="#/doctor" aria-current={route === 'doctor' ? 'page' : undefined} onClick={onNavigate}>
          <span>Doctor</span>
          <span className={state.error ? 'status-dot bad' : 'status-dot ok'} aria-hidden="true" />
        </a>
      </div>
    </nav>
  );
}

function projectColor(id: string): string {
  const palette = ['#79B8FF', '#74DEC1', '#FF7B72', '#E7C36A', '#A78BFA'];
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length] ?? '#79B8FF';
}
