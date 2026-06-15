import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/hooks/useStore';
import { personOf } from '@/lib/constants';
import Login from '@/pages/Login';

const TABS = [
  { key: 'oggi', label: 'Oggi', icon: '🍽️' },
  { key: 'nicholas', label: 'Nicholas', icon: '🏃' },
  { key: 'noemi', label: 'Noemi', icon: '🍓' },
  { key: 'spesa', label: 'Spesa', icon: '🛒' },
  { key: 'allenamenti', label: 'Allenamenti', icon: '🏋️' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  const { user, ready, logout } = useAuth();
  const store = useStore();
  const [tab, setTab] = useState<TabKey>('oggi');

  if (!ready) {
    return <div className="flex min-h-full items-center justify-center text-muted">…</div>;
  }
  if (!user) return <Login />;

  const person = personOf(user.email);
  const name = person?.nome ?? user.email ?? '?';

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="text-lg font-extrabold text-ink">Dieta</div>
        <button
          onClick={() => void logout()}
          className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-ink shadow-sm"
          title={user.email ?? ''}
        >
          {name.slice(0, 1).toUpperCase()} · esci
        </button>
      </header>

      <main className="flex-1 px-4 pb-24">
        {/* Pannelli ancora segnaposto: la migrazione delle viste avviene per slice.
            Mostro già qualche dato reale dallo store per provare l'architettura. */}
        <div className="rounded-card bg-card p-5 shadow-sm">
          <h2 className="mb-2 text-base font-bold text-ink">
            {TABS.find((t) => t.key === tab)?.icon}{' '}
            {TABS.find((t) => t.key === tab)?.label}
          </h2>
          <p className="text-sm text-muted">
            Vista in migrazione al nuovo stack. Dati live collegati:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-ink">
            <li>Attività allenamento: {store.training.length}</li>
            <li>Giorni pianificati: {Object.keys(store.schedule).length}</li>
            <li>Obiettivo: {store.coachConfig.obiettivo ?? '—'}</li>
          </ul>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-xl justify-around border-t border-line bg-card/95 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-col items-center gap-0.5 px-2 text-xs ${
              tab === t.key ? 'font-bold text-nic' : 'text-muted'
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
