import type { QueryTime } from '../../domain/models.generated';
import { useAtlas } from '../../service-context';
import { countStatuses } from '../overview/reference-demo';
import { visualCards } from '../overview/visual-cards';
import { Icon, type IconName } from './icons';

const discover: readonly { id: string; label: string; icon: IconName; aside: 'count' | 'bubble' | 'static' }[] = [
  { id: 'overview', label: 'Übersicht', icon: 'overview', aside: 'static' },
  { id: 'knowledge', label: 'Wissensbibliothek', icon: 'library', aside: 'count' },
  { id: 'timeline', label: 'Zeitreise', icon: 'clock', aside: 'static' },
  { id: 'review', label: 'Prüflabor', icon: 'shield', aside: 'bubble' },
];

interface SidebarProps {
  route: string;
  at: QueryTime;
  onNavigate: () => void;
}

export function Sidebar({ route, at, onNavigate }: SidebarProps) {
  const { state } = useAtlas();
  const counts = countStatuses(visualCards(state.snapshot, at));

  return (
    <aside className="sidebar" aria-label="Hauptnavigation">
      <div className="brand-row">
        <span className="brand-mark" aria-hidden="true"><span className="brand-glyph">◈</span></span>
        <span className="brand-text">
          <strong>memory<span className="brand-dot">.</span>atlas</strong>
          <small>THE KNOWLEDGE OPERATING SYSTEM</small>
        </span>
      </div>
      <div className="workspace-section">
        <span className="side-label">WORKSPACE</span>
        <div className="workspace-switch">
          <div className="workspace-avatar">W</div>
          <div className="workspace-info"><strong>Mein Wissensraum</strong><span>Lokal · Privater Bereich</span></div>
          <span className="chevron">⌄</span>
        </div>
      </div>
      <div className="nav-group">
        <div className="side-label nav-heading">ENTDECKEN</div>
        {discover.map((item) => {
          const suffix = item.aside === 'bubble' ? String(counts.review) : item.aside === 'count' ? String(counts.all) : item.id === 'overview' ? '01' : '';
          return (
            <a
              key={item.id}
              className={route === item.id ? 'nav-link is-active' : 'nav-link'}
              href={`#/${item.id}`}
              aria-current={route === item.id ? 'page' : undefined}
              aria-label={`${item.label}${suffix}`}
              onClick={onNavigate}
            >
              <span><Icon name={item.icon} /></span>
              <span>{item.label}</span>
              {item.aside === 'bubble' ? <span className="nav-bubble">{counts.review}</span> : null}
              {item.aside === 'count' ? <span className="nav-aside">{counts.all}</span> : null}
              {item.id === 'overview' ? <span className="nav-aside">01</span> : null}
            </a>
          );
        })}
      </div>
      <div className="nav-group nav-second">
        <div className="side-label nav-heading">DATEN & VERBINDUNGEN</div>
        <a className={route === 'import' ? 'nav-link is-active' : 'nav-link'} href="#/import" aria-current={route === 'import' ? 'page' : undefined} aria-label="Import & Export" onClick={onNavigate}>
          <span><Icon name="upload" /></span>
          <span>Import & Export</span>
        </a>
        <div className="connector-mini"><span className="connector-lights">● <i>●</i> <b>●</b></span> Lokaler Prototyp</div>
      </div>
      <div className="sidebar-spacer" />
      <div className="side-bottom">
        <div className="privacy-panel">
          <span className="privacy-icon"><Icon name="lock" /></span>
          <div><strong>Local-first</strong><span>Keine Datenübertragung</span></div>
          <span className="live-circle" />
        </div>
        <div className="side-user">
          <span className="user-avatar">MA</span>
          <span><strong>Memory Atlas</strong><small>Community Preview · 0.1</small></span>
          <span className="tiny-more">···</span>
        </div>
      </div>
    </aside>
  );
}
