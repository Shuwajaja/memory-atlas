import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Selection =
  | { type: 'claim'; id: string }
  | { type: 'conversation'; id: string }
  | { type: 'message'; revisionId: string }
  | { type: 'review'; id: string }
  | { type: 'relation'; id: string }
  | { type: 'batch'; id: string }
  | { type: 'graph-node'; id: string; label: string; kind: string };

interface ShellValue {
  selection: Selection | null;
  setSelection: (next: Selection | null) => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  illustratedId: string;
  setIllustratedId: (id: string) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<Selection | null>(null);
  const [projectId, setProjectIdState] = useState<string | null>(null);
  const [searchOpen, setSearchOpenState] = useState(false);
  const [illustratedId, setIllustratedIdState] = useState('d-factory-new');
  const [inspectorOpen, setInspectorOpenState] = useState(false);
  const setSelection = useCallback((next: Selection | null) => setSelectionState(next), []);
  const setProjectId = useCallback((id: string | null) => setProjectIdState(id), []);
  const setSearchOpen = useCallback((open: boolean) => setSearchOpenState(open), []);
  const setIllustratedId = useCallback((id: string) => setIllustratedIdState(id), []);
  const setInspectorOpen = useCallback((open: boolean) => setInspectorOpenState(open), []);
  const value = useMemo(
    () => ({ selection, setSelection, projectId, setProjectId, searchOpen, setSearchOpen, illustratedId, setIllustratedId, inspectorOpen, setInspectorOpen }),
    [selection, setSelection, projectId, setProjectId, searchOpen, setSearchOpen, illustratedId, setIllustratedId, inspectorOpen, setInspectorOpen],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellValue {
  const value = useContext(ShellContext);
  if (!value) throw new Error('Shell fehlt');
  return value;
}
