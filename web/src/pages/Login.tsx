import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email.trim(), pwd);
    } catch {
      setErr('Email o password non corretti.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-card bg-card p-7 shadow-sm"
      >
        <div className="mb-1 text-center text-4xl">🍽️🏋️</div>
        <h1 className="mb-6 text-center text-xl font-extrabold text-ink">
          Dieta &amp; Allenamenti
        </h1>
        <input
          type="email"
          autoComplete="username"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-nic"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          className="mb-3 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-nic"
        />
        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-nic py-3 font-bold text-white disabled:opacity-60"
        >
          {busy ? '…' : 'Entra'}
        </button>
      </form>
    </div>
  );
}
