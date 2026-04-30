import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Member {
  userId: string;
  username: string;
  points: number;
  predWinner: { name: string; flag: string } | null;
  goldenBoot: { name: string } | null;
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function GroupLeaderboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  function copyInviteLink() {
    const link = `${window.location.origin}/prediction/full/groups/join/${groupId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isPastDeadline = Date.now() >= new Date('2026-06-11T19:00:00Z').getTime();

  useEffect(() => {
    if (!groupId) return;
    async function load() {
      const { data: group } = await supabase
        .from('prediction_groups')
        .select('name, invite_password')
        .eq('id', groupId)
        .single();
      if (group) {
        setGroupName(group.name);
        setInvitePassword(group.invite_password);
      }

      const { data: memberRows } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (!memberRows || memberRows.length === 0) { setLoading(false); return; }

      const userIds = memberRows.map((m: any) => m.user_id);

      const [{ data: profileRows }, { data: predRows }] = await Promise.all([
        supabase.from('profiles').select('id, username').in('id', userIds),
        supabase.from('full_predictions').select('user_id, data').in('user_id', userIds),
      ]);

      const profileMap: Record<string, string> = {};
      profileRows?.forEach((p: any) => { profileMap[p.id] = p.username; });

      const predMap: Record<string, any> = {};
      predRows?.forEach((p: any) => { predMap[p.user_id] = p.data; });

      const built: Member[] = userIds.map((uid: string) => {
        const pred = predMap[uid];
        return {
          userId: uid,
          username: profileMap[uid] ?? 'Unknown',
          points: 0,
          predWinner: pred?.predWinner
            ? { name: pred.predWinner.name, flag: pred.predWinner.flag ?? '' }
            : null,
          goldenBoot: pred?.goldenBoot
            ? { name: pred.goldenBoot.name }
            : null,
        };
      });

      built.sort((a, b) => b.points - a.points);
      setMembers(built);
      setLoading(false);
    }
    load();
  }, [groupId, user, isPastDeadline]);

  return (
    <div className="gl-page">
      <button className="back-btn gl-back" onClick={() => navigate('/prediction/full/groups')}>← Back</button>

      <div className="gl-header">
        <h1 className="gl-title">
          👥 {groupName || '…'}
          {!loading && <span className="gl-member-count">{members.length} {members.length === 1 ? 'member' : 'members'}</span>}
        </h1>
        <button className="gl-invite-link-btn" onClick={copyInviteLink}>
          {copied ? '✅ Link copied!' : '🔗 Invite friends to this group'}
        </button>
        <div className="gl-invite">
          <span className="gl-invite-label">Group password:</span>
          <span className="gl-invite-value">
            {showPassword ? invitePassword : '••••••'}
          </span>
          <button className="gl-invite-toggle" onClick={() => setShowPassword(v => !v)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="gl-empty">Loading…</p>
      ) : members.length === 0 ? (
        <p className="gl-empty">No members yet.</p>
      ) : (
        <div className="gl-table-wrap">
          <table className="gl-table">
            <thead>
              <tr>
                <th className="gl-th gl-th--rank">#</th>
                <th className="gl-th gl-th--name">Username</th>
                <th className="gl-th gl-th--pts">Pts</th>
                <th className="gl-th gl-th--winner">Predicted Winner</th>
                <th className="gl-th gl-th--gb">Top Scorer</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const rank = i + 1;
                const isMe = m.userId === user?.id;
                return (
                  <tr
                    key={m.userId}
                    className={`gl-tr${isMe ? ' gl-tr--me' : ''}`}
                    onClick={() => navigate(`/prediction/full/groups/${groupId}/member/${m.userId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="gl-td gl-td--rank">
                      {RANK_MEDAL[rank] ?? rank}
                    </td>
                    <td className="gl-td gl-td--name">
                      {m.username}
                      {isMe && <span className="gl-you-badge">you</span>}
                    </td>
                    <td className="gl-td gl-td--pts">{m.points}</td>
                    <td className="gl-td gl-td--winner">
                      {m.predWinner
                        ? <span>{m.predWinner.flag} {m.predWinner.name}</span>
                        : <span className="gl-empty-cell">—</span>}
                    </td>
                    <td className="gl-td gl-td--gb">
                      {m.goldenBoot
                        ? m.goldenBoot.name
                        : <span className="gl-empty-cell">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
