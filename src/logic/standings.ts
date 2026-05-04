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

interface H2HStats { pts: number; gd: number; gf: number; }

function computeH2H(teamIds: Set<string>, matches: Match[]): Map<string, H2HStats> {
  const h2h = new Map<string, H2HStats>();
  for (const id of teamIds) h2h.set(id, { pts: 0, gd: 0, gf: 0 });

  for (const m of matches) {
    if (!teamIds.has(m.homeTeamId) || !teamIds.has(m.awayTeamId)) continue;
    if (m.homeScore === null || m.awayScore === null) continue;
    const home = h2h.get(m.homeTeamId)!;
    const away = h2h.get(m.awayTeamId)!;
    home.gf += m.homeScore;
    home.gd += m.homeScore - m.awayScore;
    away.gf += m.awayScore;
    away.gd += m.awayScore - m.homeScore;
    if (m.homeScore > m.awayScore) home.pts += 3;
    else if (m.awayScore > m.homeScore) away.pts += 3;
    else { home.pts++; away.pts++; }
  }
  return h2h;
}

function compareWithH2H(a: Standing, b: Standing, h2h: Map<string, H2HStats>): number {
  const ah = h2h.get(a.team.id)!;
  const bh = h2h.get(b.team.id)!;
  if (bh.pts !== ah.pts) return bh.pts - ah.pts;
  if (bh.gd !== ah.gd) return bh.gd - ah.gd;
  if (bh.gf !== ah.gf) return bh.gf - ah.gf;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  return b.goalsFor - a.goalsFor;
}

function isTiedAfterAllCriteria(a: Standing, b: Standing, h2h: Map<string, H2HStats>): boolean {
  return compareWithH2H(a, b, h2h) === 0;
}

export function computeStandings(teams: Team[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>(
    teams.map((t) => [t.id, emptyStanding(t)])
  );

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    const home = map.get(match.homeTeamId)!;
    const away = map.get(match.awayTeamId)!;
    const hs = match.homeScore, as_ = match.awayScore;
    home.played++; away.played++;
    home.goalsFor += hs; home.goalsAgainst += as_;
    away.goalsFor += as_; away.goalsAgainst += hs;
    if (hs > as_) { home.wins++; home.points += 3; away.losses++; }
    else if (hs < as_) { away.wins++; away.points += 3; home.losses++; }
    else { home.draws++; away.draws++; home.points++; away.points++; }
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  const standings = Array.from(map.values());
  standings.sort((a, b) => b.points - a.points);

  // Within each points-tied cluster: H2H → overall GD → overall GF
  const result: Standing[] = [];
  let i = 0;
  while (i < standings.length) {
    let j = i + 1;
    while (j < standings.length && standings[j].points === standings[i].points) j++;
    const cluster = standings.slice(i, j);
    if (cluster.length > 1) {
      const teamIds = new Set(cluster.map(s => s.team.id));
      const h2h = computeH2H(teamIds, matches);
      cluster.sort((a, b) => compareWithH2H(a, b, h2h));
    }
    result.push(...cluster);
    i = j;
  }
  return result;
}

/**
 * Find clusters still tied after all criteria (pts → H2H → overall GD → overall GF).
 * Only these unresolvable ties trigger the manual tiebreaker modal.
 */
export function getTiedGroups(standings: Standing[], matches: Match[]): string[][] {
  const groups: string[][] = [];
  let i = 0;
  while (i < standings.length) {
    let j = i + 1;
    while (j < standings.length && standings[j].points === standings[i].points) j++;
    const cluster = standings.slice(i, j);
    if (cluster.length > 1) {
      const teamIds = new Set(cluster.map(s => s.team.id));
      const h2h = computeH2H(teamIds, matches);
      let k = 0;
      while (k < cluster.length) {
        let l = k + 1;
        while (l < cluster.length && isTiedAfterAllCriteria(cluster[k], cluster[l], h2h)) l++;
        if (l > k + 1) groups.push(cluster.slice(k, l).map(s => s.team.id));
        k = l;
      }
    }
    i = j;
  }
  return groups;
}

/**
 * Re-order truly tied clusters using the user's manual choice.
 */
export function applyManualRankings(standings: Standing[], manualRankings: ManualRankings, matches: Match[]): Standing[] {
  if (!Object.keys(manualRankings).length) return standings;
  const result = [...standings];
  let i = 0;
  while (i < result.length) {
    let j = i + 1;
    while (j < result.length && result[j].points === result[i].points) j++;
    const cluster = result.slice(i, j);
    if (cluster.length > 1) {
      const teamIds = new Set(cluster.map(s => s.team.id));
      const h2h = computeH2H(teamIds, matches);
      let k = 0;
      while (k < cluster.length) {
        let l = k + 1;
        while (l < cluster.length && isTiedAfterAllCriteria(cluster[k], cluster[l], h2h)) l++;
        if (l > k + 1) {
          const sub = cluster.slice(k, l);
          if (sub.every(s => manualRankings[s.team.id] !== undefined)) {
            sub.sort((a, b) => manualRankings[a.team.id] - manualRankings[b.team.id]);
            cluster.splice(k, l - k, ...sub);
          }
        }
        k = l;
      }
      result.splice(i, j - i, ...cluster);
    }
    i = j;
  }
  return result;
}
