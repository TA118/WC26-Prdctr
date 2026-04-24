import { useMemo } from 'react';
import type { Group, ManualRankings } from '../types';
import { computeStandings, getTiedGroups, applyManualRankings } from '../logic/standings';
import { StandingsTable } from './StandingsTable';
import { MatchList } from './MatchList';
import { ManualTiebreakModal } from './ManualTiebreakModal';

interface Props {
  group: Group;
  manualRankings: ManualRankings;
  qualifyingThirdIds: Set<string>;
  onScoreChange: (matchId: string, homeScore: number | null, awayScore: number | null) => void;
  onManualRankingsChange: (rankings: ManualRankings) => void;
}

export function GroupView({ group, manualRankings, qualifyingThirdIds, onScoreChange, onManualRankingsChange }: Props) {
  const allPlayed = group.matches.every(m => m.homeScore !== null && m.awayScore !== null);
  const playedCount = group.matches.filter(m => m.homeScore !== null && m.awayScore !== null).length;

  const { standings, unresolvedGroups } = useMemo(() => {
    const raw = computeStandings(group.teams, group.matches);
    const withManual = applyManualRankings(raw, manualRankings);
    // Only surface unresolved ties once all matches are played
    const unresolved = allPlayed
      ? getTiedGroups(raw).filter(g => !g.every(id => manualRankings[id] !== undefined))
      : [];
    return { standings: withManual, unresolvedGroups: unresolved };
  }, [group, manualRankings, allPlayed]);

  return (
    <div className="group-view">
      <div className="group-meta">
        <span className="group-label">Group {group.id}</span>
        <span className="group-progress">{playedCount} / {group.matches.length} played</span>
      </div>

      <StandingsTable standings={standings} qualifyingThirdIds={qualifyingThirdIds} />
      <p className="qualify-note">Top 2 qualify ↑</p>

      <MatchList matches={group.matches} teams={group.teams} onScoreChange={onScoreChange} />

      {unresolvedGroups.length > 0 && (
        <ManualTiebreakModal
          tiedGroups={unresolvedGroups}
          teams={group.teams}
          onConfirm={onManualRankingsChange}
          onDismiss={() => {}}
        />
      )}
    </div>
  );
}
