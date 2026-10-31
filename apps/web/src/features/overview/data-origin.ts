import type { AtlasSnapshot } from '../../domain/models.generated';
import { isSyntheticSnapshot } from '../../store/snapshot';
import { usesIllustration } from './visual-cards';

export type DataOrigin = 'illustration' | 'synthetic' | 'own';

export function dataOrigin(snapshot: AtlasSnapshot, demo: boolean): DataOrigin {
  if (demo || isSyntheticSnapshot(snapshot)) return 'synthetic';
  if (usesIllustration(snapshot)) return 'illustration';
  return 'own';
}

export function originMark(origin: DataOrigin): string {
  switch (origin) {
    case 'illustration':
      return 'PRIVATE VORSCHAU · BEISPIELDATEN';
    case 'synthetic':
      return 'DEMO · SYNTHETISCH';
    case 'own':
      return 'GELADENER BESTAND';
    default: {
      const neverOrigin: never = origin;
      return neverOrigin;
    }
  }
}

export function legendLabel(origin: DataOrigin): string {
  switch (origin) {
    case 'illustration':
      return 'Beispieldaten';
    case 'synthetic':
      return 'Demo · synthetisch';
    case 'own':
      return 'Geladener Bestand';
    default: {
      const neverOrigin: never = origin;
      return neverOrigin;
    }
  }
}

export function inspectorDataLabel(origin: DataOrigin): string {
  switch (origin) {
    case 'illustration':
      return 'Beispieldaten';
    case 'synthetic':
      return 'Demo · synthetisch';
    case 'own':
      return 'Eigener Bestand';
    default: {
      const neverOrigin: never = origin;
      return neverOrigin;
    }
  }
}

export function originFooter(origin: DataOrigin): string {
  switch (origin) {
    case 'illustration':
      return 'Beispieldaten · nicht der geladene Bestand';
    case 'synthetic':
      return 'Demo · synthetisch · kein echter Chat';
    case 'own':
      return 'Eigener Bestand · lokaler JSON-Import';
    default: {
      const neverOrigin: never = origin;
      return neverOrigin;
    }
  }
}

export function currentMetricNote(origin: DataOrigin): string {
  switch (origin) {
    case 'illustration':
      return 'Beispielkarten, nicht der Bestand';
    case 'synthetic':
      return 'synthetische Demokarten';
    case 'own':
      return 'aus dem geladenen Bestand';
    default: {
      const neverOrigin: never = origin;
      return neverOrigin;
    }
  }
}

export function acceptedMetricNote(origin: DataOrigin, accepted: number): string {
  switch (origin) {
    case 'illustration':
      return 'Beispiel, nicht exportiert';
    case 'synthetic':
    case 'own':
      return `inkl. ${accepted} angenommen`;
    default: {
      const neverOrigin: never = origin;
      return neverOrigin;
    }
  }
}
