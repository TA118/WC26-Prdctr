import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]) + ' Place';
}

interface LiveGroup {
  id: string;
  name: string;
  userRank: number;
  userPoints: number;
  memberCount: number;
}

export function LiveMyGroupsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [myGroups, setMyGroups] = useState<LiveGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [globalPoints] = useState(0);

  const fetchGroups = useCallback(async () => {
    if (!user) { setLoadingGroups(false); return; }

    const { data } = await supabase
      .from('live_group_members')
      .select('group_id, live_prediction_groups(id, name)')
      .eq('user_id', user.id);

    if (!data) { setLoadingGroups(false); return; }

    const groups: LiveGroup[] = await Promise.all(
      data.map(async (row: any) => {
        const gid = row.live_prediction_groups.id;

        const { data: members } = await supabase
          .from('live_group_members')
          .select('user_id')
          .eq('group_id', gid);

        const memberIds = members?.map((m: any) => m.user_id) ?? [];
        const scores = memberIds.map((uid: string) => ({ uid, pts: 0 }));
        scores.sort((a: any, b: any) => b.pts - a.pts);

        const rank = scores.findIndex((s: any) => s.uid === user.id) + 1;
        const myPts = scores.find((s: any) => s.uid === user.id)?.pts ?? 0;

        return {
          id: gid,
          name: row.live_prediction_groups.name,
          userRank: rank || 1,
          userPoints: myPts,
          memberCount: memberIds.length,
        };
      })
    );

    setMyGroups(groups);

    const { data: allPreds } = await supabase.from('live_predictions').select('user_id');
    const myPos = allPreds?.findIndex((p: any) => p.user_id === user.id) ?? -1;
    setGlobalRank(myPos >= 0 ? myPos + 1 : (allPreds?.length ?? 0));

    setLoadingGroups(false);
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  return (
    <div className="home-page">
      <button className="back-btn" onClick={() => navigate('/prediction/live')}>← Back</button>

      {user && (
        <button className="create-join-btn" onClick={() => setShowModal(true)}>
          + Create / Join Group
        </button>
      )}

      <div className="home-hero">
        <h1 className="home-title">👥 My Live Groups</h1>
        <p className="home-subtitle">Your leagues and leaderboards</p>
      </div>

      <div className="groups-list">
        {!user ? (
          <div className="groups-empty">
            <p>Sign in to create or join groups.</p>
          </div>
        ) : loadingGroups ? (
          <div className="groups-empty"><p>Loading…</p></div>
        ) : myGroups.length === 0 ? (
          <div className="groups-empty">
            <p>You haven't joined any groups yet.</p>
            <p className="groups-empty-hint">Use the button above to create one or join with a password.</p>
          </div>
        ) : (
          myGroups.map(g => (
            <button key={g.id} className="group-card" onClick={() => navigate(`/prediction/live/groups/${g.id}`)}>
              <div className="group-card-info">
                <span className="group-card-name">{g.name}</span>
              </div>
              <div className="group-card-stats">
                <span className="group-card-rank">{ordinal(g.userRank)}</span>
                <span className="group-card-pts">{g.userPoints} pts</span>
              </div>
              <span className="group-card-arrow">›</span>
            </button>
          ))
        )}

        <button className="group-card group-card--global" onClick={() => navigate('/prediction/live/groups/global')}>
          <span className="group-card-icon">🌍</span>
          <div className="group-card-info">
            <span className="group-card-name">Global Leaderboard</span>
          </div>
          {user && globalRank !== null && (
            <div className="group-card-stats">
              <span className="group-card-rank">{ordinal(globalRank)}</span>
              <span className="group-card-pts">{globalPoints} pts</span>
            </div>
          )}
          <span className="group-card-arrow">›</span>
        </button>
      </div>

      {showModal && (
        <LiveCreateJoinModal
          userId={user!.id}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchGroups(); }}
        />
      )}
    </div>
  );
}

type ModalScreen = 'choose' | 'create' | 'join';

function LiveCreateJoinModal({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [screen, setScreen] = useState<ModalScreen>('choose');
  const [groupName, setGroupName] = useState('');
  const [groupPassword, setGroupPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const name = groupName.trim();
    const pass = groupPassword.trim().toLowerCase();
    if (!name || !pass) return;
    setError(''); setLoading(true);

    const { data: nameCheck } = await supabase.from('live_prediction_groups').select('id').eq('name', name).maybeSingle();
    const { data: passCheck } = await supabase.from('live_prediction_groups').select('id').eq('invite_password', pass).maybeSingle();

    if (nameCheck && passCheck) { setError('Group name and password are already taken. Choose another.'); setLoading(false); return; }
    if (nameCheck) { setError('Group name is already taken. Choose another.'); setLoading(false); return; }
    if (passCheck) { setError('Password is already taken. Choose another.'); setLoading(false); return; }

    const { data: newGroup, error: createErr } = await supabase
      .from('live_prediction_groups')
      .insert({ name, invite_password: pass, created_by: userId })
      .select('id')
      .single();

    if (createErr || !newGroup) { setError('Failed to create group. Try again.'); setLoading(false); return; }

    await supabase.from('live_group_members').insert({ group_id: newGroup.id, user_id: userId });
    setLoading(false);
    onSuccess();
  }

  async function handleJoin() {
    const pass = joinPassword.trim().toLowerCase();
    if (!pass) return;
    setError(''); setLoading(true);

    const { data: group } = await supabase
      .from('live_prediction_groups')
      .select('id')
      .eq('invite_password', pass)
      .maybeSingle();

    if (!group) { setError('No group found with that password.'); setLoading(false); return; }

    const { data: already } = await supabase
      .from('live_group_members')
      .select('group_id')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (already) { setError("You're already in this group."); setLoading(false); return; }

    await supabase.from('live_group_members').insert({ group_id: group.id, user_id: userId });
    setLoading(false);
    onSuccess();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box auth-modal">
        {screen === 'choose' && (
          <>
            <h2 className="modal-title">Live Groups</h2>
            <div className="cj-choice-btns">
              <button className="cj-choice-btn" onClick={() => setScreen('create')}>
                <span className="cj-choice-icon">🏆</span>
                <span className="cj-choice-label">Create Group</span>
                <span className="cj-choice-sub">Start a new private league</span>
              </button>
              <button className="cj-choice-btn" onClick={() => setScreen('join')}>
                <span className="cj-choice-icon">🔑</span>
                <span className="cj-choice-label">Join Group</span>
                <span className="cj-choice-sub">Enter a group password</span>
              </button>
            </div>
          </>
        )}

        {screen === 'create' && (
          <>
            <button className="cj-back" onClick={() => { setScreen('choose'); setError(''); }}>← Back</button>
            <h2 className="modal-title">Create Group</h2>
            <p className="cj-desc">Pick a name and a password. Share the password with friends so they can join.</p>
            <input
              className="auth-input"
              placeholder="Group name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <input
              className="auth-input"
              placeholder="Group password"
              value={groupPassword}
              onChange={e => setGroupPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            {error && <p className="auth-error">{error}</p>}
            <button
              className="modal-ok-btn auth-submit-btn"
              onClick={handleCreate}
              disabled={loading || !groupName.trim() || !groupPassword.trim()}
            >
              {loading ? '…' : 'Done'}
            </button>
          </>
        )}

        {screen === 'join' && (
          <>
            <button className="cj-back" onClick={() => { setScreen('choose'); setError(''); }}>← Back</button>
            <h2 className="modal-title">Join Group</h2>
            <p className="cj-desc">Enter the group password you received from the group creator.</p>
            <input
              className="auth-input"
              placeholder="Group password"
              value={joinPassword}
              onChange={e => setJoinPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            {error && <p className="auth-error">{error}</p>}
            <button
              className="modal-ok-btn auth-submit-btn"
              onClick={handleJoin}
              disabled={loading || !joinPassword.trim()}
            >
              {loading ? '…' : 'Join Group'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
