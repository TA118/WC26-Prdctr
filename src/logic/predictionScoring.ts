import type { Group } from '../types';
import type { KnockoutResults } from '../components/KnockoutStage';
import { computeStandings } from './standings';

// ─── Group stage ──────────────────────────────────────────────────────────────

export function scoreGroupMatch(
  predHome: number, predAway: number,
  actualHome: number, actualAway: number,
): number {
  if (predHome === actualHome && predAway === actualAway) return 2;
  if (Math.sign(predHome - predAway) === Math.sign(actualHome - actualAway)) return 1;
  return 0;
}

export function totalGroupScore(predGroups: Group[], actualGroups: Group[]): number {
  let total = 0;
  for (const pg of predGroups) {
    const ag = actualGroups.find(g => g.id === pg.id);
    if (!ag) continue;
    for (const pm of pg.matches) {
      if (pm.homeScore === null || pm.awayScore === null) continue;
      const am = ag.matches.find(m => m.id === pm.id);
      if (!am || am.homeScore === null || am.awayScore === null) continue;
      total += scoreGroupMatch(pm.homeScore, pm.awayScore, am.homeScore, am.awayScore);
    }
  }
  return total;
}

// ─── Match color language ─────────────────────────────────────────────────────

export type MatchColor = 'green' | 'yellow' | 'orange' | 'purple' | 'red' | null;

// ─── Group qualifier helpers ──────────────────────────────────────────────────

function groupWinnerAndRunner(group: Group): [string | null, string | null] {
  const standings = computeStandings(group.teams, group.matches);
  const allPlayed = group.matches.every(m => m.homeScore !== null && m.awayScore !== null);
  if (!allPlayed || standings.length < 2) return [null, null];
  return [standings[0].team.id, standings[1].team.id];
}

// ─── Knockout round scoring ───────────────────────────────────────────────────

// Points table per round for: [exactMatchup+winner, exactMatchup+otherResult, correctWinnerDiffOpponent, teamAdvancedDiffSlot]
const ROUND_POINTS: Record<string, [number, number, number, number]> = {
  r32:   [4, 3, 2, 1],
  r16:   [4, 4, 3, 2], // exact score adds +2 on top of exactMatchup+winner (handled separately)
  qf:    [5, 5, 4, 3],
  sf:    [7, 7, 5, 4],
  third: [7, 7, 5, 4], // same as semi-finals
  final: [12, 12, 10, 0],
};

const ROUND_EXACT_SCORE_BONUS: Record<string, number> = {
  r16:   2, // 4+2 = 6
  qf:    3, // 5+3 = 8
  sf:    3, // 7+3 = 10
  third: 3, // 7+3 = 10, same as semi-finals
  final: 8, // 12+8 = 20
};

function matchWinnerId(
  homeTeamId: string | null, awayTeamId: string | null,
  result: { home: number | null; away: number | null; penaltyWinner: string | null } | undefined,
): string | null {
  if (!result || result.home === null || result.away === null) return null;
  if (result.home > result.away) return homeTeamId;
  if (result.away > result.home) return awayTeamId;
  return result.penaltyWinner;
}

export interface KOMatchScoreInput {
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';
  predHomeId: string | null;
  predAwayId: string | null;
  predResult: { home: number | null; away: number | null; penaltyWinner: string | null } | undefined;
  actualHomeId: string | null;
  actualAwayId: string | null;
  actualResult: { home: number | null; away: number | null; penaltyWinner: string | null } | undefined;
  // All teams that advanced to this stage (for purple "different slot" detection)
  allPredAdvancers: Set<string>;
  allActualAdvancers: Set<string>;
}

export function scoreKOMatch(input: KOMatchScoreInput): { points: number; color: MatchColor } {
  const {
    round, predHomeId, predAwayId, predResult,
    actualHomeId, actualAwayId, actualResult,
    allPredAdvancers,
  } = input;

  // No actual result yet
  if (actualHomeId === null || actualAwayId === null || actualResult === null) {
    return { points: 0, color: null };
  }
  // No prediction filled
  if (predHomeId === null || predAwayId === null || !predResult) {
    return { points: 0, color: null };
  }
  if (predResult.home === null || predResult.away === null) {
    return { points: 0, color: null };
  }

  const pts = ROUND_POINTS[round];
  const bonus = ROUND_EXACT_SCORE_BONUS[round] ?? 0;

  const predWinner = matchWinnerId(predHomeId, predAwayId, predResult);
  const actualWinner = matchWinnerId(actualHomeId, actualAwayId, actualResult);

  const predTeams = new Set([predHomeId, predAwayId]);
  const actualTeams = new Set([actualHomeId, actualAwayId]);

  const exactMatchup = predTeams.has(actualHomeId) && predTeams.has(actualAwayId);

  if (exactMatchup) {
    const correctWinner = predWinner !== null && predWinner === actualWinner;
    if (correctWinner) {
      // Check exact score
      const exactScore = actualResult !== undefined &&
        predResult.home === actualResult.home &&
        predResult.away === actualResult.away &&
        (predResult.penaltyWinner ?? null) === (actualResult.penaltyWinner ?? null);
      return {
        points: pts[0] + (exactScore ? bonus : 0),
        color: exactScore ? 'green' : 'yellow',
      };
    }
    // Same matchup, wrong winner
    return { points: pts[1], color: 'orange' };
  }

  // Correct winner but different opponent
  if (predWinner !== null && predWinner === actualWinner) {
    return { points: pts[2], color: 'orange' };
  }

  // Team advanced via different bracket slot
  if (predWinner !== null && actualTeams.has(predWinner) && allPredAdvancers.has(predWinner)) {
    return { points: pts[3], color: 'purple' };
  }
  if (actualWinner !== null && predTeams.has(actualWinner)) {
    return { points: pts[3], color: 'purple' };
  }

  return { points: 0, color: 'red' };
}

// ─── Golden Boot ──────────────────────────────────────────────────────────────

export const GOLDEN_BOOT_POINTS = 10;

export function scoreGoldenBoot(
  predName: string | null | undefined,
  actualName: string | null | undefined,
): number {
  if (!predName || !actualName) return 0;
  return predName.trim().toLowerCase() === actualName.trim().toLowerCase()
    ? GOLDEN_BOOT_POINTS
    : 0;
}

// ─── Total score ──────────────────────────────────────────────────────────────

const FINAL_MATCH_ID = 104;

export function computeTotalScore(
  predGroups: Group[],
  _predKO: KnockoutResults,
  actualGroups: Group[],
  actualKO: KnockoutResults,
  predGoldenBoot?: string | null,
  actualGoldenBoot?: string | null,
): number {
  // Golden Boot points only awarded after the Final has been played
  const finalPlayed = (() => {
    const r = actualKO[FINAL_MATCH_ID];
    return r !== undefined && r.home !== null && r.away !== null;
  })();

  return (
    totalGroupScore(predGroups, actualGroups) +
    (finalPlayed ? scoreGoldenBoot(predGoldenBoot, actualGoldenBoot) : 0)
  );
}

// ─── Group match color ────────────────────────────────────────────────────────

export function groupMatchColor(
  predHome: number | null, predAway: number | null,
  actualHome: number | null, actualAway: number | null,
): MatchColor {
  if (predHome === null || predAway === null || actualHome === null || actualAway === null) return null;
  if (predHome === actualHome && predAway === actualAway) return 'green';
  if (Math.sign(predHome - predAway) === Math.sign(actualHome - actualAway)) return 'yellow';
  return 'red';
}

export { groupWinnerAndRunner };
