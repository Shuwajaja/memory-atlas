import { useState } from 'react';
import type { Category, ClaimKind, MessageRole, Modality, SourceKind, ValidityBasis, ValidityKind } from '../../domain/models.generated';
import type { TextSpan } from '../selection';
import { Dialog } from '../../components/Dialog';
import { useAtlas } from '../../service-context';
import { utcNoon } from '../format';

interface ClaimDialogProps {
  messageRevisionId: string;
  nodeId: string;
  partIndex: number;
  role: MessageRole;
  span: TextSpan;
  onClose: () => void;
}

function defaultSource(role: MessageRole): SourceKind {
  switch (role) {
    case 'user':
      return 'user_decision';
    case 'assistant':
      return 'assistant_recommendation';
    case 'tool':
      return 'tool_observation';
    case 'system':
    case 'unknown':
      return 'inference';
    default: {
      const neverRole: never = role;
      return neverRole;
    }
  }
}

const kinds: ClaimKind[] = ['decision', 'preference', 'fact', 'project_status', 'task', 'research_finding', 'open_question'];
const sources: SourceKind[] = ['user_decision', 'user_report', 'assistant_recommendation', 'assistant_execution_claim', 'tool_observation', 'external_reference', 'inference'];
const modalities: Modality[] = ['asserted', 'proposed', 'hypothetical', 'negated', 'quoted', 'uncertain'];
const categories: Category[] = ['architecture', 'projects', 'agents', 'models', 'tools', 'research', 'workflows', 'costs', 'decisions', 'preferences', 'other_ai', 'excluded_private'];
const validityKinds: ValidityKind[] = ['interval', 'timeless', 'unknown'];
const bases: ValidityBasis[] = ['explicit', 'reviewer_assigned', 'message_time_confirmed', 'unknown'];

export function ClaimDialog({ messageRevisionId, nodeId, partIndex, role, span, onClose }: ClaimDialogProps) {
  const { service } = useAtlas();
  const [text, setText] = useState(span.text);
  const [kind, setKind] = useState<ClaimKind>(role === 'user' ? 'decision' : 'research_finding');
  const [sourceKind, setSourceKind] = useState<SourceKind>(defaultSource(role));
  const [modality, setModality] = useState<Modality>(role === 'user' ? 'asserted' : 'proposed');
  const [subjectId, setSubjectId] = useState('orion');
  const [predicate, setPredicate] = useState('supervisor');
  const [value, setValue] = useState(span.text);
  const [projectId, setProjectId] = useState('orion');
  const [environment, setEnvironment] = useState('local');
  const [category, setCategory] = useState<Category>('decisions');
  const [validityKind, setValidityKind] = useState<ValidityKind>('interval');
  const [validFrom, setValidFrom] = useState('2020-01-01');
  const [validTo, setValidTo] = useState('');
  const [basis, setBasis] = useState<ValidityBasis>('explicit');
  const [assertedAt, setAssertedAt] = useState('');

  return (
    <Dialog title="Wissenskarte" onClose={onClose}>
      <p className="quote" data-testid="span">{span.start}:{span.end}:{span.text}</p>
      <p className="meta">Beleg {messageRevisionId} · Teil {partIndex} · Knoten {nodeId}</p>
      <label>Aussage<textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
      <label>Art<select value={kind} onChange={(event) => setKind(event.target.value as ClaimKind)}>{kinds.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Herkunft<select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as SourceKind)}>{sources.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Modalität<select value={modality} onChange={(event) => setModality(event.target.value as Modality)}>{modalities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Subjekt<input value={subjectId} onChange={(event) => setSubjectId(event.target.value)} /></label>
      <label>Prädikat<input value={predicate} onChange={(event) => setPredicate(event.target.value)} /></label>
      <label>Wert<input value={value} onChange={(event) => setValue(event.target.value)} /></label>
      <label>Projekt<input value={projectId} onChange={(event) => setProjectId(event.target.value)} /></label>
      <label>Umgebung<input value={environment} onChange={(event) => setEnvironment(event.target.value)} /></label>
      <label>Kategorie<select value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Gültigkeit<select value={validityKind} onChange={(event) => setValidityKind(event.target.value as ValidityKind)}>{validityKinds.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Gültig ab<input type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} /></label>
      <label>Gültig bis<input type="date" value={validTo} onChange={(event) => setValidTo(event.target.value)} /></label>
      <label>Grundlage<select value={basis} onChange={(event) => setBasis(event.target.value as ValidityBasis)}>{bases.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Behauptet am<input type="date" value={assertedAt} onChange={(event) => setAssertedAt(event.target.value)} /></label>
      <div className="row">
        <button
          type="button"
          className="button primary"
          onClick={() => {
            service.createClaim({
              messageRevisionId,
              nodeId,
              partIndex,
              start: span.start,
              end: span.end,
              text,
              kind,
              sourceKind,
              modality,
              predicate,
              value,
              subjectId,
              category,
              projectId,
              environment,
              validityKind,
              validFrom: validFrom ? utcNoon(validFrom) : null,
              validTo: validTo ? utcNoon(validTo) : null,
              validityBasis: basis,
              assertedAt: assertedAt ? utcNoon(assertedAt) : null,
            });
            onClose();
          }}
        >
          Kandidat anlegen
        </button>
        <button type="button" className="button" onClick={onClose}>Abbrechen</button>
      </div>
    </Dialog>
  );
}
