import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errMsg } from '../api';
import { useAuth } from '../auth';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      if (isLogin) await login(String(f.get('email')), String(f.get('password')));
      else await register(String(f.get('name')), String(f.get('email')), String(f.get('password')));
      nav(from, { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form onSubmit={onSubmit} className="card" aria-labelledby="auth-title">
        <p className="brand dark">Prep<span className="mark">AI</span></p>
        <h1 id="auth-title">{isLogin ? 'Log in' : 'Create your account'}</h1>
        {error && <p className="error" role="alert">{error}</p>}
        {!isLogin && (
          <label>Name<input name="name" required maxLength={100} autoComplete="name" /></label>
        )}
        <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
        <label>
          Password
          <input name="password" type="password" required minLength={isLogin ? 1 : 10} maxLength={72}
            autoComplete={isLogin ? 'current-password' : 'new-password'} />
          {!isLogin && <small>Use 10 to 72 characters.</small>}
        </label>
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</button>
        <p className="muted">
          {isLogin ? 'New to PrepAI? ' : 'Already have an account? '}
          <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Log in'}</Link>
        </p>
      </form>
    </main>
  );
}
