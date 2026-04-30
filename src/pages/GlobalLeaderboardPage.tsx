import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function GlobalLeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: predRows } = await supabase
        .from('full_predictions')
        .select('user_id, data');

      if (!predRows || predRows.length === 0) { setLoading(false); return; }

      const userIds = predRows.map((p: any) => p.user_id);

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profileMap: Record<string, string> = {};
      profileRows?.forEach((p: any) => { profileMap[p.id] = p.username; });

      const built: Member[] = predRows.map((p: any) => ({
        userId: p.user_id,
        username: profileMap[p.user_id] ?? 'Unknown',
        points: 0,
        predWinner: p.data?.predWinner
          ? { name: p.data.predWinner.name, flag: p.data.predWinner.flag ?? '' }
          : null,
        goldenBoot: p.data?.goldenBoot
          ? { name: p.data.goldenBoot.name }
          : null,
      }));

      built.sort((a, b) => b.points - a.points);
      setMembers(built);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="gl-page">
      <button className="back-btn gl-back" onClick={() => navigate('/prediction/full/groups')}>← Back</button>

      <div className="gl-header">
        <h1 className="gl-title">
          🌍 Global Leaderboard
          {!loading && (
            <span className="gl-member-count">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          )}
        </h1>
        <p className="gl-global-sub">Everyone who has made a prediction</p>
      </div>

      {loading ? (
        <p className="gl-empty">Loading…</p>
      ) : members.length === 0 ? (
        <p className="gl-empty">No predictions yet.</p>
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
                  <tr key={m.userId} className={`gl-tr${isMe ? ' gl-tr--me' : ''}`}>
                    <td className="gl-td gl-td--rank">{RANK_MEDAL[rank] ?? rank}</td>
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
