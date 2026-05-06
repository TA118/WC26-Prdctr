import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { syncAndFetchResults } from '../lib/actualResults';
import { computeStandings } from '../logic/standings';
import { getBestThirdPlaced } from '../logic/thirdPlace';
import { INITIAL_GROUPS } from '../data/groups';
import { GROUP_SCHEDULE } from '../data/groupSchedule';
import { ALL_MATCHES, R32, R16, QF, SF, THIRD_PLACE, FINAL } from '../data/knockoutBracket';
import type { SlotRef, MatchDef } from '../data/knockoutBracket';
import { THIRD_PLACE_MATCHUPS } from '../data/knockoutMapping';
import type { Group, Team } from '../types';
import type { KnockoutResults } from '../components/KnockoutStage';
import type { ThirdPlacedTeam } from '../logic/thirdPlace';

// ─── Bracket resolution (same as FullStatsPage) ───────────────────────────────

function resolveTeam(
  slot: SlotRef,
  matchCtx: MatchDef,
  groups: Group[],
  koResults: KnockoutResults,
  topEight: ThirdPlacedTeam[],
): Team | null {
  switch (slot.kind) {
    case 'winner': {
      const g = groups.find(gr => gr.id === slot.group);
      return g ? computeStandings(g.teams, g.matches)[0]?.team ?? null : null;
    }
    case 'runner': {
      const g = groups.find(gr => gr.id === slot.group);
      return g ? computeStandings(g.teams, g.matches)[1]?.team ?? null : null;
    }
    case 'third': {
      const oppSlot = matchCtx.top === slot ? matchCtx.bottom : matchCtx.top;
      if (oppSlot.kind !== 'winner') return null;
      if (topEight.length < 8) return null;
      const key = topEight.map(t => t.groupId).sort().join('');
      const row = THIRD_PLACE_MATCHUPS[key];
      if (!row) return null;
      const entry = Object.entries(row).find(([, opp]) => opp === oppSlot.group);
      if (!entry) return null;
      const [thirdGroupId] = entry;
      if (!slot.groups.includes(thirdGroupId)) return null;
      return topEight.find(t => t.groupId === thirdGroupId)?.team ?? null;
    }
    case 'match-winner': {
      const m = ALL_MATCHES.find(mx => mx.id === slot.id);
      if (!m) return null;
      const r = koResults[slot.id];
      if (!r || r.home === null || r.away === null) return null;
      const top = resolveTeam(m.top, m, groups, koResults, topEight);
      const bot = resolveTeam(m.bottom, m, groups, koResults, topEight);
      if (r.home > r.away) return top;
      if (r.away > r.home) return bot;
      if (r.penaltyWinner) return r.penaltyWinner === top?.id ? top : bot;
      return null;
    }
    case 'match-loser': return null;
  }
}

function slotLabel(slot: SlotRef): string {
  switch (slot.kind) {
    case 'winner': return `Winner of Group ${slot.group}`;
    case 'runner': return `Runner-up of Group ${slot.group}`;
    case 'third': return `Best 3rd (${slot.groups.join('/')})`;
    case 'match-winner': return `Winner Match ${slot.id}`;
    case 'match-loser': return `Loser Match ${slot.id}`;
  }
}

// ─── Unified match list ───────────────────────────────────────────────────────

interface UnifiedMatch {
  id: string;
  kickoff: string;
  section: string;
  roundLabel: string;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeSlot: string;
  awaySlot: string;
}

const ROUND_INFO: { matches: MatchDef[]; label: string }[] = [
  { matches: R32,         label: 'Round of 32'  },
  { matches: R16,         label: 'Round of 16'  },
  { matches: QF,          label: 'Quarter-Final' },
  { matches: SF,          label: 'Semi-Final'    },
  { matches: THIRD_PLACE, label: 'Third Place'   },
  { matches: FINAL,       label: 'Final'         },
];

function buildMatchList(actualGroups: Group[], actualKO: KnockoutResults): UnifiedMatch[] {
  const list: UnifiedMatch[] = [];

  for (const g of INITIAL_GROUPS) {
    g.matches.forEach((m, idx) => {
      const sched = GROUP_SCHEDULE[m.id];
      list.push({
        id: m.id,
        kickoff: sched?.kickoff ?? '',
        section: 'Group Stage',
        roundLabel: `Group ${g.id} · Match ${idx + 1}`,
        homeTeam: g.teams.find(t => t.id === m.homeTeamId) ?? null,
        awayTeam: g.teams.find(t => t.id === m.awayTeamId) ?? null,
        homeSlot: '',
        awaySlot: '',
      });
    });
  }

  const thirds = getBestThirdPlaced(actualGroups);
  const topEight = thirds.slice(0, 8);

  for (const { matches, label } of ROUND_INFO) {
    matches.forEach((m, idx) => {
      const matchLabel = matches.length === 1 ? label : `${label} · Match ${idx + 1}`;
      const homeTeam = resolveTeam(m.top, m, actualGroups, actualKO, topEight);
      const awayTeam = resolveTeam(m.bottom, m, actualGroups, actualKO, topEight);
      list.push({
        section: label,
        id: String(m.id),
        kickoff: m.kickoff,
        roundLabel: matchLabel,
        homeTeam,
        awayTeam,
        homeSlot: slotLabel(m.top),
        awaySlot: slotLabel(m.bottom),
      });
    });
  }

  return list.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

// ─── Stats computation ────────────────────────────────────────────────────────

interface MatchStat {
  home: number; draw: number; away: number;
  scores: Map<string, number>;
  total: number;
}

interface LiveComputedStats {
  total: number;
  winnerCounts: { id: string; name: string; flag: string; count: number }[];
  scorerCounts: { name: string; flag?: string; country?: string; count: number }[];
  matchStats: Record<string, MatchStat>;
}

function computeLiveStats(preds: any[]): LiveComputedStats {
  const total = preds.length;

  const winnerMap = new Map<string, { id: string; name: string; flag: string; count: number }>();
  for (const p of preds) {
    if (!p.predWinner) continue;
    const id = p.predWinner.id ?? p.predWinner.name;
    if (!winnerMap.has(id)) winnerMap.set(id, { id, name: p.predWinner.name, flag: p.predWinner.flag ?? '', count: 0 });
    winnerMap.get(id)!.count++;
  }
  const winnerCounts = Array.from(winnerMap.values()).sort((a, b) => b.count - a.count);

  const scorerMap = new Map<string, { name: string; flag?: string; country?: string; count: number }>();
  for (const p of preds) {
    if (!p.goldenBoot) continue;
    const key = p.goldenBoot.name;
    if (!scorerMap.has(key)) scorerMap.set(key, { name: key, flag: p.goldenBoot.flag, country: p.goldenBoot.country, count: 0 });
    scorerMap.get(key)!.count++;
  }
  const scorerCounts = Array.from(scorerMap.values()).sort((a, b) => b.count - a.count);

  const matchStats: Record<string, MatchStat> = {};
  const initStat = (): MatchStat => ({ home: 0, draw: 0, away: 0, scores: new Map(), total: 0 });

  for (const g of INITIAL_GROUPS) {
    for (const m of g.matches) matchStats[m.id] = initStat();
  }
  for (const m of ALL_MATCHES) matchStats[String(m.id)] = initStat();

  for (const p of preds) {
    for (const pg of (p.groups ?? [])) {
      for (const m of pg.matches) {
        if (m.homeScore === null || m.awayScore === null) continue;
        const ms = matchStats[m.id];
        if (!ms) continue;
        ms.total++;
        const key = `${m.homeScore}-${m.awayScore}`;
        ms.scores.set(key, (ms.scores.get(key) ?? 0) + 1);
        if (m.homeScore > m.awayScore) ms.home++;
        else if (m.homeScore < m.awayScore) ms.away++;
        else ms.draw++;
      }
    }
    for (const [idStr, result] of Object.entries(p.knockoutResults ?? {})) {
      const r = result as { home: number | null; away: number | null };
      if (r.home === null || r.away === null) continue;
      const ms = matchStats[idStr];
      if (!ms) continue;
      ms.total++;
      const key = `${r.home}-${r.away}`;
      ms.scores.set(key, (ms.scores.get(key) ?? 0) + 1);
      if (r.home > r.away) ms.home++;
      else if (r.home < r.away) ms.away++;
      else ms.draw++;
    }
  }

  return { total, winnerCounts, scorerCounts, matchStats };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function pct(count: number, total: number) {
  if (total === 0) return '0.0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

function HBar({ count, total }: { count: number; total: number }) {
  const p = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="stats-hbar-wrap">
      <div className="stats-hbar-track">
        <div className="stats-hbar-fill" style={{ width: `${p}%` }} />
      </div>
      <span className="stats-hbar-pct">{p.toFixed(1)}%</span>
      <span className="stats-hbar-count">({count})</span>
    </div>
  );
}

function formatKickoff(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

// ─── Tab: Predicted Winner ─────────────────────────────────────────────────────

function WinnerTab({ counts, total }: { counts: LiveComputedStats['winnerCounts']; total: number }) {
  if (counts.length === 0) return <p className="stats-empty">No predictions yet.</p>;
  return (
    <div className="stats-bar-list">
      {counts.map(w => (
        <div key={w.id} className="stats-bar-row">
          <div className="stats-bar-label">
            <span className="stats-flag">{w.flag}</span>
            <span className="stats-name">{w.name}</span>
          </div>
          <HBar count={w.count} total={total} />
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Top Scorer ──────────────────────────────────────────────────────────

function ScorerTab({ counts, total }: { counts: LiveComputedStats['scorerCounts']; total: number }) {
  if (counts.length === 0) return <p className="stats-empty">No predictions yet.</p>;
  return (
    <div className="stats-bar-list">
      {counts.map(s => (
        <div key={s.name} className="stats-bar-row">
          <div className="stats-bar-label">
            {s.flag && <span className="stats-flag">{s.flag}</span>}
            <span className="stats-name">{s.name}</span>
            {s.country && <span className="stats-country">{s.country}</span>}
          </div>
          <HBar count={s.count} total={total} />
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Matches ─────────────────────────────────────────────────────────────

function MatchesTab({
  matches,
  matchStats,
  userScores,
  actualScores,
}: {
  matches: UnifiedMatch[];
  matchStats: Record<string, MatchStat>;
  userScores: Record<string, string>;
  actualScores: Record<string, string>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  let lastSection = '';

  return (
    <div className="lstats-matches">
      {matches.map(match => {
        const showHeader = match.section !== lastSection;
        lastSection = match.section;
        const ms = matchStats[match.id];
        const isLocked = match.kickoff ? Date.now() >= new Date(match.kickoff).getTime() : false;
        const hasPredictions = ms && ms.total > 0;
        const isExpanded = expandedId === match.id;

        const homeName = match.homeTeam
          ? `${match.homeTeam.flag} ${match.homeTeam.name}`
          : match.homeSlot;
        const awayName = match.awayTeam
          ? `${match.awayTeam.flag} ${match.awayTeam.name}`
          : match.awaySlot;

        const allScores = ms
          ? Array.from(ms.scores.entries()).sort((a, b) => b[1] - a[1])
          : [];

        return (
          <div key={match.id}>
            {showHeader && (
              <div className="lstats-section-header">
                <span className="lstats-section-title">{match.section}</span>
              </div>
            )}
          <div className="lstats-match-card">
            <div
              className={`lstats-match-header${isLocked && hasPredictions ? ' lstats-match-header--clickable' : ''}`}
              onClick={() => isLocked && hasPredictions && setExpandedId(isExpanded ? null : match.id)}
            >
              <div className="lstats-match-meta">
                <span className="lstats-match-round">{match.roundLabel}</span>
                {match.kickoff && (
                  <span className="lstats-match-kickoff">{formatKickoff(match.kickoff)}</span>
                )}
              </div>

              <div className="lstats-match-teams">
                <span className="lstats-match-team">{homeName}</span>
                <span className="lstats-match-vs">vs</span>
                <span className="lstats-match-team">{awayName}</span>
              </div>

              {isLocked && hasPredictions ? (
                <div className="lstats-match-pcts">
                  <div className="lstats-pct-block">
                    <span className="lstats-pct-label">{match.homeTeam?.name ?? 'Home'} Win</span>
                    <span className="lstats-pct-value">{pct(ms.home, ms.total)}</span>
                  </div>
                  <div className="lstats-pct-divider" />
                  <div className="lstats-pct-block">
                    <span className="lstats-pct-label">Draw</span>
                    <span className="lstats-pct-value">{pct(ms.draw, ms.total)}</span>
                  </div>
                  <div className="lstats-pct-divider" />
                  <div className="lstats-pct-block">
                    <span className="lstats-pct-label">{match.awayTeam?.name ?? 'Away'} Win</span>
                    <span className="lstats-pct-value">{pct(ms.away, ms.total)}</span>
                  </div>
                  <span className="lstats-match-expand-hint">{isExpanded ? '▲' : '▼'}</span>
                </div>
              ) : isLocked ? (
                <p className="lstats-match-no-preds">No predictions submitted for this match.</p>
              ) : (
                <p className="lstats-match-pending">🔒 Stats revealed at kickoff</p>
              )}
            </div>

            {isExpanded && allScores.length > 0 && (
              <div className="stats-score-breakdown">
                <table className="stats-score-table">
                  <thead>
                    <tr>
                      <th className="stats-score-th stats-score-th--score">Score</th>
                      <th className="stats-score-th stats-score-th--pct">%</th>
                      <th className="stats-score-th stats-score-th--count">Predictions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allScores.map(([score, count]) => {
                      const isActual = actualScores[match.id] === score;
                      const isUser = !isActual && userScores[match.id] === score;
                      const rowClass = isActual
                        ? 'stats-score-tr stats-score-tr--actual'
                        : isUser
                        ? 'stats-score-tr stats-score-tr--user'
                        : 'stats-score-tr';
                      return (
                        <tr key={score} className={rowClass}>
                          <td className="stats-score-td stats-score-td--score">{score}</td>
                          <td className="stats-score-td stats-score-td--pct">{pct(count, ms.total)}</td>
                          <td className="stats-score-td stats-score-td--count">{count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        );
      })}
    </div>
  );
}

const FIRST_KICKOFF = new Date('2026-06-11T19:00:00Z');

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'winner',  label: '🏆 Predicted Winner' },
  { id: 'scorer',  label: '👟 Top Scorer'        },
  { id: 'matches', label: '⚽ Match Predictions'  },
] as const;

type TabId = typeof TABS[number]['id'];

export function LiveStatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('winner');
  const [rawPreds, setRawPreds] = useState<any[]>([]);
  const [userScores, setUserScores] = useState<Record<string, string>>({});
  const [actualScores, setActualScores] = useState<Record<string, string>>({});
  const [actualGroups, setActualGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [actualKO] = useState<KnockoutResults>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('live_predictions')
      .select('user_id, data')
      .then(({ data }) => {
        const rows = (data ?? []).filter((r: any) => r.data);
        setRawPreds(rows.map((r: any) => r.data));

        if (user) {
          const mine = rows.find((r: any) => r.user_id === user.id);
          if (mine?.data) {
            const scores: Record<string, string> = {};
            for (const g of (mine.data.groups ?? [])) {
              for (const m of g.matches) {
                if (m.homeScore !== null && m.awayScore !== null) {
                  scores[m.id] = `${m.homeScore}-${m.awayScore}`;
                }
              }
            }
            for (const [idStr, r] of Object.entries(mine.data.knockoutResults ?? {})) {
              const res = r as { home: number | null; away: number | null };
              if (res.home !== null && res.away !== null) {
                scores[idStr] = `${res.home}-${res.away}`;
              }
            }
            setUserScores(scores);
          }
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    syncAndFetchResults().then(({ results, actualGroups: ag }) => {
      setActualGroups(ag);
      const scores: Record<string, string> = {};
      for (const r of results) {
        if (r.home_score !== null && r.away_score !== null) {
          scores[r.match_id] = `${r.home_score}-${r.away_score}`;
        }
      }
      setActualScores(scores);
    });
  }, []);

  const stats = useMemo(() => computeLiveStats(rawPreds), [rawPreds]);

  const matches = useMemo(
    () => buildMatchList(actualGroups, actualKO),
    [actualGroups, actualKO],
  );

  const isPastFirstKickoff = Date.now() >= FIRST_KICKOFF.getTime();

  const lockedBanner = (
    <div className="stats-locked">
      <div className="stats-locked-icon">🔒</div>
      <h2 className="stats-locked-title">Stats locked until predictions close</h2>
      <p className="stats-locked-desc">
        Data will be revealed on <strong>June 11, 2026 at 19:00 UTC</strong> when the first match kicks off.
      </p>
    </div>
  );

  return (
    <div className="stats-page">
      <button className="back-btn" onClick={() => navigate('/prediction/live')}>← Back</button>

      <div className="stats-hero">
        <h1>📊 Live Predictions Stats</h1>
        <p>See how everyone is predicting the World Cup 2026</p>
        {isPastFirstKickoff && stats.total > 0 && (
          <p className="stats-total">{stats.total} total predictions</p>
        )}
      </div>

      <div className="stats-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`stats-tab-btn${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="stats-empty">Loading…</p>
      ) : (
        <div className="stats-content">
          {activeTab === 'winner' && (
            isPastFirstKickoff
              ? <WinnerTab counts={stats.winnerCounts} total={stats.total} />
              : lockedBanner
          )}
          {activeTab === 'scorer' && (
            isPastFirstKickoff
              ? <ScorerTab counts={stats.scorerCounts} total={stats.total} />
              : lockedBanner
          )}
          {activeTab === 'matches' && (
            <MatchesTab
              matches={matches}
              matchStats={stats.matchStats}
              userScores={userScores}
              actualScores={actualScores}
            />
          )}
        </div>
      )}
    </div>
  );
}
