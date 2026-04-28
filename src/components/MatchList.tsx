import type { Match, Team } from '../types';
import { MatchRow } from './MatchRow';
import { GROUP_SCHEDULE } from '../data/groupSchedule';

interface Props {
  matches: Match[];
  teams: Team[];
  onScoreChange: (matchId: string, homeScore: number | null, awayScore: number | null) => void;
}

const ROUND_LABEL: Record<number, string> = {
  1: 'Matchday 1',
  2: 'Matchday 2',
  3: 'Matchday 3 — Simultaneous',
};

export function MatchList({ matches, teams, onScoreChange }: Props) {
  const rounds = [1, 2, 3] as const;

  return (
    <div className="match-list">
      {rounds.map((round) => {
        const roundMatches = matches
          .filter((m) => m.round === round)
          .sort((a, b) => {
            const ka = GROUP_SCHEDULE[a.id]?.kickoff ?? '';
            const kb = GROUP_SCHEDULE[b.id]?.kickoff ?? '';
            return ka.localeCompare(kb);
          });
        return (
          <div key={round} className={`round-block ${round === 3 ? 'simultaneous' : ''}`}>
            <p className="round-label">{ROUND_LABEL[round]}</p>
            {roundMatches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                teams={teams}
                onScoreChange={onScoreChange}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
