import type { Standing } from '../types';

interface Props {
  standings: Standing[];
  qualifyingThirdIds?: Set<string>;
}

export function StandingsTable({ standings, qualifyingThirdIds }: Props) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
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
          {standings.map((s, i) => (
            <tr key={s.team.id} className={i < 2 || qualifyingThirdIds?.has(s.team.id) ? 'qualify' : ''}>
              <td>{i + 1}</td>
              <td className="team-col">
                <span className="flag">{s.team.flag}</span>
                {s.team.name}
              </td>
              <td>{s.played}</td>
              <td>{s.wins}</td>
              <td>{s.draws}</td>
              <td>{s.losses}</td>
              <td>{s.goalsFor}</td>
              <td>{s.goalsAgainst}</td>
              <td className={s.goalDifference > 0 ? 'positive' : s.goalDifference < 0 ? 'negative' : ''}>
                {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
              </td>
              <td className="pts">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
