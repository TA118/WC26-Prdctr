import type { ThirdPlacedTeam } from '../logic/thirdPlace';

interface Props {
  teams: ThirdPlacedTeam[];
}

const QUALIFY_COUNT = 8;

export function BestThirdTable({ teams }: Props) {
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
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
