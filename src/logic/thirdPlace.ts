import type { Group, Standing, ManualRankings } from '../types';
import { computeStandings } from './standings';

export interface ThirdPlacedTeam extends Standing {
  groupId: string;
}

const QUALIFY_COUNT = 8;

function isTied(a: ThirdPlacedTeam, b: ThirdPlacedTeam) {
  return a.points === b.points && a.goalDifference === b.goalDifference && a.goalsFor === b.goalsFor;
}

export function getBestThirdPlaced(groups: Group[]): ThirdPlacedTeam[] {
  return groups
    .map((g) => {
      const standings = computeStandings(g.teams, g.matches);
      return { ...standings[2], groupId: g.id };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
}

/** Returns tied clusters that span the position-8/9 qualification boundary. */
export function getThirdPlaceBoundaryTies(sorted: ThirdPlacedTeam[]): string[][] {
  const result: string[][] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && isTied(sorted[i], sorted[j])) j++;
    if (j > i + 1 && i < QUALIFY_COUNT && j > QUALIFY_COUNT) {
      result.push(sorted.slice(i, j).map(t => t.team.id));
    }
    i = j;
  }
  return result;
}

/** Re-order tied clusters using manual rankings (same logic as group standings). */
export function applyThirdPlaceManualRankings(
  sorted: ThirdPlacedTeam[],
  manualRankings: ManualRankings,
): ThirdPlacedTeam[] {
  if (!Object.keys(manualRankings).length) return sorted;
  const result = [...sorted];
  let i = 0;
  while (i < result.length) {
    let j = i + 1;
    while (j < result.length && isTied(result[i], result[j])) j++;
    if (j > i + 1) {
      const cluster = result.slice(i, j);
      if (cluster.every(t => manualRankings[t.team.id] !== undefined)) {
        cluster.sort((a, b) => manualRankings[a.team.id] - manualRankings[b.team.id]);
        result.splice(i, j - i, ...cluster);
      }
    }
    i = j;
  }
  return result;
}
