import type { AtlasSnapshot, ReviewEvent } from '../../domain/models.generated';
import type { Selection } from '../../selection';
import { useAtlas } from '../../service-context';
import { useShell } from '../../selection';
import { partText } from '../format';

export function Inspector() {
  const { state } = useAtlas();
  const { selection } = useShell();
  const snapshot = state.snapshot;
  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="ins-head">
        <p className="eyebrow">Inspector</p>
        <p className="ins-heading">{heading(snapshot, selection)}</p>
      </div>
      {selection ? <SelectionBody snapshot={snapshot} selection={selection} /> : <WorkspaceBody dirty={state.dirty} demo={state.demo} />}
    </aside>
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
      <p className="inspector-quote">{claim.text}</p>
      <dl className="ins-pairs">
        <div><dt>ID</dt><dd className="mono">{claim.id}</dd></div>
        <div><dt>Wert</dt><dd>{claim.value}</dd></div>
        <div><dt>Art</dt><dd>{claim.kind}</dd></div>
        <div><dt>Herkunft</dt><dd>{claim.source_kind}</dd></div>
        <div><dt>Kategorie</dt><dd>{claim.category}</dd></div>
        <div><dt>Projekt</dt><dd className="mono">{claim.scope.project_id ?? 'keins'}</dd></div>
        <div><dt>Aufgezeichnet</dt><dd className="mono">{claim.recorded_at}</dd></div>
      </dl>
      {quotes.length > 0 ? <blockquote className="source-quote">{quotes.map((item) => item.quote).join('\n')}</blockquote> : <p className="meta">Kein Belegzitat gespeichert.</p>}
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
      <p className="ins-label">Zeitverlauf</p>
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
