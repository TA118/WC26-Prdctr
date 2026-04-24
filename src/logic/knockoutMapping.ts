/**
 * Knockout Stage — Qualification Logic
 *
 * This module is responsible for determining which 32 teams advance
 * to the Round of 32 and, later, how they are seeded into bracket slots.
 *
 * ─── Current scope ────────────────────────────────────────────────────────────
 *   getQualifiedTeams(groups) — returns the 32 qualified teams:
 *     • 24 teams: 1st and 2nd place from each of the 12 groups
 *     •  8 teams: the 8 best-ranked 3rd-place finishers
 *
 * ─── Future scope (NOT implemented here) ─────────────────────────────────────
 *   assignBracketSlots(qualifiedTeams) — maps the 8 best 3rd-place teams into
 *   the correct bracket positions using the official FIFA table of 495
 *   combinations (C(12,8) = 495 possible sets of qualifying 3rd-place groups).
 *   Each combination maps to a fixed set of 8 bracket slots so that 3rd-place
 *   teams do not face teams from their own group in the Round of 32.
 */

import type { Group, Team, Standing } from '../types';
import { computeStandings } from './standings';
import { getBestThirdPlaced } from './thirdPlace';
import type { ThirdPlacedTeam } from './thirdPlace';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A team that qualified by finishing 1st or 2nd in their group. */
export interface GroupQualifier {
  team: Team;
  groupId: string;
  position: 1 | 2;
  standing: Standing;
}

/** All 32 teams that advance to the knockout stage. */
export interface QualifiedTeams {
  /** 24 teams — top 2 finishers from each of the 12 groups, in group order. */
  groupQualifiers: GroupQualifier[];
  /** 8 teams — best 3rd-place finishers ranked across all groups. */
  thirdPlacers: ThirdPlacedTeam[];
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Derive the 32 teams that qualify for the knockout stage.
 *
 * @param groups - All 12 group-stage groups with their current match results.
 * @returns The 24 group qualifiers and the 8 best 3rd-place teams.
 *
 * NOTE: Teams are included even if not all group matches have been played yet,
 * so the UI can show live / partial qualification status.
 */
export function getQualifiedTeams(groups: Group[]): QualifiedTeams {
  // Collect 1st and 2nd place from every group
  const groupQualifiers: GroupQualifier[] = groups.flatMap((g) => {
    const standings = computeStandings(g.teams, g.matches);
    return [standings[0], standings[1]].map((standing, idx) => ({
      team: standing.team,
      groupId: g.id,
      position: (idx + 1) as 1 | 2,
      standing,
    }));
  });

  // Take the top 8 from the ranked 3rd-place pool
  const thirdPlacers = getBestThirdPlaced(groups).slice(0, 8);

  return { groupQualifiers, thirdPlacers };
}
