import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { repo } from '@/data';
import type { AuthUser } from '@/data';

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean; // true quando il primo evento auth è arrivato
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return repo.onAuthChange((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      login: (email, password) => repo.login(email, password),
      logout: () => repo.logout(),
    }),
    [user, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth deve stare dentro <AuthProvider>');
  return v;
}
