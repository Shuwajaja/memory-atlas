export type TopicId = 'agents' | 'projects' | 'memory' | 'design' | 'infra' | 'business' | 'other';

export type VisualKind = 'decision' | 'architecture' | 'plan' | 'preference' | 'snapshot' | 'task';

export type VisualStatus = 'current' | 'outdated' | 'review' | 'conflict' | 'planned' | 'approved' | 'excluded';

export interface VisualCard {
  id: string;
  title: string;
  detail: string;
  kind: VisualKind;
  category: TopicId;
  status: VisualStatus;
  date: string;
  sourceTitle: string;
  source: string;
  sourceId: string;
  sourceExcerpt: string;
  demo: boolean;
  relation?: string;
}

export const TOPIC_LABELS: Record<TopicId, string> = {
  agents: 'Agenten & Harnesses',
  projects: 'Projekte & Produkt',
  memory: 'Memory & Wissen',
  design: 'Design & Oberfläche',
  infra: 'Infrastruktur',
  business: 'Business & Jobs',
  other: 'Sonstiges',
};

export const ILLUSTRATION: readonly VisualCard[] = [
  { id: 'd-factory-old', title: 'Eine Agent Factory koordiniert die Entwicklung', detail: 'Früherer Plan: eine Agent Factory soll spezialisierte Agenten automatisch zusammenstellen und koordinieren.', kind: 'architecture', category: 'agents', status: 'outdated', date: '2026-09-12', sourceTitle: 'Beispiel · Früherer Architekturentwurf', source: 'ChatGPT', sourceId: 'demo:architecture-09', sourceExcerpt: 'Beispielhafte frühere Planung einer Agent Factory – kein Originalzitat.', demo: true, relation: 'd-factory-new' },
  { id: 'd-factory-new', title: 'Die Agent Factory wird nicht mehr betrieben', detail: 'Spätere Architekturentscheidung: Komponenten werden einzeln geprüft. Mausbot und Agent Zero bleiben getrennte Bestandteile; keine laufende Agent Factory voraussetzen.', kind: 'decision', category: 'agents', status: 'current', date: '2026-10-23', sourceTitle: 'Beispiel · Architekturkorrektur', source: 'Gespräch', sourceId: 'demo:decision-10', sourceExcerpt: 'Illustration einer neueren Nutzerentscheidung; vor produktivem Einsatz mit Originalquelle abgleichen.', demo: true, relation: 'd-factory-old' },
  { id: 'd-truthlens-old', title: 'TruthLens als öffentlicher Live-Viewer', detail: 'Frühe öffentliche Viewer- und Deployment-Ideen; die Bereitstellung echter privater Agentendaten darf daraus nicht abgeleitet werden.', kind: 'plan', category: 'projects', status: 'outdated', date: '2026-09-28', sourceTitle: 'Beispiel · Early Viewer SPECC', source: 'SPECC', sourceId: 'demo:viewer-plan', sourceExcerpt: 'Beispiel einer überholten Veröffentlichungsrichtung.', demo: true, relation: 'd-truthlens-new' },
  { id: 'd-truthlens-new', title: 'TruthLens-Prüfdaten nur lokal zugänglich', detail: 'Grundsatz für private Prüfberichte: lokaler Reader, kontrollierter Zugang über SSH-Tunnel und D34-Statusbegrenzung für Agenten. Geplanter MCP-Adapter ist kein belegter Live-Betrieb.', kind: 'decision', category: 'projects', status: 'current', date: '2026-10-25', sourceTitle: 'Beispiel · Sicherheitsdesign D34', source: 'SPECC', sourceId: 'demo:security-d34', sourceExcerpt: 'Beispiel eines Sicherheitsgrundsatzes, nicht als heutige Serverprüfung zu verstehen.', demo: true, relation: 'd-truthlens-old' },
  { id: 'd-design', title: 'FQL Research Editorial ist die UI-Richtung', detail: 'Dunkler Editorial-Look mit Hintergrund #0B1117, Mint-Akzent #74DEC1, klarer Typografie und modularen Oberflächen für Dashboards und Wissensvisualisierungen.', kind: 'preference', category: 'design', status: 'current', date: '2026-10-25', sourceTitle: 'Beispiel · DESIGN.md Konvention', source: 'Gespräch', sourceId: 'demo:design-10', sourceExcerpt: 'Visualisierung eines erarbeiteten Designstandards. Für Produktfreigaben Original-DESIGN.md heranziehen.', demo: true },
  { id: 'd-honcho-old', title: 'Honcho-Import enthält 127 Wissenskarten', detail: 'Historische Zahl aus einem Importbericht. Die Anzahl ist kein dauerhafter Bestand und kann sich später geändert haben.', kind: 'snapshot', category: 'memory', status: 'outdated', date: '2026-10-23', sourceTitle: 'Beispiel · Honcho Importbericht', source: 'Übergabe', sourceId: 'demo:honcho-import', sourceExcerpt: 'Zahlenbeispiel aus einer älteren Momentaufnahme; keine aktuelle Honcho-Live-Abfrage.', demo: true, relation: 'd-honcho-new' },
  { id: 'd-honcho-new', title: 'Honcho-Wissensbestand erneut abgleichen', detail: 'Neuere Bestandsangaben weichen von der ursprünglichen Importzahl ab. Aktuelle Anzahl und gültige Karten müssen per Read-only-Auslese ermittelt werden.', kind: 'task', category: 'memory', status: 'review', date: '2026-10-26', sourceTitle: 'Beispiel · Gedächtnisprüfung', source: 'Gespräch', sourceId: 'demo:honcho-audit', sourceExcerpt: 'Illustration eines offenen Prüfauftrags; kein ausgelesener Ist-Bestand.', demo: true, relation: 'd-honcho-old' },
  { id: 'd-artifact', title: 'Artifact Hub soll Agenten-Artefakte nutzbar machen', detail: 'Geplante Komponenten: Import, Renderer-Galerie, Markdown-/JSON-Visualisierung, Export und Verbindung zu TruthLens-Belegen.', kind: 'plan', category: 'projects', status: 'planned', date: '2026-10-24', sourceTitle: 'Beispiel · Artifact Hub Konzept', source: 'SPECC', sourceId: 'demo:artifact-hub', sourceExcerpt: 'Produktkonzept ist nicht identisch mit fertiger Funktion oder bestandenem E2E-Test.', demo: true },
  { id: 'd-memory', title: 'Erinnerungen brauchen Quelle, Zeit und Gültigkeit', detail: 'Eine automatisch extrahierte Aussage wird erst zum Wissenskandidaten. Eine bestätigte Erinnerung muss ihre Herkunft, Änderungsverlauf und Prüfung behalten.', kind: 'architecture', category: 'memory', status: 'current', date: '2026-10-26', sourceTitle: 'Beispiel · Memory Atlas SPECC', source: 'SPECC', sourceId: 'demo:memory-atlas', sourceExcerpt: 'Konzeptvorschlag für diesen Prototyp; noch keine produktive Wissens-Pipeline.', demo: true },
  { id: 'd-agentzero', title: 'Agent Zero bleibt als Supervisor vorgesehen', detail: 'Mausbot als Nutzeroberfläche, Agent Zero als ausführender Supervisor; konkrete Integrations- und Betriebszustände müssen separat geprüft werden.', kind: 'architecture', category: 'agents', status: 'current', date: '2026-10-26', sourceTitle: 'Beispiel · Stack-Übersicht', source: 'Gespräch', sourceId: 'demo:stack', sourceExcerpt: 'Beispielhafte Zielarchitektur; keine Live-Systemprüfung.', demo: true },
  { id: 'd-hermes', title: 'Hermes zunächst nur als spätere Option prüfen', detail: 'Ältere Unterlagen zur Abwahl von Hermes dürfen eine spätere neue Evaluation nicht verdecken. Eine Prüfung bedeutet jedoch nicht, dass Hermes bereits produktiv eingebunden wurde.', kind: 'decision', category: 'agents', status: 'review', date: '2026-10-26', sourceTitle: 'Beispiel · Alternativenüberlegung', source: 'Gespräch', sourceId: 'demo:hermes-reconsider', sourceExcerpt: 'Abgrenzung zwischen neuem Evaluationswunsch und beschlossener Installation.', demo: true },
  { id: 'd-mcp', title: 'Lokaler Status-MCP als TruthLens-Erweiterung', detail: 'Ein MCP-Server kann Status aus dem Read-only Reader abfragen und an Agenten ausgeben; keine Belege oder Pfade ausgeben. Implementierung und Deployment erst getrennt verifizieren.', kind: 'plan', category: 'infra', status: 'planned', date: '2026-10-25', sourceTitle: 'Beispiel · Phase G SPECC', source: 'SPECC', sourceId: 'demo:phase-g', sourceExcerpt: 'Spezifikationsstand ≠ installierte und getestete Integration.', demo: true },
];

export interface ActivityRow {
  id: string;
  title: string;
  sub: string;
  icon: 'git' | 'alert' | 'shield';
  tone: '' | 'amber' | 'red';
  day: string;
}

export const ILLUSTRATION_ACTIVITY: readonly ActivityRow[] = [
  { id: 'd-factory-new', title: 'Eine Architekturentscheidung ersetzt einen älteren Plan', sub: 'Agent Factory · Aktualisierung', icon: 'git', tone: '', day: '23.10.' },
  { id: 'd-honcho-new', title: 'Honcho-Bestand muss erneut geprüft werden', sub: 'Memory · Unterschiedliche Momentaufnahmen', icon: 'alert', tone: 'amber', day: '26.10.' },
  { id: 'd-truthlens-new', title: 'TruthLens: Zugriffsgrenze dokumentiert', sub: 'Projektwissen · D34', icon: 'shield', tone: 'red', day: '25.10.' },
];

const STATUS_MAP: Record<VisualStatus, [string, string]> = {
  current: ['Aktuell · Demo', 'current'],
  outdated: ['Ersetzt · Demo', 'outdated'],
  review: ['Prüfung offen', 'review'],
  conflict: ['Konflikt · Demo', 'conflict'],
  planned: ['Geplant · Demo', 'planned'],
  approved: ['Freigegeben', 'current'],
  excluded: ['Ausgeschlossen', 'outdated'],
};

export function dateLabel(value: string | null | undefined): string {
  if (!value) return 'Datum unbekannt';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Datum unbekannt';
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

export function shortDay(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.`;
}

export function statusTag(card: VisualCard): { label: string; tone: string } {
  const entry = STATUS_MAP[card.status];
  const [label, tone] = entry;
  const text = card.demo ? label : (card.status === 'current' ? 'Aktuell' : label);
  return { label: text, tone };
}

export function cardKind(card: VisualCard): string {
  switch (card.kind) {
    case 'decision':
      return 'Entscheidung';
    case 'architecture':
      return 'Architektur';
    case 'plan':
      return 'Plan / SPECC';
    case 'preference':
      return 'Präferenz';
    case 'snapshot':
      return 'Momentaufnahme';
    case 'task':
      return 'Offene Prüfung';
    default: {
      const neverKind: never = card.kind;
      return neverKind;
    }
  }
}

export function countStatuses(cards: readonly VisualCard[]): { all: number; current: number; review: number; old: number; approved: number } {
  return {
    all: cards.length,
    current: cards.filter((card) => card.status === 'current' || card.status === 'approved').length,
    review: cards.filter((card) => card.status === 'review' || card.status === 'conflict').length,
    old: cards.filter((card) => card.status === 'outdated').length,
    approved: cards.filter((card) => card.status === 'approved' && !card.demo).length,
  };
}

export function topicCount(cards: readonly VisualCard[], topic: TopicId | 'all'): number {
  if (topic === 'all') return cards.length;
  return cards.filter((card) => card.category === topic).length;
}
