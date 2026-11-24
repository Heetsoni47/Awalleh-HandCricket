import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, authErrorText } from '../../context/AuthContext.jsx';
import Brand from '../Brand.jsx';
import { Button, Field, Input, Seg, Tile } from '../ui.jsx';
import FingerPips from '../arena/FingerPips.jsx';

function RulesBoard() {
  const rows = [
    { bat: 4, bowl: 2, text: 'Different numbers. Batter scores 4' },
    { bat: 6, bowl: 6, text: 'Same number. Out' },
  ];
  return (
    <div className="w-full max-w-[440px]">
      <div className="rounded-[20px] bg-card border border-line p-6">
        <div className="flex items-center justify-between text-[13px] text-fg3">
          <span>How a ball works</span>
          <span className="font-mono">1 to 6</span>
        </div>
        <div className="mt-6 space-y-6">
          {rows.map((r) => (
            <div key={r.text}>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <Plate label="Batter" n={r.bat} />
                <span className="text-[13px] text-fg3">vs</span>
                <Plate label="Bowler" n={r.bowl} out={r.bat === r.bowl} />
              </div>
              <p className={`mt-3 text-sm ${r.bat === r.bowl ? 'text-neg' : 'text-fg2'}`}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[13px] text-fg3 leading-5">
        Both players pick in secret, then the hands are shown together. Play 1v1 up to 5v5, limited overs or four-innings tests.
      </p>
    </div>
  );
}

function Plate({ label, n, out }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Tile tone={out ? 'neg' : 'fg'} className="w-full h-24 text-[56px] leading-none font-medium rounded-xl">
        {n}
      </Tile>
      <div className="flex items-center gap-2 text-xs text-fg3">
        <FingerPips n={n} />
        {label}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { user, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState('in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const from = loc.state?.from || '/';

  if (user) return <Navigate to={from} replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'in') await signIn(username, password);
      else await signUp(username.trim(), password);
      nav(from, { replace: true });
    } catch (err) {
      setError(authErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col px-6 md:px-12 py-8">
        <Brand />
        <div className="flex-1 flex items-center">
          <form onSubmit={submit} className="w-full max-w-[360px] mx-auto lg:mx-0 lg:ml-[8vw] py-12 animate-rise">
            <h1 className="text-[32px] leading-[1.15] font-medium tracking-[-0.01em]">
              {mode === 'in' ? 'Back to the crease' : 'Make your player'}
            </h1>
            <p className="mt-2 text-sm text-fg2">
              {mode === 'in' ? 'Sign in to join your friends' : 'Every run and wicket goes on your career record'}
            </p>
            <Seg
              className="mt-8"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setError('');
              }}
              options={[
                { value: 'in', label: 'Sign in' },
                { value: 'up', label: 'Sign up' },
              ]}
            />
            <div className="mt-6 space-y-4">
              <Field label="Username" hint={mode === 'up' ? '3 to 16 letters, numbers or _' : null}>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                />
              </Field>
            </div>
            {error && <p className="mt-4 text-[13px] text-neg">{error}</p>}
            <Button type="submit" variant="primary" size="lg" className="mt-6 w-full" disabled={busy}>
              {busy ? 'One moment' : mode === 'in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
      <div className="hidden lg:flex items-center justify-center bg-deep border-l border-line px-12">
        <RulesBoard />
      </div>
    </div>
  );
}
