import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { personOf } from '@/lib/constants';
import Login from '@/pages/Login';
import Oggi from '@/pages/Oggi';
import Nicholas from '@/pages/Nicholas';
import Noemi from '@/pages/Noemi';
import Spesa from '@/pages/Spesa';
import Allenamenti from '@/pages/Allenamenti';
import Dashboard from '@/pages/Dashboard';

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
  const [tab, setTab] = useState<TabKey>('oggi');
  // La dashboard e' una "sotto-vista" del tab Allenamenti (stato locale).
  const [dashboard, setDashboard] = useState(false);

  if (!ready) {
    return <div className="flex min-h-full items-center justify-center text-muted">…</div>;
  }
  if (!user) return <Login />;

  const person = personOf(user.email);
  const name = person?.nome ?? user.email ?? '?';

  function renderTab() {
    switch (tab) {
      case 'oggi':
        return <Oggi onOpenScheda={() => setTab('allenamenti')} />;
      case 'nicholas':
        return <Nicholas />;
      case 'noemi':
        return <Noemi />;
      case 'spesa':
        return <Spesa />;
      case 'allenamenti':
        return dashboard ? (
          <Dashboard onClose={() => setDashboard(false)} />
        ) : (
          <Allenamenti onOpenDashboard={() => setDashboard(true)} />
        );
      default:
        return null;
    }
  }

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

      <main className="flex-1 px-4 pb-24">{renderTab()}</main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-xl justify-around border-t border-line bg-card/95 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key !== 'allenamenti') setDashboard(false);
            }}
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
