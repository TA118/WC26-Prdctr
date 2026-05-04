import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';

export function LiveJoinGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from('live_prediction_groups')
      .select('name')
      .eq('id', groupId)
      .single()
      .then(({ data }) => { if (data) setGroupName(data.name); });
  }, [groupId]);

  useEffect(() => {
    if (!user || !groupId) return;
    supabase
      .from('live_group_members')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setAlreadyMember(true); });
  }, [user, groupId]);

  async function handleJoin() {
    if (!user || !groupId) return;
    setError(''); setLoading(true);

    const { data: group } = await supabase
      .from('live_prediction_groups')
      .select('id, invite_password')
      .eq('id', groupId)
      .single();

    if (!group) { setError('Group not found.'); setLoading(false); return; }
    if (group.invite_password !== password.trim().toLowerCase()) {
      setError('Wrong password. Try again.');
      setLoading(false); return;
    }

    await supabase.from('live_group_members').insert({ group_id: groupId, user_id: user.id });
    navigate(`/prediction/live/groups/${groupId}`);
  }

  if (alreadyMember) {
    return (
      <div className="join-page">
        <div className="join-box">
          <div className="join-icon">👥</div>
          <h2 className="join-title">{groupName}</h2>
          <p className="join-sub">You're already a member of this group.</p>
          <button className="modal-ok-btn" onClick={() => navigate(`/prediction/live/groups/${groupId}`)}>
            Go to Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-box">
        <div className="join-icon">👥</div>
        <h2 className="join-title">You've been invited to join</h2>
        <p className="join-group-name">{groupName || '…'}</p>

        {!user ? (
          <>
            <p className="join-sub">Sign in first to join this group.</p>
            <button className="modal-ok-btn" onClick={() => setShowAuth(true)}>
              Sign In / Register
            </button>
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
          </>
        ) : (
          <>
            <input
              className="auth-input"
              placeholder="Enter group password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            {error && <p className="auth-error">{error}</p>}
            <button
              className="modal-ok-btn"
              onClick={handleJoin}
              disabled={loading || !password.trim()}
            >
              {loading ? '…' : 'Join Group'}
            </button>
            <button className="auth-link" onClick={() => navigate('/')}>
              Back to home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
