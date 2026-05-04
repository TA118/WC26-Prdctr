import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { syncAndFetchResults, buildActualGroups } from '../lib/actualResults';
import type { MatchResult } from '../lib/actualResults';
import { totalGroupScore, groupMatchColor } from '../logic/predictionScoring';
import { INITIAL_GROUPS } from '../data/groups';
import type { Group } from '../types';

interface Member {
  userId: string;
  username: string;
  points: number;
  predWinner: { name: string; flag: string } | null;
  goldenBoot: { name: string } | null;
  predGroups: Group[];
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'live', 'Live', 'LIVE']);

function buildMatchInfoMap(): Record<string, { home: string; away: string }> {
  const map: Record<string, { home: string; away: string }> = {};
  for (const group of INITIAL_GROUPS) {
    for (const match of group.matches) {
      const homeTeam = group.teams.find(t => t.id === match.homeTeamId);
      const awayTeam = group.teams.find(t => t.id === match.awayTeamId);
      if (homeTeam && awayTeam) map[match.id] = { home: homeTeam.name, away: awayTeam.name };
    }
  }
  return map;
}

const MATCH_INFO = buildMatchInfoMap();

function getUserPredForMatch(predGroups: Group[], matchId: string) {
  for (const g of predGroups) {
    const m = g.matches.find(m => m.id === matchId);
    if (m && m.homeScore !== null && m.awayScore !== null) return { home: m.homeScore, away: m.awayScore };
  }
  return null;
}

export function GroupLeaderboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const rawRef = useRef<{
    userIds: string[];
    profileMap: Record<string, string>;
    predMap: Record<string, any>;
  } | null>(null);

  function copyInviteLink() {
    const link = `${window.location.origin}/prediction/full/groups/join/${groupId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isPastDeadline = Date.now() >= new Date('2026-06-11T19:00:00Z').getTime();

  const applyResults = useCallback((results: MatchResult[]) => {
    if (!rawRef.current) return;
    const { userIds, profileMap, predMap } = rawRef.current;
    const actualGroups = buildActualGroups(results);
    const hasResults = results.length > 0;
    const live = results.filter(r => LIVE_STATUSES.has(r.status));

    const built: Member[] = userIds.map((uid: string) => {
      const pred = predMap[uid];
      const predGroups: Group[] = pred?.groups ?? INITIAL_GROUPS;
      const points = hasResults ? totalGroupScore(predGroups, actualGroups) : 0;
      return {
        userId: uid,
        username: profileMap[uid] ?? 'Unknown',
        points,
        predWinner: pred?.predWinner ? { name: pred.predWinner.name, flag: pred.predWinner.flag ?? '' } : null,
        goldenBoot: pred?.goldenBoot ? { name: pred.goldenBoot.name } : null,
        predGroups,
      };
    });
    built.sort((a, b) => b.points - a.points);
    setMembers(built);
    setLiveMatches(live);
  }, []);

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

      const [{ data: profileRows }, { data: predRows }, { results: actualResults }] = await Promise.all([
        supabase.from('profiles').select('id, username').in('id', userIds),
        supabase.from('full_predictions').select('user_id, data').in('user_id', userIds),
        syncAndFetchResults(),
      ]);

      const profileMap: Record<string, string> = {};
      profileRows?.forEach((p: any) => { profileMap[p.id] = p.username; });

      const predMap: Record<string, any> = {};
      predRows?.forEach((p: any) => { predMap[p.user_id] = p.data; });

      rawRef.current = { userIds, profileMap, predMap };
      applyResults(actualResults);
      setLoading(false);
    }
    load();
  }, [groupId, user, isPastDeadline, applyResults]);

  useEffect(() => {
    if (!groupId) return;
    const interval = setInterval(async () => {
      const { results } = await syncAndFetchResults();
      applyResults(results);
    }, 30_000);
    return () => clearInterval(interval);
  }, [groupId, applyResults]);

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
                {liveMatches.map(lm => {
                  const info = MATCH_INFO[lm.match_id];
                  return info ? (
                    <th key={lm.match_id} className="gl-th gl-th--live">
                      <div className="gl-live-badge">🔴 LIVE</div>
                      <div className="gl-live-teams">{info.home} vs {info.away}</div>
                      <div className="gl-live-score">{lm.home_score} - {lm.away_score}</div>
                    </th>
                  ) : null;
                })}
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
                    <td className="gl-td gl-td--rank">{RANK_MEDAL[rank] ?? rank}</td>
                    <td className="gl-td gl-td--name">
                      {m.username}
                      {isMe && <span className="gl-you-badge">you</span>}
                    </td>
                    <td className="gl-td gl-td--pts">{m.points}</td>
                    {liveMatches.map(lm => {
                      const pred = getUserPredForMatch(m.predGroups, lm.match_id);
                      const color = pred
                        ? groupMatchColor(pred.home, pred.away, lm.home_score, lm.away_score)
                        : null;
                      return (
                        <td key={lm.match_id} className="gl-td gl-td--live">
                          {pred ? (
                            <span className={`gl-live-pred gl-live-pred--${color ?? 'none'}`}>
                              {pred.home}-{pred.away}
                            </span>
                          ) : (
                            <span className="gl-empty-cell">-</span>
                          )}
                        </td>
                      );
                    })}
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
