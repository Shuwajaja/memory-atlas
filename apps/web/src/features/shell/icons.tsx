export type IconName =
  | 'overview'
  | 'library'
  | 'clock'
  | 'shield'
  | 'upload'
  | 'download'
  | 'search'
  | 'plus'
  | 'lock'
  | 'help'
  | 'arrow'
  | 'check'
  | 'x'
  | 'layers'
  | 'git'
  | 'activity'
  | 'alert'
  | 'filter'
  | 'info'
  | 'spark'
  | 'book'
  | 'eye'
  | 'external'
  | 'trash'
  | 'branch'
  | 'settings'
  | 'archive'
  | 'bolt';

const ICONS: Record<IconName, string> = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
  library: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.8 9a2.5 2.5 0 1 1 4.2 2.1c-1.1.8-2 1.3-2 2.9M12 17h.01"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  x: '<path d="M5 5 19 19M19 5 5 19"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  git: '<circle cx="6" cy="4" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12M6 12h7a5 5 0 0 0 5-5"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  alert: '<path d="m12 2 10 18H2L12 2Z"/><path d="M12 9v4m0 3h.01"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10h.01"/>',
  spark: '<path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3ZM20 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"/>',
  book: '<path d="M3 5a3 3 0 0 1 3-3h14v19H6a3 3 0 0 1-3-3V5Zm0 13a3 3 0 0 1 3-3h14"/>',
  eye: '<path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>',
  external: '<path d="M11 5H5v14h14v-6M12 12l9-9m-6 0h6v6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',
  branch: '<circle cx="6" cy="4" r="2"/><circle cx="18" cy="17" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12M6 10h6a6 6 0 0 1 6 6"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 14h4"/>',
  bolt: '<path d="m13 2-9 11h7l-1 9 10-12h-7V2Z"/>',
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
