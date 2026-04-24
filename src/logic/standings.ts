import type { Team, Match, Standing, ManualRankings } from '../types';

function emptyStanding(team: Team): Standing {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

export function computeStandings(teams: Team[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>(
    teams.map((t) => [t.id, emptyStanding(t)])
  );

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const home = map.get(match.homeTeamId)!;
    const away = map.get(match.awayTeamId)!;
    const hs = match.homeScore;
    const as_ = match.awayScore;

    home.played++;
    away.played++;
    home.goalsFor += hs;
    home.goalsAgainst += as_;
    away.goalsFor += as_;
    away.goalsAgainst += hs;

    if (hs > as_) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (hs < as_) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points += 1;
      away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

/**
 * Find groups of teams that are still tied after pts → GD → GF.
 * Returns arrays of teamIds — one array per tied cluster.
 */
export function getTiedGroups(standings: Standing[]): string[][] {
  const groups: string[][] = [];
  let i = 0;
  while (i < standings.length) {
    let j = i + 1;
    while (
      j < standings.length &&
      standings[j].points === standings[i].points &&
      standings[j].goalDifference === standings[i].goalDifference &&
      standings[j].goalsFor === standings[i].goalsFor
    ) j++;
    if (j > i + 1) groups.push(standings.slice(i, j).map(s => s.team.id));
    i = j;
  }
  return groups;
}

/**
 * Re-order tied clusters in standings using the user's manual choice.
 * Leaves already-separated teams untouched.
 */
export function applyManualRankings(standings: Standing[], manualRankings: ManualRankings): Standing[] {
  if (!Object.keys(manualRankings).length) return standings;
  const result = [...standings];
  let i = 0;
  while (i < result.length) {
    let j = i + 1;
    while (
      j < result.length &&
      result[j].points === result[i].points &&
      result[j].goalDifference === result[i].goalDifference &&
      result[j].goalsFor === result[i].goalsFor
    ) j++;
    if (j > i + 1) {
      const cluster = result.slice(i, j);
      if (cluster.every(s => manualRankings[s.team.id] !== undefined)) {
        cluster.sort((a, b) => manualRankings[a.team.id] - manualRankings[b.team.id]);
        result.splice(i, j - i, ...cluster);
      }
    }
    i = j;
  }
  return result;
}
