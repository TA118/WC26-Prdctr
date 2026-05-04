import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function LiveGlobalLeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const rawRef = useRef<{ predRows: any[] } | null>(null);

  const applyResults = useCallback((results: MatchResult[]) => {
    if (!rawRef.current) return;
    const { predRows } = rawRef.current;
    const actualGroups = buildActualGroups(results);
    const hasResults = results.length > 0;
    const live = results.filter(r => LIVE_STATUSES.has(r.status));

    const built: Member[] = predRows.map((p: any) => {
      const predGroups: Group[] = p.data?.groups ?? INITIAL_GROUPS;
      const points = hasResults ? totalGroupScore(predGroups, actualGroups) : 0;
      return {
        userId: p.user_id,
        username: p.username ?? 'Unknown',
        points,
        predWinner: p.data?.predWinner ? { name: p.data.predWinner.name, flag: p.data.predWinner.flag ?? '' } : null,
        goldenBoot: p.data?.goldenBoot ? { name: p.data.goldenBoot.name } : null,
        predGroups,
      };
    });
    built.sort((a, b) => b.points - a.points);
    setMembers(built);
    setLiveMatches(live);
  }, []);

  useEffect(() => {
    async function load() {
      const [{ results: actualResults }, { data: predRows }] = await Promise.all([
        syncAndFetchResults(),
        supabase.from('live_predictions').select('user_id, data'),
      ]);

      if (!predRows || predRows.length === 0) { setLoading(false); return; }

      const userIds = predRows.map((p: any) => p.user_id);
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profileMap: Record<string, string> = {};
      profileRows?.forEach((p: any) => { profileMap[p.id] = p.username; });

      const enriched = predRows.map((p: any) => ({ ...p, username: profileMap[p.user_id] }));
      rawRef.current = { predRows: enriched };
      applyResults(actualResults);
      setLoading(false);
    }
    load();
  }, [applyResults]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { results } = await syncAndFetchResults();
      applyResults(results);
    }, 30_000);
    return () => clearInterval(interval);
  }, [applyResults]);

  return (
    <div className="gl-page">
      <button className="back-btn gl-back" onClick={() => navigate('/prediction/live/groups')}>← Back</button>

      <div className="gl-header">
        <h1 className="gl-title">
          🌍 Global Leaderboard
          {!loading && (
            <span className="gl-member-count">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          )}
        </h1>
        <p className="gl-global-sub">Everyone who has made a live prediction</p>
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
                  <tr key={m.userId} className={`gl-tr${isMe ? ' gl-tr--me' : ''}`}>
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
