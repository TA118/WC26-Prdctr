import { useMemo } from 'react';
import type { Group } from '../types';
import type { ThirdPlacedTeam } from '../logic/thirdPlace';
import { getThirdPlaceMatchup } from '../logic/knockoutMapping';

interface Props {
  teams: ThirdPlacedTeam[];
  groups: Group[];
}

const QUALIFY_COUNT = 8;

export function BestThirdTable({ teams, groups }: Props) {
  const topEight = useMemo(() => teams.slice(0, QUALIFY_COUNT), [teams]);

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Grp</th>
            <th className="team-col">Team</th>
            <th title="Played">P</th>
            <th title="Wins">W</th>
            <th title="Draws">D</th>
            <th title="Losses">L</th>
            <th title="Goals For">GF</th>
            <th title="Goals Against">GA</th>
            <th title="Goal Difference">GD</th>
            <th title="Points">Pts</th>
            <th className="team-col" title="Potential Round of 32 opponent">Potential Matchup</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => {
            const matchup = i < QUALIFY_COUNT
              ? getThirdPlaceMatchup(topEight, t.groupId, groups)
              : null;
            return (
              <tr key={t.team.id} className={i < QUALIFY_COUNT ? 'qualify' : ''}>
                <td>{i + 1}</td>
                <td className="group-badge">{t.groupId}</td>
                <td className="team-col">
                  <span className="flag">{t.team.flag}</span>
                  {t.team.name}
                </td>
                <td>{t.played}</td>
                <td>{t.wins}</td>
                <td>{t.draws}</td>
                <td>{t.losses}</td>
                <td>{t.goalsFor}</td>
                <td>{t.goalsAgainst}</td>
                <td className={t.goalDifference > 0 ? 'positive' : t.goalDifference < 0 ? 'negative' : ''}>
                  {t.goalDifference > 0 ? `+${t.goalDifference}` : t.goalDifference}
                </td>
                <td className="pts">{t.points}</td>
                <td className="team-col matchup-col">
                  {matchup ? (
                    <><span className="flag">{matchup.flag}</span>{matchup.name}</>
                  ) : i < QUALIFY_COUNT ? '–' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
