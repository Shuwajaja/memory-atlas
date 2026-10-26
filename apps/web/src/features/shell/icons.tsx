export type IconName =
  | 'overview'
  | 'import'
  | 'source'
  | 'knowledge'
  | 'changes'
  | 'timeline'
  | 'graph'
  | 'review'
  | 'sources'
  | 'memory'
  | 'settings'
  | 'doctor'
  | 'lock'
  | 'search'
  | 'plus'
  | 'shield'
  | 'inbox';

const paths: Record<IconName, string> = {
  overview: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z',
  import: 'M12 4v10m0 0 4-4m-4 4-4-4M5 20h14',
  source: 'M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm7 0v5h5',
  knowledge: 'M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5zM5 5.5V21.5',
  changes: 'M8 7h11M8 12h11M8 17h11M5 7h.01M5 12h.01M5 17h.01',
  timeline: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  graph: 'M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-6 5.2 3.2M8 9l5.2 3.2',
  review: 'M12 3 5 6v5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6z',
  sources: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  memory: 'M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M18 6l-2 2M8 16l-2 2',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM4 12h2m12 0h2M12 4v2m0 12v2',
  doctor: 'M9 12h6M12 9v6M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  lock: 'M8 11V8a4 4 0 0 1 8 0v3M7 11h10v9H7z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm10 3-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  shield: 'M12 3 5 6v5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6zM9 12l2 2 4-4',
  inbox: 'M4 13h4l2 3h4l2-3h4v6H4zM4 13 6 5h12l2 8',
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
