// Identità utente per il saluto, chiavettata su hash dell'email (niente email in
// chiaro nel sorgente — il repo è pubblico). Stesso algoritmo del vecchio index.html.
export interface Person {
  nome: string;
  salut: string;
  em: string;
  sub: string;
}

const eid = (s: string): string => {
  s = (s || '').toLowerCase();
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

const PEOPLE: Record<string, Person> = {
  '16k6zvv': { nome: 'Nicholas', salut: 'Bentornato', em: '🏃', sub: 'Pronto per oggi? 💪' },
  '8k7j0w': { nome: 'Noemi', salut: 'Bentornata', em: '🍓', sub: 'Buona giornata! ✨' },
};

export function personOf(email: string | null | undefined): Person | undefined {
  return PEOPLE[eid(email ?? '')];
}

/** Discipline "triathlon" principali (per dashboard e raggruppamenti). */
export const DISC_MAIN = ['bici', 'corsa', 'nuoto', 'forza'] as const;
