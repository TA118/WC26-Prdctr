import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Group, Team } from '../types';
import { gcalUrl } from '../utils/gcal';
import { getQualifiedTeams } from '../logic/knockoutMapping';
import type { GroupQualifier } from '../logic/knockoutMapping';
import type { ThirdPlacedTeam } from '../logic/thirdPlace';
import { ALL_MATCHES, R32, R16, QF, SF, THIRD_PLACE, FINAL } from '../data/knockoutBracket';
import type { SlotRef, MatchDef } from '../data/knockoutBracket';
import { THIRD_PLACE_MATCHUPS } from '../data/knockoutMapping';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BracketTeam {
  team: Team | null;
  label: string;
}

interface BracketMatch {
  id: number;
  top: BracketTeam;
  bottom: BracketTeam;
  kickoff: string;
  venue: string;
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return `${date} · ${time}`;
}

export interface KnockoutResult {
  home: number | null;
  away: number | null;
  penaltyWinner: string | null;
}

export type KnockoutResults = Record<number, KnockoutResult>;

// ─── Downstream clearing ──────────────────────────────────────────────────────

function getDownstreamIds(matchId: number): number[] {
  const ids: number[] = [];
  const queue = [matchId];
  const seen = new Set([matchId]);
  while (queue.length) {
    const id = queue.shift()!;
    for (const m of ALL_MATCHES) {
      if (seen.has(m.id)) continue;
      const refs = [m.top, m.bottom];
      if (refs.some(r => (r.kind === 'match-winner' || r.kind === 'match-loser') && r.id === id)) {
        ids.push(m.id);
        seen.add(m.id);
        queue.push(m.id);
      }
    }
  }
  return ids;
}

// ─── Bracket resolution ───────────────────────────────────────────────────────

function getWinner(match: BracketMatch, results: KnockoutResults): Team | null {
  const r = results[match.id];
  if (!r || r.home === null || r.away === null) return null;
  if (r.home > r.away) return match.top.team;
  if (r.away > r.home) return match.bottom.team;
  if (!r.penaltyWinner) return null;
  return r.penaltyWinner === match.top.team?.id ? match.top.team : match.bottom.team;
}

function resolveSlot(
  ref: SlotRef,
  qfs: GroupQualifier[],
  thirds: ThirdPlacedTeam[],
  results: KnockoutResults,
  opponentGroupId?: string,
): BracketTeam {
  switch (ref.kind) {
    case 'winner': {
      const t = qfs.find(q => q.groupId === ref.group && q.position === 1)?.team ?? null;
      return { team: t, label: `W-${ref.group}` };
    }
    case 'runner': {
      const t = qfs.find(q => q.groupId === ref.group && q.position === 2)?.team ?? null;
      return { team: t, label: `R-${ref.group}` };
    }
    case 'third': {
      if (opponentGroupId && thirds.length === 8) {
        const key = thirds.map(t => t.groupId).sort().join('');
        const row = THIRD_PLACE_MATCHUPS[key];
        const match = row && thirds.find(t => row[t.groupId] === opponentGroupId);
        if (match) return { team: match.team, label: `3rd ${match.groupId}` };
      }
      return { team: null, label: `3rd ${ref.groups.join('/')}` };
    }
    case 'match-winner': {
      const def = ALL_MATCHES.find(m => m.id === ref.id);
      if (!def) return { team: null, label: `W${ref.id}` };
      const bm = resolveBracketMatch(def, qfs, thirds, results);
      const w = getWinner(bm, results);
      return w ? { team: w, label: w.name } : { team: null, label: `W${ref.id}` };
    }
    case 'match-loser': {
      const def = ALL_MATCHES.find(m => m.id === ref.id);
      if (!def) return { team: null, label: `L${ref.id}` };
      const bm = resolveBracketMatch(def, qfs, thirds, results);
      const w = getWinner(bm, results);
      if (!w) return { team: null, label: `L${ref.id}` };
      const loser = w.id === bm.top.team?.id ? bm.bottom.team : bm.top.team;
      return loser ? { team: loser, label: loser.name } : { team: null, label: `L${ref.id}` };
    }
  }
}

function resolveBracketMatch(
  def: MatchDef,
  qfs: GroupQualifier[],
  thirds: ThirdPlacedTeam[],
  results: KnockoutResults,
): BracketMatch {
  // For R32 third-place slots: find the opponent group winner so the 495-map can resolve the team
  const opponentGroup = (slot: SlotRef, other: SlotRef): string | undefined => {
    if (slot.kind === 'third' && other.kind === 'winner') return other.group;
    return undefined;
  };
  return {
    id: def.id,
    kickoff: def.kickoff,
    venue: def.venue,
    top:    resolveSlot(def.top,    qfs, thirds, results, opponentGroup(def.top,    def.bottom)),
    bottom: resolveSlot(def.bottom, qfs, thirds, results, opponentGroup(def.bottom, def.top)),
  };
}

// ─── Match card coloring ─────────────────────────────────────────────────────

type MatchColor = 'green' | 'yellow' | 'orange' | 'purple' | 'red' | null;

function koMatchColor(
  result: KnockoutResult | undefined,
  actualResult: KnockoutResult | undefined,
  topTeamId: string | null,
  actualTopTeamId: string | null,
  bottomTeamId: string | null,
  actualBottomTeamId: string | null,
  allActualRoundTeams: Set<string>,
): MatchColor {
  if (!result || result.home === null || result.away === null) return null;
  if (!actualResult || actualResult.home === null || actualResult.away === null) return null;

  const predWinnerId = result.home > result.away ? topTeamId
    : result.away > result.home ? bottomTeamId
    : result.penaltyWinner ?? null;
  const actualWinnerId = actualResult.home > actualResult.away ? actualTopTeamId
    : actualResult.away > actualResult.home ? actualBottomTeamId
    : actualResult.penaltyWinner ?? null;

  if (predWinnerId === null || actualWinnerId === null) return null;

  const exactMatchup =
    (topTeamId === actualTopTeamId && bottomTeamId === actualBottomTeamId) ||
    (topTeamId === actualBottomTeamId && bottomTeamId === actualTopTeamId);

  if (predWinnerId !== actualWinnerId) {
    // Predicted winner appeared in this actual match but lost → always wrong
    const predWinnerInActual = actualTopTeamId === predWinnerId || actualBottomTeamId === predWinnerId;
    // Predicted winner actually advanced from a different slot → purple
    if (!predWinnerInActual && allActualRoundTeams.has(predWinnerId)) return 'purple';
    return 'red';
  }

  // Correct winner
  const exactScore = result.home === actualResult.home && result.away === actualResult.away;
  const penSituationCorrect = (result.home === result.away) === (actualResult.home === actualResult.away);
  if (exactScore && penSituationCorrect && exactMatchup) return 'green';
  return exactMatchup ? 'yellow' : 'orange';
}

const KO_COLOR_LABEL: Record<string, string> = {
  green:  '✓ Perfect',
  yellow: '✓ Correct winner',
  orange: '✓ Correct winner',
  purple: '↗ Team advanced',
  red:    '✗ Wrong',
};

// ─── KO scoring helpers ───────────────────────────────────────────────────────

const KO_PTS: Record<string, [number, number, number, number]> = {
  r32:   [3, 0, 2, 1],
  r16:   [4, 0, 3, 2],
  qf:    [5, 0, 4, 3],
  sf:    [7, 0, 5, 4],
  third: [7, 0, 5, 4],
  final: [12, 0, 10, 0],
};
const KO_EXACT_BONUS: Record<string, number> = { r32: 1, r16: 2, qf: 3, sf: 3, third: 3, final: 8 };
type KORound = 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';

function koWinnerId(r: KnockoutResult, hId: string | null, aId: string | null): string | null {
  if (r.home === null || r.away === null) return null;
  if (r.home > r.away) return hId;
  if (r.away > r.home) return aId;
  return r.penaltyWinner;
}

function scoreOneKOMatch(
  round: KORound,
  pHId: string | null, pAId: string | null, pr: KnockoutResult | undefined,
  aHId: string | null, aAId: string | null, ar: KnockoutResult | undefined,
  allActualRoundTeams: Set<string>,
): number {
  if (!pr || pr.home === null || pr.away === null) return 0;
  if (!ar || ar.home === null || ar.away === null) return 0;
  if (!pHId || !pAId || !aHId || !aAId) return 0;
  const predWinner = koWinnerId(pr, pHId, pAId);
  const actualWinner = koWinnerId(ar, aHId, aAId);
  const pts = KO_PTS[round];
  const bonus = KO_EXACT_BONUS[round] ?? 0;
  const exactMatchup = (pHId === aHId || pHId === aAId) && (pAId === aHId || pAId === aAId);
  if (exactMatchup) {
    if (predWinner !== null && predWinner === actualWinner) {
      const exactScore = pr.home === ar.home && pr.away === ar.away &&
        (pr.penaltyWinner ?? null) === (ar.penaltyWinner ?? null);
      return pts[0] + (exactScore ? bonus : 0);
    }
    return pts[1];
  }
  if (predWinner !== null && predWinner === actualWinner) return pts[2];
  // Predicted winner advanced from a different slot in this round
  const predWinnerInActual = aHId === predWinner || aAId === predWinner;
  if (!predWinnerInActual && predWinner !== null && allActualRoundTeams.has(predWinner)) return pts[3];
  return 0;
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
  match,
  result,
  locked,
  actualMatch,
  actualResult,
  round,
  allActualRoundTeams,
  onScore,
  onPenalty,
}: {
  match: BracketMatch;
  result: KnockoutResult | undefined;
  locked: boolean;
  actualMatch?: BracketMatch;
  actualResult?: KnockoutResult;
  round: KORound;
  allActualRoundTeams: Set<string>;
  onScore: (id: number, home: number | null, away: number | null) => void;
  onPenalty: (id: number, teamId: string) => void;
}) {
  const canPlay = !locked && match.top.team !== null && match.bottom.team !== null;
  const home = result?.home ?? null;
  const away = result?.away ?? null;
  const penWinner = result?.penaltyWinner ?? null;
  const isDraw = home !== null && away !== null && home === away;
  const hasActualResult = actualResult !== undefined
    && actualResult.home !== null && actualResult.away !== null;

  const color = koMatchColor(
    result, actualResult,
    match.top.team?.id ?? null, actualMatch?.top.team?.id ?? null,
    match.bottom.team?.id ?? null, actualMatch?.bottom.team?.id ?? null,
    allActualRoundTeams,
  );

  let winnerId: string | null = null;
  if (home !== null && away !== null) {
    if (home > away) winnerId = match.top.team?.id ?? null;
    else if (away > home) winnerId = match.bottom.team?.id ?? null;
    else winnerId = penWinner;
  }

  const awayInputRef = useRef<HTMLInputElement>(null);

  const handleInput = (side: 'home' | 'away', val: string) => {
    const n = val === '' ? null : Math.max(0, parseInt(val, 10) || 0);
    onScore(match.id, side === 'home' ? n : home, side === 'away' ? n : away);
    if (side === 'home' && val.length === 1 && /^\d$/.test(val)) {
      awayInputRef.current?.focus();
    }
    if (side === 'away' && val.length === 1 && /^\d$/.test(val)) {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]:not(:disabled)'));
      const idx = inputs.indexOf(awayInputRef.current!);
      if (idx >= 0 && inputs[idx + 1]) inputs[idx + 1].focus();
    }
  };

  const matchPoints = scoreOneKOMatch(
    round,
    match.top.team?.id ?? null, match.bottom.team?.id ?? null, result,
    actualMatch?.top.team?.id ?? null, actualMatch?.bottom.team?.id ?? null, actualResult,
    allActualRoundTeams,
  );

  const renderRow = (bt: BracketTeam, side: 'home' | 'away') => {
    const score = side === 'home' ? home : away;
    const actualBt = side === 'home' ? actualMatch?.top : actualMatch?.bottom;
    const actualScore = side === 'home' ? actualResult?.home : actualResult?.away;
    const isWinner = winnerId !== null && winnerId === bt.team?.id;
    const isLoser  = winnerId !== null && bt.team !== null && winnerId !== bt.team.id;
    const actualDiffers = actualBt?.team && bt.team && actualBt.team.id !== bt.team.id;
    const actualFills   = actualBt?.team && !bt.team;
    const isPenWinner = !!actualResult?.penaltyWinner &&
      actualResult.penaltyWinner === actualBt?.team?.id;
    return (
      <div className={`bk-row${isWinner ? ' bk-row--win' : isLoser ? ' bk-row--lose' : ''}`}>
        <div className="bk-team-info">
          {bt.team ? (
            <>
              <span className="flag">{bt.team.flag}</span>
              <span className="bk-name">{bt.team.name}</span>
              {actualDiffers && (
                <span className="bk-actual-team">
                  ({actualBt!.team!.flag} {actualBt!.team!.name})
                </span>
              )}
            </>
          ) : (
            <span className="bk-placeholder">
              {bt.label}
              {actualFills && (
                <span className="bk-actual-team">
                  {' '}({actualBt!.team!.flag} {actualBt!.team!.name})
                </span>
              )}
            </span>
          )}
        </div>
        <div className="bk-score-area">
          {canPlay ? (
            <input
              ref={side === 'away' ? awayInputRef : undefined}
              className="bk-score"
              type="number"
              min={0}
              value={score ?? ''}
              onChange={e => handleInput(side, e.target.value)}
            />
          ) : score !== null ? (
            <span className="bk-score-static">{score}</span>
          ) : null}
          {hasActualResult && actualScore !== null && actualScore !== undefined && (
            <span className="actual-score">({actualScore}{isPenWinner ? 'p' : ''})</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bk-match${color ? ` bk-match--${color}` : ''}`}>
      {renderRow(match.top, 'home')}
      {renderRow(match.bottom, 'away')}
      <div className="bk-match-meta">
        <span>{formatKickoff(match.kickoff)}</span>
        <span className="bk-venue">{match.venue}</span>
        <a
          className="gcal-btn"
          href={gcalUrl(
            `${match.top.team?.name ?? match.top.label} vs ${match.bottom.team?.name ?? match.bottom.label}`,
            match.kickoff,
            match.venue,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >+ Google Calendar</a>
      </div>
      {isDraw && (
        <div className="bk-penalty">
          <div className="bk-penalty-q">Penalty shoot-out - who wins?</div>
          <div className="bk-penalty-btns">
            {([match.top, match.bottom] as BracketTeam[]).map(bt => bt.team && (
              <button
                key={bt.team.id}
                className={`bk-pen-btn${penWinner === bt.team.id ? ' bk-pen-btn--sel' : ''}`}
                onClick={() => onPenalty(match.id, penWinner === bt.team!.id ? '' : bt.team!.id)}
              >
                <span className="flag">{bt.team.flag}</span>
                <span className="bk-pen-name">{bt.team.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {color && (
        <div className={`bk-result-label bk-result-label--${color}`}>
          {KO_COLOR_LABEL[color]}{matchPoints > 0 ? ` · +${matchPoints} pts` : ''}
        </div>
      )}
    </div>
  );
}

// ─── Round section ────────────────────────────────────────────────────────────

function Round({
  label,
  subtitle,
  matches,
  single = false,
  locked,
  round,
  results,
  actualMatches,
  actualResults,
  onScore,
  onPenalty,
}: {
  label: string;
  subtitle: string;
  matches: BracketMatch[];
  single?: boolean;
  locked: boolean;
  round: KORound;
  results: KnockoutResults;
  actualMatches?: BracketMatch[];
  actualResults?: KnockoutResults;
  onScore: (id: number, h: number | null, a: number | null) => void;
  onPenalty: (id: number, teamId: string) => void;
}) {
  const allActualRoundTeams = new Set(
    (actualMatches ?? []).flatMap(m => {
      const r = actualResults?.[m.id];
      if (!r || r.home === null || r.away === null) return [];
      if (r.home === r.away) {
        return r.penaltyWinner ? [r.penaltyWinner] : [m.top.team?.id, m.bottom.team?.id];
      }
      const w = koWinnerId(r, m.top.team?.id ?? null, m.bottom.team?.id ?? null);
      return w ? [w] : [];
    }).filter((id): id is string => !!id)
  );

  return (
    <section className="bk-round">
      <div className="bk-round-header">
        <span className="bk-round-label">{label}</span>
        {subtitle && <span className="bk-round-sub">{subtitle}</span>}
      </div>
      <div className={`bk-grid${single ? ' bk-grid--single' : ''}`}>
        {matches.map(m => (
          <MatchCard
            key={m.id}
            match={m}
            result={results[m.id]}
            locked={locked}
            round={round}
            allActualRoundTeams={allActualRoundTeams}
            actualMatch={actualMatches?.find(a => a.id === m.id)}
            actualResult={actualResults?.[m.id]}
            onScore={onScore}
            onPenalty={onPenalty}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  groups: Group[];
  knockoutResults: KnockoutResults;
  onKnockoutResultsChange: (updater: (prev: KnockoutResults) => KnockoutResults) => void;
  locked?: boolean;
  actualGroups?: Group[];
  actualKnockoutResults?: KnockoutResults;
  onFinalWinner?: (team: Team | null) => void;
}

export function KnockoutStage({ groups, knockoutResults: results, onKnockoutResultsChange, locked = false, actualGroups, actualKnockoutResults, onFinalWinner }: Props) {
  const { groupQualifiers, thirdPlacers } = useMemo(
    () => getQualifiedTeams(groups),
    [groups],
  );

  const resolve = useCallback(
    (defs: MatchDef[]) =>
      [...defs]
        .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
        .map(def => resolveBracketMatch(def, groupQualifiers, thirdPlacers, results)),
    [groupQualifiers, thirdPlacers, results],
  );

  const { groupQualifiers: actualQualifiers, thirdPlacers: actualThirdPlacers } = useMemo(
    () => actualGroups ? getQualifiedTeams(actualGroups) : { groupQualifiers: [], thirdPlacers: [] },
    [actualGroups],
  );

  const resolveActual = useCallback(
    (defs: MatchDef[]) =>
      actualGroups
        ? [...defs]
            .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
            .map(def => resolveBracketMatch(def, actualQualifiers, actualThirdPlacers, actualKnockoutResults ?? {}))
        : undefined,
    [actualGroups, actualQualifiers, actualThirdPlacers, actualKnockoutResults],
  );

  const r32        = useMemo(() => resolve(R32),         [resolve]);
  const r16        = useMemo(() => resolve(R16),         [resolve]);
  const qf         = useMemo(() => resolve(QF),          [resolve]);
  const sf         = useMemo(() => resolve(SF),          [resolve]);
  const thirdPlace = useMemo(() => resolve(THIRD_PLACE), [resolve]);
  const fin        = useMemo(() => resolve(FINAL),       [resolve]);

  useEffect(() => {
    if (!onFinalWinner || fin.length === 0) return;
    onFinalWinner(getWinner(fin[0], results));
  }, [fin, results, onFinalWinner]);

  const ar32        = useMemo(() => resolveActual(R32),         [resolveActual]);
  const ar16        = useMemo(() => resolveActual(R16),         [resolveActual]);
  const aqf         = useMemo(() => resolveActual(QF),          [resolveActual]);
  const asf         = useMemo(() => resolveActual(SF),          [resolveActual]);
  const athirdPlace = useMemo(() => resolveActual(THIRD_PLACE), [resolveActual]);
  const afin        = useMemo(() => resolveActual(FINAL),       [resolveActual]);

  const handleScore = useCallback((matchId: number, home: number | null, away: number | null) => {
    onKnockoutResultsChange(prev => {
      const next = { ...prev };
      for (const id of getDownstreamIds(matchId)) delete next[id];
      next[matchId] = { home, away, penaltyWinner: null };
      return next;
    });
  }, [onKnockoutResultsChange]);

  const handlePenalty = useCallback((matchId: number, teamId: string) => {
    onKnockoutResultsChange(prev => {
      const next = { ...prev };
      for (const id of getDownstreamIds(matchId)) delete next[id];
      next[matchId] = { ...prev[matchId], penaltyWinner: teamId || null };
      return next;
    });
  }, [onKnockoutResultsChange]);

  const common = { locked, results, actualResults: actualKnockoutResults, onScore: handleScore, onPenalty: handlePenalty };

  return (
    <div className="knockout-stage bk">
      <div className="knockout-header">
        <h2>Knockout Stage</h2>
        <p className="knockout-sub">
          {locked
            ? 'Complete all group stage matches to enter knockout results'
            : 'Enter scores - winners advance automatically'}
        </p>
      </div>

      <Round label="Round of 32"    subtitle="16 matches" matches={r32}        actualMatches={ar32}        round="r32"   {...common} />
      <Round label="Round of 16"    subtitle="8 matches"  matches={r16}        actualMatches={ar16}        round="r16"   {...common} />
      <Round label="Quarter-finals" subtitle="4 matches"  matches={qf}         actualMatches={aqf}         round="qf"    {...common} />
      <Round label="Semi-finals"    subtitle="2 matches"  matches={sf}         actualMatches={asf}         round="sf"    {...common} />
      <Round label="3rd Place"      subtitle=""           matches={thirdPlace} actualMatches={athirdPlace} round="third" single {...common} />
      <Round label="Final"          subtitle=""           matches={fin}        actualMatches={afin}        round="final" single {...common} />
    </div>
  );
}

// ─── KO score computation (exported for use in predictionScoring) ─────────────

export function computeKOScore(
  predGroups: Group[],
  predResults: KnockoutResults,
  actualGroups: Group[],
  actualResults: KnockoutResults,
): number {
  const { groupQualifiers: pQFs, thirdPlacers: pThirds } = getQualifiedTeams(predGroups);
  const { groupQualifiers: aQFs, thirdPlacers: aThirds } = getQualifiedTeams(actualGroups);
  const ROUNDS: [MatchDef[], KORound][] = [
    [R32, 'r32'], [R16, 'r16'], [QF, 'qf'], [SF, 'sf'], [THIRD_PLACE, 'third'], [FINAL, 'final'],
  ];
  let total = 0;
  for (const [defs, round] of ROUNDS) {
    const predMs = defs.map(def => resolveBracketMatch(def, pQFs, pThirds, predResults));
    const actualMs = defs.map(def => resolveBracketMatch(def, aQFs, aThirds, actualResults));
    const allActualRoundTeams = new Set(
      actualMs.flatMap(m => {
        const r = actualResults[m.id];
        if (!r || r.home === null || r.away === null) return [];
        if (r.home === r.away) {
          return r.penaltyWinner ? [r.penaltyWinner] : [m.top.team?.id, m.bottom.team?.id];
        }
        const w = koWinnerId(r, m.top.team?.id ?? null, m.bottom.team?.id ?? null);
        return w ? [w] : [];
      }).filter((id): id is string => !!id)
    );
    for (const def of defs) {
      const pm = predMs.find(m => m.id === def.id)!;
      const am = actualMs.find(m => m.id === def.id)!;
      total += scoreOneKOMatch(
        round,
        pm.top.team?.id ?? null, pm.bottom.team?.id ?? null, predResults[def.id],
        am.top.team?.id ?? null, am.bottom.team?.id ?? null, actualResults[def.id],
        allActualRoundTeams,
      );
    }
  }
  return total;
}
