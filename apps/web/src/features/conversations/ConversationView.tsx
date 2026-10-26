import { useMemo, useState } from 'react';
import { sixCalendarMonths, messageWindowRelation } from '../../domain/date-window';
import { useAtlas } from '../../service-context';
import { branchLabel, partText, roleLabel } from '../format';
import { selectionWithin, type TextSpan } from '../selection';
import { ClaimDialog } from '../knowledge/ClaimDialog';

export function ConversationView() {
  const { state } = useAtlas();
  const snapshot = state.snapshot;
  const [conversationId, setConversationId] = useState<string | null>(snapshot.conversations[0]?.id ?? null);
  const [showAlternate, setShowAlternate] = useState(false);
  const [showUnknown, setShowUnknown] = useState(true);
  const [recentOnly, setRecentOnly] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [draft, setDraft] = useState<{ messageRevisionId: string; nodeId: string; partIndex: number; role: typeof snapshot.messages[number]['role']; span: TextSpan } | null>(null);
  const window = useMemo(() => sixCalendarMonths(new Date(), snapshot.workspace.timezone), [snapshot.workspace.timezone, snapshot.snapshot_id]);
  const activeId = snapshot.conversations.some((item) => item.id === conversationId) ? conversationId : snapshot.conversations[0]?.id ?? null;
  const conversation = snapshot.conversations.find((item) => item.id === activeId) ?? null;

  const messages = snapshot.messages.filter((message) => message.conversation_id === conversation?.id);
  const visibleMessages = messages.filter((message) => {
    if (hidden.includes(message.revision_id)) return false;
    const nodes = snapshot.nodes.filter((node) => node.message_revision_id === message.revision_id);
    const branches = new Set(nodes.map((node) => node.branch_membership));
    if (branches.has('alternate') && !branches.has('selected') && !showAlternate) return false;
    if (branches.has('unknown') && !branches.has('selected') && !showUnknown) return false;
    return true;
  });
  const relationOf = (sentAt: string | null) => (recentOnly ? messageWindowRelation(sentAt, window) : 'inside');
  const inWindow = visibleMessages.filter((message) => relationOf(message.sent_at) === 'inside' || relationOf(message.sent_at) === 'before');
  const unknown = visibleMessages.filter((message) => relationOf(message.sent_at) === 'unknown');

  return (
    <section className="stack">
      <h2>Quelle</h2>
      <p className="meta" data-testid="date-window">
        Zeitraum {window.startInclusive} bis {window.endExclusive} exklusiv, {window.timeZone}
      </p>
      <div className="row">
        <label><input type="checkbox" checked={recentOnly} onChange={(event) => setRecentOnly(event.target.checked)} /> Nur Nachrichten der letzten sechs Kalendermonate</label>
        <label><input type="checkbox" checked={showAlternate} onChange={(event) => setShowAlternate(event.target.checked)} /> Alternative Zweige zeigen</label>
        <label><input type="checkbox" checked={showUnknown} onChange={(event) => setShowUnknown(event.target.checked)} /> Unklare Zweige zeigen</label>
      </div>
      <p>Manuell ausgeblendet: {hidden.length}</p>
      {hidden.length > 0 ? <button type="button" className="button" onClick={() => setHidden([])}>Ausblendung zurücknehmen</button> : null}
      {snapshot.conversations.length === 0 ? <p className="card">Noch keine Quelle. Importiere eine JSON-Datei.</p> : null}
      <div className="with-inspector">
        <div className="stack">
          <ul className="stack">
            {snapshot.conversations.map((item) => (
              <li key={item.id}>
                <button type="button" className="button" aria-pressed={item.id === activeId} onClick={() => setConversationId(item.id)}>
                  {item.title} · {item.external_id}
                </button>
              </li>
            ))}
          </ul>
          {conversation ? (
            <div className="stack">
              <h2>{conversation.title}</h2>
              <div data-testid="in-window" className="stack">
                <h2>Im Zeitraum</h2>
                {inWindow.map((message) => (
                  <MessageCard
                    key={message.revision_id}
                    messageId={message.revision_id}
                    role={roleLabel(message.role)}
                    sent={message.sent_at ?? 'unbekannt'}
                    recorded={message.recorded_at}
                    context={recentOnly && messageWindowRelation(message.sent_at, window) === 'before'}
                    branches={snapshot.nodes.filter((node) => node.message_revision_id === message.revision_id).map((node) => branchLabel(node.branch_membership))}
                    parts={message.parts.map((part, index) => ({ index, kind: part.kind, text: partText(part), selectable: part.kind === 'text' && part.text !== null }))}
                    onHide={() => setHidden((current) => [...current, message.revision_id])}
                    onSelect={(partIndex, root) => {
                      const span = selectionWithin(root);
                      const node = snapshot.nodes.find((item) => item.message_revision_id === message.revision_id && item.branch_membership === 'selected')
                        ?? snapshot.nodes.find((item) => item.message_revision_id === message.revision_id);
                      if (!span || !node) return;
                      setDraft({ messageRevisionId: message.revision_id, nodeId: node.id, partIndex, role: message.role, span });
                    }}
                  />
                ))}
              </div>
              {recentOnly ? (
                <div data-testid="unknown-time" className="stack">
                  <h2>Zeit unbekannt</h2>
                  {unknown.map((message) => (
                    <p key={message.revision_id}>{message.parts.map((part) => partText(part)).join(' ')}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <aside className="panel">
          <h2>Hinweis</h2>
          <p>Text wird als Daten gezeigt und nicht ausgeführt. Medien bleiben Platzhalter.</p>
        </aside>
      </div>
      {draft ? <ClaimDialog {...draft} onClose={() => setDraft(null)} /> : null}
    </section>
  );
}

interface MessageCardProps {
  messageId: string;
  role: string;
  sent: string;
  recorded: string;
  context: boolean;
  branches: string[];
  parts: { index: number; kind: string; text: string; selectable: boolean }[];
  onHide: () => void;
  onSelect: (partIndex: number, root: HTMLElement) => void;
}

function MessageCard({ messageId, role, sent, recorded, context, branches, parts, onHide, onSelect }: MessageCardProps) {
  return (
    <article className="card stack" data-message={messageId}>
      <p>Rolle: {role}</p>
      <p>Gesendet: {sent}</p>
      <p>Aufgezeichnet: {recorded}</p>
      <p>Zweig: {branches.join(', ') || 'unklar'}</p>
      {context ? <p className="status info">Kontext, älter als der Zeitraum</p> : null}
      {parts.map((part) => (
        <div key={part.index} className="stack">
          {part.selectable ? (
            <p className="message" data-testid={`part-${messageId}-${part.index}`}>{part.text}</p>
          ) : (
            <p className="status warn">Platzhalter ({part.kind}): {part.text}</p>
          )}
          {part.selectable ? (
            <button
              type="button"
              className="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                const root = event.currentTarget.parentElement?.querySelector('p');
                if (root instanceof HTMLElement) onSelect(part.index, root);
              }}
            >
              Auswahl als Wissenskarte
            </button>
          ) : null}
        </div>
      ))}
      <button type="button" className="button" onClick={onHide}>Manuell ausblenden</button>
    </article>
  );
}
