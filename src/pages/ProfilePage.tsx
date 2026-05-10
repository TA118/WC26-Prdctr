import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, username } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [resetMsg, setResetMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  async function handleChangePassword() {
    if (!newPassword) { setPwMsg({ text: 'Please enter a new password.', ok: false }); return; }
    if (newPassword.length < 6) { setPwMsg({ text: 'Password must be at least 6 characters.', ok: false }); return; }
    if (newPassword !== confirmPassword) { setPwMsg({ text: 'Passwords do not match.', ok: false }); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwMsg({ text: error.message, ok: false });
    } else {
      setPwMsg({ text: 'Password updated successfully!', ok: true });
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return;
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: 'https://wc26prdctr.vercel.app',
    });
    setResetLoading(false);
    if (error) {
      setResetMsg({ text: error.message, ok: false });
    } else {
      setResetMsg({ text: `Reset email sent to ${user.email}`, ok: true });
    }
  }

  return (
    <div className="profile-page">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

      <div className="profile-hero">
        <div className="profile-avatar">👤</div>
        <h1 className="profile-title">My Profile</h1>
      </div>

      <div className="profile-card">
        <div className="profile-field">
          <span className="profile-label">Username</span>
          <span className="profile-value">{username}</span>
        </div>
        <div className="profile-field">
          <span className="profile-label">Email</span>
          <span className="profile-value">{user.email}</span>
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-section-title">Change Password</h2>
        <input
          className="profile-input"
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={e => { setNewPassword(e.target.value); setPwMsg(null); }}
        />
        <input
          className="profile-input"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={e => { setConfirmPassword(e.target.value); setPwMsg(null); }}
        />
        {pwMsg && (
          <p className={`profile-msg${pwMsg.ok ? ' profile-msg--ok' : ' profile-msg--err'}`}>
            {pwMsg.text}
          </p>
        )}
        <button
          className="profile-btn profile-btn--primary"
          onClick={handleChangePassword}
          disabled={pwLoading}
        >
          {pwLoading ? 'Updating…' : 'Update Password'}
        </button>
      </div>

      <div className="profile-section profile-section--reset">
        <h2 className="profile-section-title">Forgot Password?</h2>
        <p className="profile-reset-desc">
          We'll send a reset link to <strong>{user.email}</strong>
        </p>
        {resetMsg && (
          <p className={`profile-msg${resetMsg.ok ? ' profile-msg--ok' : ' profile-msg--err'}`}>
            {resetMsg.text}
          </p>
        )}
        <button
          className="profile-btn profile-btn--secondary"
          onClick={handleResetPassword}
          disabled={resetLoading}
        >
          {resetLoading ? 'Sending…' : 'Send Reset Email'}
        </button>
      </div>
    </div>
  );
}
