import { downloadBytes } from '../../components/download';
import { detectConflicts } from '../../domain/conflicts';
import type { QueryTime } from '../../domain/models.generated';
import { useAtlas } from '../../service-context';
import { useShell } from '../../selection';
import { Icon, type IconName } from './icons';

const discover: readonly { id: string; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Überblick', icon: 'overview' },
  { id: 'source', label: 'Quelle', icon: 'source' },
  { id: 'knowledge', label: 'Wissenskarten', icon: 'knowledge' },
  { id: 'changes', label: 'Alt/Neu', icon: 'changes' },
  { id: 'timeline', label: 'Zeit', icon: 'timeline' },
  { id: 'graph', label: 'Beziehungen', icon: 'graph' },
  { id: 'review', label: 'Prüfung', icon: 'review' },
  { id: 'sources', label: 'Quellenlage', icon: 'sources' },
];

const dataLinks: readonly { id: string; label: string; icon: IconName }[] = [
  { id: 'import', label: 'Import', icon: 'import' },
  { id: 'memory', label: 'Freigabe', icon: 'memory' },
];

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
      <div className="brand-row" aria-hidden="true">
        <span className="brand-mark"><span className="brand-glyph">◈</span></span>
        <span className="brand-text">
          <strong>memory<span className="brand-dot">.</span>atlas</strong>
          <small>THE KNOWLEDGE OPERATING SYSTEM</small>
        </span>
      </div>
      <div className="workspace-section">
        <p className="side-label">Workspace</p>
        <div className="workspace-switch">
          <span className="workspace-avatar" aria-hidden="true">W</span>
          <span className="workspace-copy">
            <strong className="workspace-title">{snapshot.workspace.title}</strong>
            <span>Lokal · Privater Bereich</span>
          </span>
        </div>
      </div>
      <div className="nav-group">
        <p className="side-label">Entdecken</p>
        <div className="nav-links">
          {discover.map((item) => (
            <NavLink key={item.id} {...item} route={route} count={counts[item.id] ?? 0} bubble={item.id === 'review'} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
      <div className="nav-group">
        <p className="side-label">Daten & Verbindungen</p>
        <div className="nav-links">
          {dataLinks.map((item) => (
            <NavLink key={item.id} {...item} route={route} count={counts[item.id] ?? 0} bubble={false} onNavigate={onNavigate} />
          ))}
        </div>
        <p className="connector-mini"><span className="connector-lights" aria-hidden="true">● ● ●</span> Lokaler Prototyp</p>
      </div>
      <p className="side-label">Projekte</p>
      {projects.length === 0 ? <p className="nav-empty">Keine Projekte</p> : null}
      <div className="nav-links">
        <button type="button" className="project-link" aria-pressed={projectId === null} onClick={() => setProjectId(null)}>
          <span className="dot" style={{ background: '#84939b' }} aria-hidden="true" />
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
        <div className="privacy-panel">
          <span className="privacy-icon"><Icon name="lock" /></span>
          <div>
            <strong>Local-first</strong>
            <span>Keine Datenübertragung</span>
          </div>
          <span className="live-circle" aria-hidden="true" />
        </div>
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
        <a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined} onClick={onNavigate}><Icon name="settings" /><span>Einstellungen</span></a>
        <a href="#/doctor" aria-current={route === 'doctor' ? 'page' : undefined} onClick={onNavigate}>
          <Icon name="doctor" />
          <span>Doctor</span>
          <span className={state.error ? 'status-dot bad' : 'status-dot ok'} aria-hidden="true" />
        </a>
        <div className="side-user">
          <span className="user-avatar" aria-hidden="true">MA</span>
          <span><strong>Memory Atlas</strong><small>Community Preview · 0.1</small></span>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ id, label, icon, route, count, bubble, onNavigate }: { id: string; label: string; icon: IconName; route: string; count: number; bubble: boolean; onNavigate: () => void }) {
  return (
    <a href={`#/${id}`} aria-current={route === id ? 'page' : undefined} onClick={onNavigate}>
      <Icon name={icon} />
      <span>{label}</span>
      <span className={bubble && count > 0 ? 'nav-bubble' : 'nav-count'} aria-hidden="true">{count}</span>
    </a>
  );
}

function projectColor(id: string): string {
  const palette = ['#92B8EC', '#74DEC1', '#FB938F', '#ECC58A', '#B6AAE4'];
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length] ?? '#92B8EC';
}
