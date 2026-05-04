import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onClose: () => void;
}

type Mode = 'signin' | 'signup' | 'verify';

export function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  async function handleSignUp() {
    setError('');
    if (!username.trim()) { setError('Please choose a username.'); return; }
    if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return; }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } },
    });
    if (err) { setError(err.message); setLoading(false); return; }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username.trim(),
        email,
      });
    }
    setLoading(false);
    setMode('verify');
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email first.'); return; }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    setError('Password reset email sent - check your inbox.');
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box auth-modal">
        {mode === 'verify' ? (
          <>
            <div className="modal-icon">📧</div>
            <h2 className="modal-title">Check your email</h2>
            <p className="modal-subtitle">
              We sent a confirmation link to <strong>{email}</strong>.<br />
              Click it to activate your account, then sign in.
            </p>
            <button className="modal-ok-btn" onClick={() => setMode('signin')}>Go to Sign In</button>
          </>
        ) : (
          <>
            <h2 className="modal-title">{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>

            {mode === 'signup' && (
              <input
                className="auth-input"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            )}
            <input
              className="auth-input"
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className="auth-input"
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())}
            />

            {error && <p className="auth-error">{error}</p>}

            <button
              className="modal-ok-btn auth-submit-btn"
              onClick={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading}
            >
              {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            {mode === 'signin' && (
              <button className="auth-link" onClick={handleForgotPassword}>
                Forgot password?
              </button>
            )}

            <p className="auth-switch">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button className="auth-link" onClick={() => { setError(''); setMode(mode === 'signin' ? 'signup' : 'signin'); }}>
                {mode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
