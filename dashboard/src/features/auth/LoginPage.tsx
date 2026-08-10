import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { login, type AuthSession } from './authSession';

interface LoginPageProps {
  onAuthenticated: (session: AuthSession) => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      onAuthenticated(await login(userName, password));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section aria-labelledby="auth-title" className="auth-card">
        <div aria-hidden="true" className="auth-mark">PI</div>
        <div>
          <div className="auth-eyebrow">Predictability Index</div>
          <h1 id="auth-title">Sign in</h1>
          <p>Use your dashboard credentials to continue.</p>
        </div>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>Username</span>
            <input
              autoComplete="username"
              autoFocus
              onChange={(event) => setUserName(event.target.value)}
              required
              type="text"
              value={userName}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <Button disabled={submitting} type="submit">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </section>
    </main>
  );
}
