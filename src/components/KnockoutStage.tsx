/**
 * Knockout Stage UI
 *
 * Currently shows the list of 32 qualified teams as a placeholder.
 *
 * TODO (future steps):
 *   1. Call assignBracketSlots() once implemented in knockoutMapping.ts
 *   2. Render the full Round of 32 bracket with match inputs
 *   3. Continue through R16 → QF → SF → Final
 */

import { useMemo } from 'react';
import type { Group } from '../types';
import { getQualifiedTeams } from '../logic/knockoutMapping';

interface Props {
  groups: Group[];
}

export function KnockoutStage({ groups }: Props) {
  const { groupQualifiers, thirdPlacers } = useMemo(
    () => getQualifiedTeams(groups),
    [groups]
  );

  return (
    <div className="knockout-stage">
      <div className="knockout-header">
        <h2>Knockout Stage</h2>
        <p className="knockout-sub">
          Round of 32 bracket — slot assignments coming soon
        </p>
      </div>

      <div className="ko-columns">
        {/* ── Group qualifiers ── */}
        <section className="ko-section">
          <h3>Group Qualifiers <span className="ko-count">({groupQualifiers.length} / 24)</span></h3>
          <table className="ko-table">
            <thead>
              <tr>
                <th>Grp</th>
                <th>Pos</th>
                <th className="team-col">Team</th>
                <th title="Points">Pts</th>
                <th title="Goal Difference">GD</th>
              </tr>
            </thead>
            <tbody>
              {groupQualifiers.map(({ team, groupId, position, standing }) => (
                <tr key={`${groupId}-${position}`} className={position === 1 ? 'ko-first' : 'ko-second'}>
                  <td className="group-badge">{groupId}</td>
                  <td className="ko-pos">{position === 1 ? '🥇' : '🥈'}</td>
                  <td className="team-col">
                    <span className="flag">{team.flag}</span>
                    {team.name}
                  </td>
                  <td className="pts">{standing.points}</td>
                  <td className={standing.goalDifference > 0 ? 'positive' : standing.goalDifference < 0 ? 'negative' : ''}>
                    {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Best 3rd-place qualifiers ── */}
        <section className="ko-section">
          <h3>Best 3rd Place <span className="ko-count">({thirdPlacers.length} / 8)</span></h3>
          <table className="ko-table">
            <thead>
              <tr>
                <th>Grp</th>
                <th>Rank</th>
                <th className="team-col">Team</th>
                <th title="Points">Pts</th>
                <th title="Goal Difference">GD</th>
              </tr>
            </thead>
            <tbody>
              {thirdPlacers.map((t, i) => (
                <tr key={t.team.id}>
                  <td className="group-badge">{t.groupId}</td>
                  <td className="ko-pos ko-third">{i + 1}</td>
                  <td className="team-col">
                    <span className="flag">{t.team.flag}</span>
                    {t.team.name}
                  </td>
                  <td className="pts">{t.points}</td>
                  <td className={t.goalDifference > 0 ? 'positive' : t.goalDifference < 0 ? 'negative' : ''}>
                    {t.goalDifference > 0 ? `+${t.goalDifference}` : t.goalDifference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="qualify-note">Top 8 of 12 third-place teams qualify ↑</p>
        </section>
      </div>
    </div>
  );
}
