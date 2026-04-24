import type { Group, Standing } from '../types';
import { computeStandings } from './standings';

export interface ThirdPlacedTeam extends Standing {
  groupId: string;
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
