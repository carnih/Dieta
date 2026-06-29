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
  { key: 'oggi', label: 'Dieta', icon: '🍽️' },
  { key: 'nicholas', label: 'Nicholas', icon: '🏃' },
  { key: 'noemi', label: 'Noemi', icon: '🍓' },
  { key: 'spesa', label: 'Spesa', icon: '🛒' },
  { key: 'allenamenti', label: 'Allen.', icon: '🏋️' },
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

  const go = (k: TabKey) => {
    setTab(k);
    if (k !== 'allenamenti') setDashboard(false);
  };

  return (
    // Su desktop (lg) riservo lo spazio per il rail laterale a sinistra.
    // h-full + main scroller interno: lo scroll non e' sul documento (fix iOS).
    <div className="h-full lg:pl-[78px]">
      {/* Copre la safe-area in alto (notch/Dynamic Island): evita che il contenuto
          che scorre "trapeli" sopra i titoli sticky in modalità standalone/PWA. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-30 bg-bg"
        style={{ height: 'env(safe-area-inset-top, 0px)' }}
      />
      {/* Navigazione: bottom-bar su mobile, rail verticale a sinistra su desktop */}
      <nav
        className={
          'fixed z-40 border-line bg-card/95 backdrop-blur ' +
          'inset-x-0 bottom-0 flex justify-around border-t py-2 ' +
          'lg:inset-y-0 lg:left-0 lg:right-auto lg:w-[78px] lg:flex-col lg:justify-start ' +
          'lg:gap-1 lg:border-r lg:border-t-0 lg:px-2 lg:py-4'
        }
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => go(t.key)}
              className={
                'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold lg:w-full ' +
                (active ? 'text-nic lg:bg-nic-light' : 'text-muted')
              }
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Chip account fisso in alto a destra (entrambi i layout) */}
      <button
        onClick={() => {
          if (confirm('Uscire da Dieta?')) void logout();
        }}
        title={user.email ?? ''}
        className="fixed right-3 z-50 grid h-9 w-9 place-items-center rounded-full bg-nic text-sm font-bold text-white shadow-md"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
        aria-label={`Account: ${name}`}
      >
        {name.slice(0, 1).toUpperCase()}
      </button>

      <main
        className={
          'mx-auto h-full max-w-2xl overflow-y-auto overscroll-y-none px-4 ' +
          'pt-[calc(0.75rem_+_env(safe-area-inset-top))] pb-[calc(7rem_+_env(safe-area-inset-bottom))] ' +
          'lg:max-w-none lg:px-8 lg:pt-3 lg:pb-10'
        }
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {renderTab()}
      </main>
    </div>
  );
}
