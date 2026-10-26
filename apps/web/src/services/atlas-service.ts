import demoAtlas from '../../../../memory-atlas-specc/examples/demo.atlas.json';
import { AtlasError } from '../domain/errors';
import { approveMemorySet, exportMemorySet, prepareMemorySet } from '../domain/export';
import { randomId } from '../domain/ids';
import type {
  AtlasSnapshot,
  Category,
  Claim,
  ClaimKind,
  Clock,
  Evidence,
  ExportFiles,
  MemoryApproval,
  MemoryPreview,
  MemorySetDraft,
  Modality,
  NormalizedImport,
  Relation,
  ReviewAction,
  ReviewEvent,
  SourceKind,
  ValidityBasis,
  ValidityKind,
} from '../domain/models.generated';
import { validateEvidence } from '../domain/provenance';
import { appendReview } from '../domain/projection';
import { sha256Text } from '../domain/sha256';
import { codePointLength } from '../domain/provenance';
import { instantMs } from '../domain/time';
import { commitImport } from '../importers/normalize';
import { parseJsonText } from '../importers/json-scan';
import { MemoryStore } from '../store/memory-store';
import { emptySnapshot, validateSnapshot } from '../store/snapshot';
import { createSession } from './session';

const systemClock: Clock = { now: () => new Date().toISOString() };

export interface ClaimDraft {
  messageRevisionId: string;
  nodeId: string;
  partIndex: number;
  start: number;
  end: number;
  text: string;
  kind: ClaimKind;
  sourceKind: SourceKind;
  modality: Modality;
  predicate: string;
  value: string;
  subjectId: string;
  category: Category;
  projectId: string;
  environment: string;
  validityKind: ValidityKind;
  validFrom: string | null;
  validTo: string | null;
  validityBasis: ValidityBasis;
  assertedAt: string | null;
}

export interface ServiceState {
  snapshot: AtlasSnapshot;
  demo: boolean;
  dirty: boolean;
  savedAt: string | null;
  staged: NormalizedImport | null;
  preview: MemoryPreview | null;
  approval: MemoryApproval | null;
  notice: string | null;
  error: string | null;
  importedApprovals: number;
}

type Listener = () => void;

export class AtlasService {
  private store: MemoryStore;
  private session = createSession();
  private staged: NormalizedImport | null = null;
  private preview: MemoryPreview | null = null;
  private approval: MemoryApproval | null = null;
  private savedDigest: string | null = null;
  private savedAt: string | null = null;
  private demo = false;
  private notice: string | null = null;
  private error: string | null = null;
  private listeners = new Set<Listener>();
  private cached: ServiceState | null = null;

  constructor(now = systemClock.now()) {
    this.store = new MemoryStore(emptySnapshot(now));
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): ServiceState => {
    if (!this.cached) this.cached = this.compute();
    return this.cached;
  };

  private compute(): ServiceState {
    return {
      snapshot: this.store.read(),
      demo: this.demo,
      dirty: this.store.currentSha256() !== this.savedDigest,
      savedAt: this.savedAt,
      staged: this.staged,
      preview: this.preview,
      approval: this.approval,
      notice: this.notice,
      error: this.error,
      importedApprovals: this.store.read().export_history.length,
    };
  }

  sessionId(): string {
    return this.session.id;
  }

  private emit(): void {
    this.cached = this.compute();
    for (const listener of this.listeners) listener();
  }

  private resetApproval(): void {
    this.preview = null;
    this.approval = null;
  }

  private commitSnapshot(next: AtlasSnapshot, notice?: string): void {
    this.store.replace(this.store.currentSha256(), next);
    this.resetApproval();
    this.notice = notice ?? null;
    this.error = null;
    this.emit();
  }

  private fail(error: unknown): void {
    this.error = error instanceof Error ? error.message : 'Unbekannter Fehler';
    this.emit();
  }

  stageImport(staged: NormalizedImport): void {
    if (staged.base_snapshot_sha256 !== this.store.currentSha256()) {
      this.fail(new AtlasError('SNAPSHOT_CONFLICT', 'Der Import passt nicht mehr zum aktuellen Stand.'));
      return;
    }
    this.staged = staged;
    this.notice = 'Import geprüft. Noch nicht übernommen.';
    this.error = null;
    this.emit();
  }

  discardImport(): void {
    this.staged = null;
    this.notice = 'Staging verworfen. Der Speicher ist unverändert.';
    this.emit();
  }

  commitImport(): void {
    if (!this.staged) return;
    const staged = this.staged;
    this.run(() => {
      commitImport(this.store, staged);
      this.staged = null;
      this.demo = false;
      this.resetApproval();
      this.notice = 'Import übernommen. Das Projekt ist noch nicht als Datei gespeichert.';
      this.error = null;
      this.emit();
    });
  }

  private run(work: () => void, onError?: () => void): void {
    try {
      work();
    } catch (error) {
      onError?.();
      this.fail(error);
    }
  }

  private save(notice: string | undefined, produce: (snapshot: AtlasSnapshot) => AtlasSnapshot): void {
    this.run(() => {
      const next = produce(structuredClone(this.store.read()));
      this.commitSnapshot(validateSnapshot(next), notice);
    });
  }

  private nextEvent(action: ReviewAction, targetType: ReviewEvent['target_type'], targetId: string, reason: string, extra: Partial<ReviewEvent> = {}): ReviewEvent {
    const snapshot = this.store.read();
    const last = snapshot.reviews[snapshot.reviews.length - 1];
    let recorded = systemClock.now();
    if (last && instantMs(recorded) < instantMs(last.recorded_at)) {
      recorded = last.recorded_at;
      this.notice = 'Die Geräteuhr läuft zurück. Die letzte Review-Zeit wurde beibehalten.';
    }
    return {
      id: randomId('review_'),
      target_type: targetType,
      target_id: targetId,
      action,
      actor_id: 'local-user',
      recorded_at: recorded,
      reason,
      evidence_ids: [],
      context_checked: null,
      branch_checked: null,
      sensitivity: null,
      review_due_at: null,
      seq: snapshot.reviews.length + 1,
      ...extra,
    };
  }

  createClaim(draft: ClaimDraft): void {
    this.save('Kandidat angelegt. Annahme und Quellenprüfung sind noch offen.', (snapshot) => {
      const message = snapshot.messages.find((item) => item.revision_id === draft.messageRevisionId);
      const part = message?.parts[draft.partIndex];
      if (!message || !part || part.kind !== 'text' || part.text === null) throw new AtlasError('NOT_TEXT_PART', 'Nur ein Textteil kann belegt werden.');
      const quote = Array.from(part.text).slice(draft.start, draft.end).join('');
      if (!quote) throw new AtlasError('SPAN_BOUNDS', 'Die Auswahl ist leer.');
      const evidence: Evidence = {
        id: randomId('ev_'),
        message_revision_id: message.revision_id,
        part_index: draft.partIndex,
        start_cp: draft.start,
        end_cp: draft.end,
        quote,
        quote_sha256: sha256Text(quote),
        relation: 'supports',
        lineage_root_id: 'pending',
        node_id: draft.nodeId,
      };
      evidence.lineage_root_id = evidence.id;
      const check = validateEvidence(snapshot, evidence);
      if (!check.valid) throw new AtlasError('BROKEN_SPAN', check.reasons.join(','));
      if (draft.validityKind === 'interval' && !draft.validFrom) throw new AtlasError('INVALID_VALIDITY', 'Ein Intervall braucht einen Anfang.');
      if (draft.validityKind === 'timeless' && draft.validityBasis !== 'reviewer_assigned') {
        throw new AtlasError('INVALID_VALIDITY', 'Zeitlos ist eine ausdrückliche Review-Entscheidung.');
      }
      const claim: Claim = {
        id: randomId('clm_'),
        text: draft.text.trim(),
        kind: draft.kind,
        source_kind: draft.sourceKind,
        extraction_method: 'manual',
        modality: draft.modality,
        scope: { workspace_id: snapshot.workspace.id, project_id: draft.projectId || null, environment: draft.environment },
        subject_id: draft.subjectId,
        predicate: draft.predicate,
        value: draft.value,
        cardinality: 'single',
        category: draft.category,
        evidence_ids: [evidence.id],
        asserted_at: draft.assertedAt,
        recorded_at: systemClock.now(),
        validity_kind: draft.validityKind,
        valid_from: draft.validityKind === 'interval' ? draft.validFrom : null,
        valid_to: draft.validityKind === 'interval' ? draft.validTo : null,
        validity_basis: draft.validityBasis,
      };
      if (!claim.text) throw new AtlasError('INVALID_CLAIM', 'Die Aussage fehlt.');
      snapshot.evidence.push(evidence);
      snapshot.claims.push(claim);
      return snapshot;
    });
  }

  reviewClaim(action: ReviewAction, claimId: string, reason: string, extra: Partial<ReviewEvent> = {}): void {
    this.run(() => {
      const event = this.nextEvent(action, action === 'revoke_export' ? 'memory_set' : 'claim', claimId, reason, extra);
      this.commitSnapshot(appendReview(this.store.read(), event));
    });
  }

  supersede(fromId: string, toId: string, effectiveAt: string, reason: string): void {
    this.run(() => {
      const relation = this.addRelation('supersedes', fromId, toId, reason, effectiveAt);
      const event = this.nextEvent('confirm_relation', 'relation', relation.id, reason);
      this.commitSnapshot(appendReview(relation.snapshot, event), 'Ersetzung bestätigt. Frühere Freigaben gelten nicht mehr.');
    });
  }

  relate(type: Relation['type'], fromId: string, toId: string, reason: string, effectiveAt: string | null, confirm: boolean): void {
    this.run(() => {
      const relation = this.addRelation(type, fromId, toId, reason, effectiveAt);
      const next = confirm ? appendReview(relation.snapshot, this.nextEvent('confirm_relation', 'relation', relation.id, reason)) : relation.snapshot;
      this.commitSnapshot(next, confirm ? 'Beziehung bestätigt.' : 'Beziehungsvorschlag gespeichert.');
    });
  }

  private addRelation(type: Relation['type'], fromId: string, toId: string, reason: string, effectiveAt: string | null): { snapshot: AtlasSnapshot; id: string } {
    const snapshot = structuredClone(this.store.read());
    const relation: Relation = {
      id: randomId('rel_'),
      type,
      from_claim_id: fromId,
      to_claim_id: toId,
      effective_at: effectiveAt,
      recorded_at: systemClock.now(),
      reason,
    };
    snapshot.relations.push(relation);
    return { snapshot: validateSnapshot(snapshot), id: relation.id };
  }

  saveMemorySet(draft: MemorySetDraft): void {
    this.save('Auswahl gespeichert. Eine frühere Freigabe ist ungültig.', (snapshot) => {
      const index = snapshot.memory_sets.findIndex((set) => set.id === draft.id);
      if (index >= 0) snapshot.memory_sets[index] = draft;
      else snapshot.memory_sets.push(draft);
      return snapshot;
    });
  }

  prepare(setId: string): void {
    this.run(() => {
      const set = this.store.read().memory_sets.find((item) => item.id === setId);
      if (!set) throw new AtlasError('SET_MISMATCH', 'Kein Memory-Set ausgewählt.');
      this.preview = prepareMemorySet(this.store.read(), set, systemClock);
      this.approval = null;
      this.error = null;
      this.notice = 'Vorschau erzeugt. Die Freigabe bindet genau diese Bytes.';
      this.emit();
    }, () => {
      this.preview = null;
      this.approval = null;
    });
  }

  approve(): void {
    if (!this.preview) return;
    this.run(() => {
      this.approval = approveMemorySet(this.preview!, 'local-user', systemClock, this.session);
      this.error = null;
      this.notice = 'Stand freigegeben. Der Download prüft den Zustand erneut.';
      this.emit();
    });
  }

  exportFiles(): ExportFiles | null {
    if (!this.preview || !this.approval) return null;
    let files: ExportFiles | null = null;
    this.run(() => {
      const preview = this.preview;
      const approval = this.approval;
      if (!preview || !approval) return;
      const produced = exportMemorySet(this.store.read(), preview, approval, systemClock, this.session);
      this.saveExportHistory(preview, approval);
      files = produced;
      this.notice = 'Export erzeugt. Die Historie autorisiert keinen weiteren Download.';
      this.approval = null;
      this.preview = null;
      this.error = null;
      this.emit();
    });
    return files;
  }

  private saveExportHistory(preview: MemoryPreview, approval: MemoryApproval): void {
    const snapshot = structuredClone(this.store.read());
    snapshot.export_history.push({
      id: randomId('hist_'),
      memory_set_id: preview.memory_set_id,
      payload_sha256: preview.payload_sha256,
      json_sha256: preview.json_sha256,
      markdown_sha256: preview.markdown_sha256,
      approved_at: approval.approved_at,
      expires_at: approval.expires_at,
      actor_id: approval.actor_id,
    });
    this.store.replace(this.store.currentSha256(), validateSnapshot(snapshot));
  }

  projectBytes(): { filename: string; bytes: Uint8Array } {
    const bytes = new TextEncoder().encode(`${JSON.stringify(this.store.read(), null, 2)}\n`);
    this.savedDigest = this.store.currentSha256();
    this.savedAt = systemClock.now();
    this.notice = 'Projektdatei heruntergeladen. Das ist kein automatisches Speichern.';
    this.emit();
    return { filename: `${this.store.read().snapshot_id}.atlas.json`, bytes };
  }

  previewProject(text: string): AtlasSnapshot {
    const parsed = parseJsonText(text.replace(/^\uFEFF/, '')).value;
    return validateSnapshot(parsed);
  }

  openProject(snapshot: AtlasSnapshot): void {
    this.store = new MemoryStore(snapshot);
    this.session = createSession();
    this.staged = null;
    this.resetApproval();
    this.savedDigest = this.store.currentSha256();
    this.savedAt = null;
    this.demo = snapshot.snapshot_id === 'snap_demo' || snapshot.workspace.title.includes('synthetisch');
    this.notice = `Projekt vom ${snapshot.created_at} geöffnet. Importierte Freigaben sind untrusted und erlauben keinen Download.`;
    this.error = null;
    this.emit();
  }

  loadDemo(): void {
    this.openProject(validateSnapshot(demoAtlas));
    this.demo = true;
    this.savedDigest = null;
    this.notice = 'Demo · synthetisch geladen. Nichts davon ist ein echter Chat.';
    this.emit();
  }

  clearSession(): void {
    this.store = new MemoryStore(emptySnapshot(systemClock.now()));
    this.session = createSession();
    this.staged = null;
    this.resetApproval();
    this.savedDigest = null;
    this.savedAt = null;
    this.demo = false;
    this.notice = 'Sitzung geleert. Heruntergeladene Dateien bleiben auf dem Gerät.';
    this.error = null;
    this.emit();
  }
}

export function quoteLength(text: string): number {
  return codePointLength(text);
}
