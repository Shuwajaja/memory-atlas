import { useMemo } from 'react';
import type { AtlasSnapshot } from '../../domain/models.generated';
import { partText } from '../format';
import type { Selection } from '../../selection';
import { useAtlas } from '../../service-context';
import { useShell } from '../../selection';

interface Hit {
  key: string;
  title: string;
  detail: string;
  href: string;
  selection: Selection;
}

const limit = 30;

export function SearchPanel({ query, onPick }: { query: string; onPick: () => void }) {
  const { state } = useAtlas();
  const { setSelection } = useShell();
  const hits = useMemo(() => searchSnapshot(state.snapshot, query), [state.snapshot, query]);
  const shown = hits.slice(0, limit);
  return (
    <div className="search-panel">
      <p className="meta">{query.trim().length < 2 ? 'Mindestens zwei Zeichen.' : `${hits.length} Treffer im geladenen Bestand.`}</p>
      <ul className="stack search-results">
        {shown.map((hit) => (
          <li key={hit.key}>
            <a
              className="search-hit"
              href={hit.href}
              onClick={() => {
                setSelection(hit.selection);
                onPick();
              }}
            >
              <strong>{hit.title}</strong>
              <span>{hit.detail}</span>
            </a>
          </li>
        ))}
      </ul>
      {hits.length > shown.length ? <p className="meta">Weitere {hits.length - shown.length} Treffer sind nicht gelistet.</p> : null}
    </div>
  );
}

function searchSnapshot(snapshot: AtlasSnapshot, raw: string): Hit[] {
  const query = raw.trim().toLocaleLowerCase('de');
  if (query.length < 2) return [];
  const hits: Hit[] = [];
  const has = (value: string | null | undefined) => (value ?? '').toLocaleLowerCase('de').includes(query);
  for (const claim of snapshot.claims) {
    if (has(claim.text) || has(claim.value) || has(claim.id) || has(claim.predicate)) {
      hits.push({
        key: `claim:${claim.id}`,
        title: claim.value || claim.text,
        detail: claim.text,
        href: '#/knowledge',
        selection: { type: 'claim', id: claim.id },
      });
    }
  }
  for (const conversation of snapshot.conversations) {
    if (has(conversation.title) || has(conversation.external_id) || has(conversation.id)) {
      hits.push({
        key: `conversation:${conversation.id}`,
        title: conversation.title,
        detail: `${conversation.provider} · ${conversation.external_id}`,
        href: '#/source',
        selection: { type: 'conversation', id: conversation.id },
      });
    }
  }
  for (const message of snapshot.messages) {
    const text = message.parts.map((part) => partText(part)).join(' ');
    if (has(text) || has(message.external_id)) {
      hits.push({
        key: `message:${message.revision_id}`,
        title: text.slice(0, 120) || message.external_id,
        detail: `${message.role} · ${message.sent_at ?? 'Zeit unbekannt'}`,
        href: '#/source',
        selection: { type: 'message', revisionId: message.revision_id },
      });
    }
  }
  for (const review of snapshot.reviews) {
    if (has(review.reason) || has(review.action) || has(review.id)) {
      hits.push({
        key: `review:${review.id}`,
        title: review.action,
        detail: review.reason,
        href: '#/review',
        selection: { type: 'review', id: review.id },
      });
    }
  }
  return hits;
}
