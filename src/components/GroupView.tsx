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
  locked?: boolean;
  matchLocks?: Record<string, boolean>;
  actualGroup?: Group;
  useActualForStandings?: boolean;
  onScoreChange: (matchId: string, homeScore: number | null, awayScore: number | null) => void;
  onManualRankingsChange: (rankings: ManualRankings) => void;
}

export function GroupView({ group, manualRankings, qualifyingThirdIds, locked = false, matchLocks, actualGroup, useActualForStandings = false, onScoreChange, onManualRankingsChange }: Props) {
  const standingsMatches = useActualForStandings && actualGroup ? actualGroup.matches : group.matches;
  const allPlayed = standingsMatches.every(m => m.homeScore !== null && m.awayScore !== null);
  const playedCount = standingsMatches.filter(m => m.homeScore !== null && m.awayScore !== null).length;

  const { standings, unresolvedGroups } = useMemo(() => {
    const raw = computeStandings(group.teams, standingsMatches);
    const withManual = applyManualRankings(raw, manualRankings, standingsMatches);
    const unresolved = allPlayed
      ? getTiedGroups(raw, standingsMatches).filter(g => !g.every(id => manualRankings[id] !== undefined))
      : [];
    return { standings: withManual, unresolvedGroups: unresolved };
  }, [group.teams, standingsMatches, manualRankings, allPlayed]);

  return (
    <div className="group-view">
      <div className="group-meta">
        <span className="group-label">Group {group.id}</span>
        <span className="group-progress">{playedCount} / {group.matches.length} played</span>
      </div>

      <StandingsTable standings={standings} qualifyingThirdIds={qualifyingThirdIds} />
      <p className="qualify-note">Top 2 qualify ↑</p>

      <MatchList
        matches={group.matches}
        teams={group.teams}
        locked={locked}
        matchLocks={matchLocks}
        actualScores={actualGroup && Object.fromEntries(
          actualGroup.matches.map(m => [m.id, { homeScore: m.homeScore, awayScore: m.awayScore }])
        )}
        onScoreChange={onScoreChange}
      />

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
