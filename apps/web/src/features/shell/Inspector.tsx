import type { AtlasSnapshot, ReviewEvent } from '../../domain/models.generated';
import type { Selection } from '../../selection';
import { useAtlas, useLiveQuery } from '../../service-context';
import { useShell } from '../../selection';
import { partText } from '../format';
import { cardKind, dateLabel, statusTag, TOPIC_LABELS, type VisualCard } from '../overview/reference-demo';
import { cardById, usesIllustration, visualCards } from '../overview/visual-cards';
import { Icon } from './icons';

export function Inspector() {
  const { state } = useAtlas();
  const at = useLiveQuery();
  const { selection, illustratedId, inspectorOpen, setInspectorOpen } = useShell();
  const snapshot = state.snapshot;
  const illustration = usesIllustration(snapshot);
  const cards = visualCards(snapshot, at);
  const illustrated = illustration ? cardById(cards, illustratedId) ?? cards[0] : undefined;
  return (
    <aside className={inspectorOpen ? 'inspector drawer-open' : 'inspector'} aria-label="Quelleninspektor" tabIndex={0}>
      {illustrated ? <DemoInspector card={illustrated} cards={cards} onClose={() => setInspectorOpen(false)} /> : selection ? (
        <>
          <div className="ins-head">
            <span className="ins-heading"><Icon name="eye" size={17} /> &nbsp; Inspector</span>
            <button type="button" className="ins-close" aria-label="Inspektor schließen" onClick={() => setInspectorOpen(false)}><Icon name="x" /></button>
            <span className="source-detail">SOURCE DETAIL</span>
          </div>
          <h2 className="inspector-card-title">{heading(snapshot, selection)}</h2>
          <SelectionBody snapshot={snapshot} selection={selection} />
        </>
      ) : (
        <>
          <div className="ins-head">
            <span className="ins-heading"><Icon name="eye" size={17} /> &nbsp; Inspector</span>
            <button type="button" className="ins-close" aria-label="Inspektor schließen" onClick={() => setInspectorOpen(false)}><Icon name="x" /></button>
            <span className="source-detail">SOURCE DETAIL</span>
          </div>
          <WorkspaceBody dirty={state.dirty} demo={state.demo} />
        </>
      )}
    </aside>
  );
}

function DemoInspector({ card, cards, onClose }: { card: VisualCard; cards: readonly VisualCard[]; onClose: () => void }) {
  const { setIllustratedId, setInspectorOpen } = useShell();
  const relation = card.relation ? cardById(cards, card.relation) : undefined;
  const tag = statusTag(card);
  return (
    <>
      <div className="ins-head">
        <span className="ins-heading"><Icon name="eye" size={17} /> &nbsp; Inspector</span>
        <button type="button" className="ins-close" aria-label="Inspektor schließen" onClick={onClose}><Icon name="x" /></button>
        <span className="source-detail">SOURCE DETAIL</span>
      </div>
      <div className="ins-kicker eyebrow muted">{card.demo ? 'SYNTHETISCHE DEMO-KARTE' : 'IMPORTIERTE ORIGINALQUELLE'}</div>
      <h2 className="inspector-card-title">{card.title}</h2>
      <div className="ins-status">
        <span className={`status-tag ${tag.tone}`}>{tag.label}</span>
        {card.demo ? <span className="tiny-tag">DEMO ONLY</span> : null}
      </div>
      <div className="ins-section">
        <div className="ins-label">Wissensinhalt</div>
        <p className="ins-text">{card.detail}</p>
      </div>
      <div className="ins-section">
        <div className="ins-label">Provenienz</div>
        <dl>
          <div className="ins-pair"><dt>Typ</dt><dd>{cardKind(card)}</dd></div>
          <div className="ins-pair"><dt>Thema</dt><dd>{TOPIC_LABELS[card.category]}</dd></div>
          <div className="ins-pair"><dt>Quelle</dt><dd>{card.sourceTitle || card.source || 'Unbekannt'}</dd></div>
          <div className="ins-pair"><dt>Gespräch</dt><dd>{card.sourceId || 'Keine ID'}</dd></div>
          <div className="ins-pair"><dt>Zeit</dt><dd>{dateLabel(card.date)}</dd></div>
        </dl>
      </div>
      <div className="ins-section">
        <div className="ins-label">{card.demo ? 'Beispieltext' : 'Originalnachricht'}</div>
        <blockquote className="source-quote">{card.sourceExcerpt || 'Quellenauszug fehlt.'}</blockquote>
        {card.demo ? <p className="ins-note">Dies ist ausdrücklich kein exaktes Zitat eines realen Chats.</p> : null}
      </div>
      {relation ? (
        <div className="ins-section">
          <div className="ins-label">Verknüpfter Verlauf</div>
          <button
            type="button"
            className="btn-muted linked-course"
            onClick={() => { setIllustratedId(relation.id); setInspectorOpen(true); }}
          >
            <Icon name="branch" size={15} /> {relation.title.length > 65 ? `${relation.title.slice(0, 64)}…` : relation.title}
          </button>
        </div>
      ) : null}
      <div className="ins-section">
        <div className="ins-label">Aktionen</div>
        <div className="inspector-actions">
          {card.demo ? <button type="button" className="btn-muted" disabled>Demo – keine echte Freigabe möglich</button> : null}
        </div>
        <p className="ins-note">{card.demo ? 'Beispielwissen fließt nie in den Export ein.' : 'Freigabe bestätigt nur die Aufnahme ins Memory, nicht die Wahrheit einer Agentenbehauptung.'}</p>
      </div>
    </>
  );
}

function WorkspaceBody({ dirty, demo }: { dirty: boolean; demo: boolean }) {
  const { state } = useAtlas();
  const snapshot = state.snapshot;
  return (
    <>
      <p className="ins-text">Nichts ausgewählt. Die Werte gehören zum geladenen Arbeitsbereich.</p>
      <dl className="ins-pairs">
        <div><dt>Titel</dt><dd>{snapshot.workspace.title} · {snapshot.workspace.id}</dd></div>
        <div><dt>Zeitzone</dt><dd>{snapshot.workspace.timezone}</dd></div>
        <div><dt>Schema</dt><dd className="mono">{snapshot.schema_version}</dd></div>
        <div><dt>Gespräche</dt><dd>{snapshot.conversations.length}</dd></div>
        <div><dt>Nachrichten</dt><dd>{snapshot.messages.length}</dd></div>
        <div><dt>Karten</dt><dd>{snapshot.claims.length}</dd></div>
        <div><dt>Reviews</dt><dd>{snapshot.reviews.length}</dd></div>
        <div><dt>Datei</dt><dd>{dirty ? 'Nicht als Datei gespeichert' : 'Datei und Sitzung stimmen überein'}</dd></div>
        <div><dt>Daten</dt><dd>{demo ? 'Beispieldaten' : 'Eigener Bestand'}</dd></div>
      </dl>
    </>
  );
}

function SelectionBody({ snapshot, selection }: { snapshot: AtlasSnapshot; selection: Selection }) {
  switch (selection.type) {
    case 'claim':
      return <ClaimBody snapshot={snapshot} id={selection.id} />;
    case 'conversation':
      return <ConversationBody snapshot={snapshot} id={selection.id} />;
    case 'message':
      return <MessageBody snapshot={snapshot} revisionId={selection.revisionId} />;
    case 'review':
      return <ReviewBody snapshot={snapshot} id={selection.id} />;
    case 'relation':
      return <RelationBody snapshot={snapshot} id={selection.id} />;
    case 'batch':
      return <BatchBody snapshot={snapshot} id={selection.id} />;
    case 'graph-node':
      return (
        <dl className="ins-pairs">
          <div><dt>Art</dt><dd>{selection.kind}</dd></div>
          <div><dt>Bezeichnung</dt><dd>{selection.label}</dd></div>
          <div><dt>Hinweis</dt><dd>Gruppierung aus dem Graphen, keine eigene Wissenskarte.</dd></div>
        </dl>
      );
    default: {
      const neverSelection: never = selection;
      return <p>{String(neverSelection)}</p>;
    }
  }
}

function ClaimBody({ snapshot, id }: { snapshot: AtlasSnapshot; id: string }) {
  const claim = snapshot.claims.find((item) => item.id === id);
  if (!claim) return <p className="ins-text">Die Karte ist nicht mehr im Bestand.</p>;
  const quotes = snapshot.evidence.filter((item) => claim.evidence_ids.includes(item.id));
  const events = timelineForClaim(snapshot, id);
  return (
    <>
      <section className="ins-section">
        <p className="ins-label">Herkunft</p>
        <dl className="ins-pairs">
          <div><dt>ID</dt><dd className="mono">{claim.id}</dd></div>
          <div><dt>Wert</dt><dd>{claim.value}</dd></div>
          <div><dt>Art</dt><dd>{claim.kind}</dd></div>
          <div><dt>Quelle</dt><dd>{claim.source_kind}</dd></div>
          <div><dt>Kategorie</dt><dd>{claim.category}</dd></div>
          <div><dt>Projekt</dt><dd className="mono">{claim.scope.project_id ?? 'keins'}</dd></div>
          <div><dt>Aufgezeichnet</dt><dd className="mono">{claim.recorded_at}</dd></div>
        </dl>
      </section>
      <section className="ins-section">
        <p className="ins-label">Zitat</p>
        {quotes.length > 0 ? <blockquote className="source-quote">{quotes.map((item) => item.quote).join('\n')}</blockquote> : <p className="meta">Kein Belegzitat gespeichert.</p>}
        <p className="inspector-quote">{claim.text}</p>
      </section>
      <Timeline events={events} />
    </>
  );
}

function ConversationBody({ snapshot, id }: { snapshot: AtlasSnapshot; id: string }) {
  const conversation = snapshot.conversations.find((item) => item.id === id);
  if (!conversation) return <p className="ins-text">Das Gespräch ist nicht mehr im Bestand.</p>;
  const messages = snapshot.messages.filter((item) => item.conversation_id === id);
  return (
    <dl className="ins-pairs">
      <div><dt>Titel</dt><dd>{conversation.title}</dd></div>
      <div><dt>Anbieter</dt><dd>{conversation.provider}</dd></div>
      <div><dt>Externe ID</dt><dd className="mono">{conversation.external_id}</dd></div>
      <div><dt>Nachrichten</dt><dd>{messages.length}</dd></div>
      <div><dt>Angelegt</dt><dd className="mono">{conversation.created_at ?? 'unbekannt'}</dd></div>
    </dl>
  );
}

function MessageBody({ snapshot, revisionId }: { snapshot: AtlasSnapshot; revisionId: string }) {
  const message = snapshot.messages.find((item) => item.revision_id === revisionId);
  if (!message) return <p className="ins-text">Die Nachricht ist nicht mehr im Bestand.</p>;
  return (
    <>
      <p className="inspector-quote">{message.parts.map((part) => partText(part)).join('\n')}</p>
      <dl className="ins-pairs">
        <div><dt>Rolle</dt><dd>{message.role}</dd></div>
        <div><dt>Gesendet</dt><dd className="mono">{message.sent_at ?? 'unbekannt'}</dd></div>
        <div><dt>Aufgezeichnet</dt><dd className="mono">{message.recorded_at}</dd></div>
        <div><dt>Revision</dt><dd className="mono">{message.revision_id}</dd></div>
      </dl>
    </>
  );
}

function ReviewBody({ snapshot, id }: { snapshot: AtlasSnapshot; id: string }) {
  const review = snapshot.reviews.find((item) => item.id === id);
  if (!review) return <p className="ins-text">Das Review ist nicht mehr im Bestand.</p>;
  return (
    <dl className="ins-pairs">
      <div><dt>Aktion</dt><dd>{review.action}</dd></div>
      <div><dt>Ziel</dt><dd className="mono">{review.target_id}</dd></div>
      <div><dt>Grund</dt><dd>{review.reason}</dd></div>
      <div><dt>Zeit</dt><dd className="mono">{review.recorded_at}</dd></div>
      <div><dt>seq</dt><dd>{review.seq}</dd></div>
    </dl>
  );
}

function RelationBody({ snapshot, id }: { snapshot: AtlasSnapshot; id: string }) {
  const relation = snapshot.relations.find((item) => item.id === id);
  if (!relation) return <p className="ins-text">Die Relation ist nicht mehr im Bestand.</p>;
  return (
    <dl className="ins-pairs">
      <div><dt>Typ</dt><dd>{relation.type}</dd></div>
      <div><dt>Von</dt><dd className="mono">{relation.from_claim_id}</dd></div>
      <div><dt>Nach</dt><dd className="mono">{relation.to_claim_id}</dd></div>
      <div><dt>Grund</dt><dd>{relation.reason}</dd></div>
      <div><dt>Aufgezeichnet</dt><dd className="mono">{relation.recorded_at}</dd></div>
    </dl>
  );
}

function BatchBody({ snapshot, id }: { snapshot: AtlasSnapshot; id: string }) {
  const batch = snapshot.import_batches.find((item) => item.id === id);
  if (!batch) return <p className="ins-text">Der Import ist nicht mehr im Bestand.</p>;
  return (
    <dl className="ins-pairs">
      <div><dt>ID</dt><dd className="mono">{batch.id}</dd></div>
      <div><dt>Abgeschlossen</dt><dd className="mono">{batch.completed_at}</dd></div>
      <div><dt>Dateien</dt><dd>{batch.source_file_ids.length}</dd></div>
      <div><dt>Hinweise</dt><dd>{batch.diagnostics.length}</dd></div>
      <div><dt>Adapter</dt><dd>{batch.adapter_version}</dd></div>
    </dl>
  );
}

function Timeline({ events }: { events: { id: string; at: string; title: string; detail: string }[] }) {
  return (
    <div className="ins-section">
      <p className="ins-label">Verlauf</p>
      {events.length === 0 ? <p className="meta">Keine Ereignisse für diese Auswahl.</p> : null}
      <ol className="timeline">
        {events.map((event) => (
          <li key={event.id}>
            <p className="mono timeline-time">{event.at}</p>
            <p>{event.title}</p>
            <p className="meta">{event.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function timelineForClaim(snapshot: AtlasSnapshot, id: string): { id: string; at: string; title: string; detail: string }[] {
  const reviews: ReviewEvent[] = snapshot.reviews.filter((item) => item.target_id === id);
  const reviewRows = reviews.map((item) => ({ id: item.id, at: item.recorded_at, title: item.action, detail: item.reason }));
  const relationRows = snapshot.relations
    .filter((item) => item.from_claim_id === id || item.to_claim_id === id)
    .map((item) => ({ id: item.id, at: item.recorded_at, title: item.type, detail: item.reason }));
  return [...reviewRows, ...relationRows].sort((a, b) => a.at.localeCompare(b.at));
}

function heading(snapshot: AtlasSnapshot, selection: Selection | null): string {
  if (!selection) return 'Bestand';
  switch (selection.type) {
    case 'claim':
      return snapshot.claims.find((item) => item.id === selection.id)?.value ?? 'Karte';
    case 'conversation':
      return snapshot.conversations.find((item) => item.id === selection.id)?.title ?? 'Gespräch';
    case 'message':
      return 'Nachricht';
    case 'review':
      return 'Review';
    case 'relation':
      return 'Relation';
    case 'batch':
      return 'Import';
    case 'graph-node':
      return selection.label;
    default: {
      const neverSelection: never = selection;
      return String(neverSelection);
    }
  }
}
