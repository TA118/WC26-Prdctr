import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { syncAndFetchResults } from '../lib/actualResults';
import { computeStandings } from '../logic/standings';
import { getBestThirdPlaced, applyThirdPlaceManualRankings } from '../logic/thirdPlace';
import { ALL_MATCHES } from '../data/knockoutBracket';
import type { SlotRef, MatchDef } from '../data/knockoutBracket';
import { THIRD_PLACE_MATCHUPS } from '../data/knockoutMapping';
import { INITIAL_GROUPS } from '../data/groups';
import { GROUP_SCHEDULE } from '../data/groupSchedule';
import type { Group, Team, ManualRankings } from '../types';
import type { KnockoutResults } from '../components/KnockoutStage';
import type { ThirdPlacedTeam } from '../logic/thirdPlace';

const DEADLINE = new Date('2026-06-11T19:00:00Z');
const GROUP_IDS = INITIAL_GROUPS.map(g => g.id);
const ALL_TEAMS = INITIAL_GROUPS.flatMap(g => g.teams);

// ─── Bracket resolution ────────────────────────────────────────────────────────

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

type Prog = { groupStage: boolean; r32: boolean; r16: boolean; qf: boolean; sf: boolean; final: boolean };

function computeKOProgression(
  groups: Group[],
  koResults: KnockoutResults,
): Record<string, Prog> {
  const prog: Record<string, Prog> = {};
  const get = (id: string): Prog => {
    if (!prog[id]) prog[id] = { groupStage: false, r32: false, r16: false, qf: false, sf: false, final: false };
    return prog[id];
  };

  const thirds = getBestThirdPlaced(groups);
  const topEight = thirds.slice(0, 8);

  for (const g of groups) {
    const s = computeStandings(g.teams, g.matches);
    if (s[0]) get(s[0].team.id).groupStage = true;
    if (s[1]) get(s[1].team.id).groupStage = true;
  }
  for (const t of topEight) get(t.team.id).groupStage = true;

  const rounds: { lo: number; hi: number; field: keyof Prog }[] = [
    { lo: 73, hi: 88, field: 'r32' },
    { lo: 89, hi: 96, field: 'r16' },
    { lo: 97, hi: 100, field: 'qf' },
    { lo: 101, hi: 102, field: 'sf' },
    { lo: 104, hi: 104, field: 'final' },
  ];

  for (const { lo, hi, field } of rounds) {
    for (const m of ALL_MATCHES.filter(mx => mx.id >= lo && mx.id <= hi)) {
      const r = koResults[m.id];
      if (!r || r.home === null || r.away === null) continue;
      const top = resolveTeam(m.top, m, groups, koResults, topEight);
      const bot = resolveTeam(m.bottom, m, groups, koResults, topEight);
      let winner: Team | null = null;
      if (r.home > r.away) winner = top;
      else if (r.away > r.home) winner = bot;
      else if (r.penaltyWinner) winner = r.penaltyWinner === top?.id ? top : bot;
      if (winner) get(winner.id)[field] = true;
    }
  }

  return prog;
}

// ─── Stats types & computation ────────────────────────────────────────────────

interface MatchStat {
  home: number; draw: number; away: number;
  scores: Map<string, number>;
  total: number;
}

interface GroupTeamStat {
  first: number; second: number; thirdAdv: number; thirdOut: number; fourth: number;
  totalPts: number; count: number;
}

interface TeamKOStat {
  groupStage: number; r32: number; r16: number; qf: number; sf: number; final: number;
}

interface ComputedStats {
  total: number;
  koTotal: number;
  groupTotal: number;
  winnerCounts: { id: string; name: string; flag: string; count: number }[];
  scorerCounts: { name: string; flag?: string; country?: string; count: number }[];
  groupStats: Record<string, { teams: Record<string, GroupTeamStat>; matches: Record<string, MatchStat> }>;
  teamKO: Record<string, TeamKOStat>;
}

function computeStats(preds: any[]): ComputedStats {
  const total = preds.length;
  let koTotal = 0;
  let groupTotal = 0;

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

  const groupStats: ComputedStats['groupStats'] = {};
  for (const g of INITIAL_GROUPS) {
    const teams: Record<string, GroupTeamStat> = {};
    for (const t of g.teams) teams[t.id] = { first: 0, second: 0, thirdAdv: 0, thirdOut: 0, fourth: 0, totalPts: 0, count: 0 };
    const matches: Record<string, MatchStat> = {};
    for (const m of g.matches) matches[m.id] = { home: 0, draw: 0, away: 0, scores: new Map(), total: 0 };
    groupStats[g.id] = { teams, matches };
  }

  const teamKO: Record<string, TeamKOStat> = {};
  for (const t of ALL_TEAMS) teamKO[t.id] = { groupStage: 0, r32: 0, r16: 0, qf: 0, sf: 0, final: 0 };

  for (const p of preds) {
    const groups: Group[] = p.groups ?? INITIAL_GROUPS;
    const koResults: KnockoutResults = p.knockoutResults ?? {};
    const thirdPlaceRankings: ManualRankings = p.thirdPlaceRankings ?? {};

    // Match predictions (always counted)
    for (const pg of groups) {
      const gs = groupStats[pg.id];
      if (!gs) continue;
      for (const m of pg.matches) {
        const ms = gs.matches[m.id];
        if (!ms || m.homeScore === null || m.awayScore === null) continue;
        ms.total++;
        const key = `${m.homeScore}-${m.awayScore}`;
        ms.scores.set(key, (ms.scores.get(key) ?? 0) + 1);
        if (m.homeScore > m.awayScore) ms.home++;
        else if (m.homeScore < m.awayScore) ms.away++;
        else ms.draw++;
      }
    }

    // Group standings — only if all 72 matches predicted
    const allPredicted = groups.every(g => g.matches.every(m => m.homeScore !== null && m.awayScore !== null));
    if (allPredicted) {
      groupTotal++;
      const thirds = getBestThirdPlaced(groups);
      const topEight = applyThirdPlaceManualRankings(thirds, thirdPlaceRankings).slice(0, 8);
      const qualifyingIds = new Set(topEight.map(t => t.team.id));

      for (const pg of groups) {
        const gs = groupStats[pg.id];
        if (!gs) continue;
        const standings = computeStandings(pg.teams, pg.matches);
        for (let i = 0; i < standings.length; i++) {
          const ts = gs.teams[standings[i].team.id];
          if (!ts) continue;
          ts.count++;
          ts.totalPts += standings[i].points;
          if (i === 0) ts.first++;
          else if (i === 1) ts.second++;
          else if (i === 2) qualifyingIds.has(standings[i].team.id) ? ts.thirdAdv++ : ts.thirdOut++;
          else ts.fourth++;
        }
      }

      for (const pg of groups) {
        const s = computeStandings(pg.teams, pg.matches);
        if (s[0] && teamKO[s[0].team.id]) teamKO[s[0].team.id].groupStage++;
        if (s[1] && teamKO[s[1].team.id]) teamKO[s[1].team.id].groupStage++;
      }
      for (const t of topEight) {
        if (teamKO[t.team.id]) teamKO[t.team.id].groupStage++;
      }
    }

    // KO progression — only for completed brackets
    if (p.predWinner) {
      koTotal++;
      const prog = computeKOProgression(groups, koResults);
      for (const [teamId, progress] of Object.entries(prog)) {
        if (!teamKO[teamId]) continue;
        if (progress.r32) teamKO[teamId].r32++;
        if (progress.r16) teamKO[teamId].r16++;
        if (progress.qf) teamKO[teamId].qf++;
        if (progress.sf) teamKO[teamId].sf++;
        if (progress.final) teamKO[teamId].final++;
      }
    }
  }

  return { total, koTotal, groupTotal, winnerCounts, scorerCounts, groupStats, teamKO };
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

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
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

// ─── Tab: Predicted Winner ─────────────────────────────────────────────────────

function WinnerTab({ counts, total }: { counts: ComputedStats['winnerCounts']; total: number }) {
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

// ─── Tab: Predicted Top Scorer ─────────────────────────────────────────────────

function ScorerTab({ counts, total }: { counts: ComputedStats['scorerCounts']; total: number }) {
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

// ─── Tab: Group Stage ──────────────────────────────────────────────────────────

function GroupStageTab({ groupStats, groupTotal, userScores, actualScores }: {
  groupStats: ComputedStats['groupStats'];
  groupTotal: number;
  userScores: Record<string, string>;
  actualScores: Record<string, string>;
}) {
  const [activeGroup, setActiveGroup] = useState('A');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const group = INITIAL_GROUPS.find(g => g.id === activeGroup)!;
  const gs = groupStats[activeGroup];

  const teamRows = useMemo(() => {
    if (!gs) return [];
    return group.teams
      .map(t => ({ team: t, ...gs.teams[t.id] }))
      .sort((a, b) => {
        const avgA = a.count > 0 ? a.totalPts / a.count : 0;
        const avgB = b.count > 0 ? b.totalPts / b.count : 0;
        return avgB - avgA;
      });
  }, [group, gs]);

  if (!gs) return null;

  return (
    <div className="stats-group-tab">
      <div className="stats-group-nav">
        {GROUP_IDS.map(gid => (
          <button
            key={gid}
            className={`stats-group-btn${activeGroup === gid ? ' active' : ''}`}
            onClick={() => { setActiveGroup(gid); setExpandedMatch(null); }}
          >
            {gid}
          </button>
        ))}
      </div>

      <div className="stats-group-content">
        <h3 className="stats-group-title">Group {activeGroup} - Predicted Standings</h3>
        <p className="stats-group-note">Based on {groupTotal} completed predictions</p>

        <div className="stats-standings-wrap">
          <table className="stats-standings-table">
            <thead>
              <tr>
                <th className="stats-th stats-th--team">Team</th>
                <th className="stats-th">1st</th>
                <th className="stats-th">2nd</th>
                <th className="stats-th stats-th--green">3rd (Adv.)</th>
                <th className="stats-th stats-th--red">3rd (Out)</th>
                <th className="stats-th">4th</th>
                <th className="stats-th stats-th--pts">Avg Pts</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map(row => {
                const n = row.count || 1;
                const avgPts = (row.totalPts / n).toFixed(1);
                return (
                  <tr key={row.team.id} className="stats-standings-row">
                    <td className="stats-td stats-td--team">
                      <span className="stats-flag">{row.team.flag}</span>
                      {row.team.name}
                    </td>
                    <td className="stats-td">{pct(row.first, groupTotal)}</td>
                    <td className="stats-td">{pct(row.second, groupTotal)}</td>
                    <td className="stats-td stats-td--green">{pct(row.thirdAdv, groupTotal)}</td>
                    <td className="stats-td stats-td--red">{pct(row.thirdOut, groupTotal)}</td>
                    <td className="stats-td">{pct(row.fourth, groupTotal)}</td>
                    <td className="stats-td stats-td--pts">{avgPts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 className="stats-group-title" style={{ marginTop: '1.5rem' }}>Match Predictions</h3>
        <div className="stats-matches">
          {group.matches.map(match => {
            const home = group.teams.find(t => t.id === match.homeTeamId)!;
            const away = group.teams.find(t => t.id === match.awayTeamId)!;
            const ms = gs.matches[match.id];
            const sched = GROUP_SCHEDULE[match.id];
            const isExpanded = expandedMatch === match.id;

            const allScores = ms
              ? Array.from(ms.scores.entries())
                  .sort((a, b) => b[1] - a[1])
              : [];

            return (
              <div key={match.id} className="stats-match-card">
                <div
                  className="stats-match-header"
                  onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                >
                  <div className="stats-match-teams">
                    <span>{home.flag} {home.name}</span>
                    <span className="stats-match-vs">vs</span>
                    <span>{away.flag} {away.name}</span>
                  </div>
                  {sched && <div className="stats-match-kickoff">{formatKickoff(sched.kickoff)}</div>}
                  {ms && ms.total > 0 && (
                    <div className="stats-match-bars">
                      <div className="stats-match-bar-row">
                        <span className="stats-match-bar-label">{home.name}</span>
                        <div className="stats-hbar-track stats-hbar-track--sm">
                          <div className="stats-hbar-fill stats-hbar-fill--home" style={{ width: `${(ms.home / ms.total) * 100}%` }} />
                        </div>
                        <span className="stats-match-bar-pct">{pct(ms.home, ms.total)}</span>
                      </div>
                      <div className="stats-match-bar-row">
                        <span className="stats-match-bar-label">Draw</span>
                        <div className="stats-hbar-track stats-hbar-track--sm">
                          <div className="stats-hbar-fill stats-hbar-fill--draw" style={{ width: `${(ms.draw / ms.total) * 100}%` }} />
                        </div>
                        <span className="stats-match-bar-pct">{pct(ms.draw, ms.total)}</span>
                      </div>
                      <div className="stats-match-bar-row">
                        <span className="stats-match-bar-label">{away.name}</span>
                        <div className="stats-hbar-track stats-hbar-track--sm">
                          <div className="stats-hbar-fill stats-hbar-fill--away" style={{ width: `${(ms.away / ms.total) * 100}%` }} />
                        </div>
                        <span className="stats-match-bar-pct">{pct(ms.away, ms.total)}</span>
                      </div>
                    </div>
                  )}
                  {ms && ms.total > 0 && (
                    <div className="stats-match-expand-hint">{isExpanded ? '▲ Hide scores' : '▼ Show score breakdown'}</div>
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Teams ────────────────────────────────────────────────────────────────

const KO_COLS: { field: keyof TeamKOStat; label: string }[] = [
  { field: 'groupStage', label: 'Group Stage' },
  { field: 'r32', label: 'Round of 32' },
  { field: 'r16', label: 'Round of 16' },
  { field: 'qf', label: 'Quarter-Finals' },
  { field: 'sf', label: 'Semi-Finals' },
  { field: 'final', label: 'Final' },
];

function TeamsTab({ teamKO, groupTotal, koTotal }: {
  teamKO: ComputedStats['teamKO'];
  groupTotal: number;
  koTotal: number;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const teamRanks = useMemo(() => {
    const ranks: Record<string, Record<string, number>> = {};
    for (const col of KO_COLS) {
      const sorted = ALL_TEAMS
        .map(t => ({ id: t.id, count: teamKO[t.id]?.[col.field] ?? 0 }))
        .sort((a, b) => b.count - a.count);
      let rank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].count < sorted[i - 1].count) rank = i + 1;
        if (!ranks[sorted[i].id]) ranks[sorted[i].id] = {};
        ranks[sorted[i].id][col.field] = rank;
      }
    }
    return ranks;
  }, [teamKO]);

  const selectedTeam = ALL_TEAMS.find(t => t.id === selectedTeamId);
  const selectedStats = selectedTeamId ? teamKO[selectedTeamId] : null;

  const denom = (field: keyof TeamKOStat) => field === 'groupStage' ? groupTotal : koTotal;

  return (
    <div className="stats-teams-tab">
      <select
        className="stats-team-select"
        value={selectedTeamId}
        onChange={e => setSelectedTeamId(e.target.value)}
      >
        <option value="">Select a team...</option>
        {INITIAL_GROUPS.map(g => (
          <optgroup key={g.id} label={`Group ${g.id}`}>
            {g.teams.map(t => (
              <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {selectedTeam && selectedStats && (
        <div className="stats-team-detail">
          <h3 className="stats-team-title">
            <span className="stats-flag">{selectedTeam.flag}</span>
            {selectedTeam.name}
          </h3>
          <div className="stats-team-table-wrap">
            <table className="stats-team-table">
              <thead>
                <tr>
                  <th className="stats-th stats-th--stage"></th>
                  {KO_COLS.map(c => (
                    <th key={c.field} className="stats-th">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="stats-td stats-td--rowlabel">% Predicted</td>
                  {KO_COLS.map(c => (
                    <td key={c.field} className="stats-td stats-td--pct">
                      {pct(selectedStats[c.field], denom(c.field))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="stats-td stats-td--rowlabel">Rank (of 48)</td>
                  {KO_COLS.map(c => (
                    <td key={c.field} className="stats-td stats-td--rank">
                      #{teamRanks[selectedTeamId]?.[c.field] ?? '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="stats-team-bars">
            {KO_COLS.map(c => (
              <div key={c.field} className="stats-bar-row">
                <div className="stats-bar-label">
                  <span className="stats-name">{c.label}</span>
                </div>
                <HBar count={selectedStats[c.field]} total={denom(c.field)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'winner', label: '🏆 Predicted Winner' },
  { id: 'scorer', label: '👟 Top Scorer' },
  { id: 'groups', label: '📊 Group Stage' },
  { id: 'teams',  label: '🌍 Teams' },
] as const;

type TabId = typeof TABS[number]['id'];

export function FullStatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('winner');
  const [allRows, setAllRows] = useState<{ user_id: string; data: any }[]>([]);
  const [userScores, setUserScores] = useState<Record<string, string>>({});
  const [actualScores, setActualScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<{ id: string; name: string; memberIds: Set<string> }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const isPastDeadline = Date.now() >= DEADLINE.getTime();

  useEffect(() => {
    supabase
      .from('full_predictions')
      .select('user_id, data')
      .then(({ data }) => {
        const rows = (data ?? []).filter((r: any) => r.data);
        setAllRows(rows.map((r: any) => ({ user_id: r.user_id, data: r.data })));
        if (user) {
          const mine = rows.find((r: any) => r.user_id === user.id);
          if (mine?.data?.groups) {
            const scores: Record<string, string> = {};
            for (const g of mine.data.groups) {
              for (const m of g.matches) {
                if (m.homeScore !== null && m.awayScore !== null) {
                  scores[m.id] = `${m.homeScore}-${m.awayScore}`;
                }
              }
            }
            setUserScores(scores);
          }
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('group_members')
      .select('group_id, prediction_groups(name)')
      .eq('user_id', user.id)
      .then(async ({ data: memberships }) => {
        if (!memberships?.length) return;
        const groupIds = memberships.map((m: any) => m.group_id);
        const { data: members } = await supabase
          .from('group_members')
          .select('group_id, user_id')
          .in('group_id', groupIds);
        setUserGroups(memberships.map((m: any) => ({
          id: m.group_id,
          name: (m.prediction_groups as any)?.name ?? m.group_id,
          memberIds: new Set(
            (members ?? []).filter((mem: any) => mem.group_id === m.group_id).map((mem: any) => mem.user_id)
          ),
        })));
      });
  }, [user]);

  const rawPreds = useMemo(() => {
    if (!selectedGroupId) return allRows.map(r => r.data);
    const group = userGroups.find(g => g.id === selectedGroupId);
    if (!group) return allRows.map(r => r.data);
    return allRows.filter(r => group.memberIds.has(r.user_id)).map(r => r.data);
  }, [allRows, selectedGroupId, userGroups]);

  useEffect(() => {
    syncAndFetchResults().then(({ results }) => {
      const scores: Record<string, string> = {};
      for (const r of results) {
        if (r.home_score !== null && r.away_score !== null) {
          scores[r.match_id] = `${r.home_score}-${r.away_score}`;
        }
      }
      setActualScores(scores);
    });
  }, []);

  const stats = useMemo(() => {
    if (!isPastDeadline || rawPreds.length === 0) return null;
    return computeStats(rawPreds);
  }, [rawPreds, isPastDeadline]);

  return (
    <div className="stats-page">
      <button className="back-btn" onClick={() => navigate('/prediction/full')}>← Back</button>

      <div className="stats-hero">
        <h1>📊 Predictions Stats</h1>
        <p>See how everyone predicted the World Cup 2026</p>
        {stats && (
          <p className="stats-total">{stats.total} total predictions</p>
        )}
      </div>

      {user && userGroups.length > 0 && (
        <div className="stats-filter">
          <select
            className="stats-group-select"
            value={selectedGroupId ?? ''}
            onChange={e => setSelectedGroupId(e.target.value || null)}
          >
            <option value="">🌍 All Users</option>
            {userGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

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
      ) : !isPastDeadline ? (
        <div className="stats-locked">
          <div className="stats-locked-icon">🔒</div>
          <h2 className="stats-locked-title">Stats locked until predictions close</h2>
          <p className="stats-locked-desc">
            Data will be revealed on <strong>June 11, 2026 at 19:00 UTC</strong> when the first match kicks off and predictions are locked.
          </p>
        </div>
      ) : !stats ? (
        <p className="stats-empty">No predictions data available.</p>
      ) : (
        <div className="stats-content">
          {activeTab === 'winner' && <WinnerTab counts={stats.winnerCounts} total={stats.total} />}
          {activeTab === 'scorer' && <ScorerTab counts={stats.scorerCounts} total={stats.total} />}
          {activeTab === 'groups' && (
            <GroupStageTab
              groupStats={stats.groupStats}
              groupTotal={stats.groupTotal}
              userScores={userScores}
              actualScores={actualScores}
            />
          )}
          {activeTab === 'teams' && (
            <TeamsTab teamKO={stats.teamKO} groupTotal={stats.groupTotal} koTotal={stats.koTotal} />
          )}
        </div>
      )}
    </div>
  );
}
