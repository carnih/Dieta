import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Activity, StoreState } from '@/lib/types';

const EMPTY: StoreState = {
  training: [],
  schedule: {},
  coachConfig: {},
  spesaMeta: null,
  nicBase: null,
  noemiBase: null,
  noemiSettimana: null,
  allenamentiCfg: null,
  catLabels: {},
  spesa: null,
  spesaCategories: null,
  spesaHistory: null,
  pantry: null,
  overrides: null,
};

// Tabella dichiarativa delle sottoscrizioni: [percorso Firebase, come mappare nello stato].
// Erede del pattern `SUBS` del vecchio index.html.
type Assign = (val: unknown, prev: StoreState) => Partial<StoreState>;
const SUBS: Array<[string, Assign]> = [
  [
    'training/activities',
    (v) => ({
      training: v
        ? Object.entries(v as Record<string, Activity>).map(([k, r]) => ({
            ...r,
            id: r.id || k,
          }))
        : [],
    }),
  ],
  ['schedule', (v) => ({ schedule: (v as StoreState['schedule']) || {} })],
  ['coachConfig', (v) => ({ coachConfig: (v as StoreState['coachConfig']) || {} })],
  ['spesaMeta', (v) => ({ spesaMeta: (v as StoreState['spesaMeta']) || null })],
  ['nicBase', (v) => ({ nicBase: v ?? null })],
  ['noemiBase', (v) => ({ noemiBase: v ?? null })],
  ['noemiSettimana', (v) => ({ noemiSettimana: v ?? null })],
  ['allenamentiCfg', (v) => ({ allenamentiCfg: v ?? null })],
  ['catLabels', (v) => ({ catLabels: (v as Record<string, string>) || {} })],
  ['spesa', (v) => ({ spesa: v ?? null })],
  ['spesaCategories', (v) => ({ spesaCategories: v ?? null })],
  ['spesaHistory', (v) => ({ spesaHistory: v ?? null })],
  ['pantry', (v) => ({ pantry: v ?? null })],
  ['overrides', (v) => ({ overrides: v ?? null })],
];

const Ctx = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<StoreState>(EMPTY);

  useEffect(() => {
    // Le regole RTDB richiedono auth: sottoscrivo solo da loggato.
    if (!user) {
      setState(EMPTY);
      return;
    }
    const unsubs = SUBS.map(([path, assign]) =>
      onValue(ref(db, path), (snap) => {
        setState((prev) => ({ ...prev, ...assign(snap.val(), prev) }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [user]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore deve stare dentro <StoreProvider>');
  return v;
}
