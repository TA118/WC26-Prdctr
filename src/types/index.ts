export interface Team {
  id: string;
  name: string;
  flag: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  round: 1 | 2 | 3;
}

export interface Group {
  id: string;
  teams: Team[];
  matches: Match[];
}

/** teamId → rank (1-based) chosen by the user when teams can't be separated */
export type ManualRankings = Record<string, number>;

export interface Standing {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
