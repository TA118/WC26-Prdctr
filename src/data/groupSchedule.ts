// UTC kick-off times and venues for all 72 group stage matches.
// Derived from the official FIFA World Cup 2026 schedule (Sky Sports / FIFA).
// Match IDs match the generated IDs in groups.ts: "<group>-m<n>"
export const GROUP_SCHEDULE: Record<string, { kickoff: string; venue: string }> = {
  // ── Group A ──────────────────────────────────────────────────────────────
  'A-m1': { kickoff: '2026-06-12T00:00:00Z', venue: 'Mexico City' },
  'A-m2': { kickoff: '2026-06-12T19:00:00Z', venue: 'Guadalajara' },
  'A-m3': { kickoff: '2026-06-18T21:00:00Z', venue: 'Atlanta' },
  'A-m4': { kickoff: '2026-06-19T18:00:00Z', venue: 'Guadalajara' },
  'A-m5': { kickoff: '2026-06-25T18:00:00Z', venue: 'Mexico City' },
  'A-m6': { kickoff: '2026-06-25T18:00:00Z', venue: 'Guadalajara' },

  // ── Group B ──────────────────────────────────────────────────────────────
  'B-m1': { kickoff: '2026-06-13T00:00:00Z', venue: 'Toronto' },
  'B-m2': { kickoff: '2026-06-14T00:00:00Z', venue: 'San Francisco' },
  'B-m3': { kickoff: '2026-06-19T00:00:00Z', venue: 'Los Angeles' },
  'B-m4': { kickoff: '2026-06-19T03:00:00Z', venue: 'Vancouver' },
  'B-m5': { kickoff: '2026-06-25T00:00:00Z', venue: 'Vancouver' },
  'B-m6': { kickoff: '2026-06-25T00:00:00Z', venue: 'Seattle' },

  // ── Group C ──────────────────────────────────────────────────────────────
  'C-m1': { kickoff: '2026-06-14T03:00:00Z', venue: 'New York/NJ' },
  'C-m2': { kickoff: '2026-06-14T18:00:00Z', venue: 'Boston' },
  'C-m3': { kickoff: '2026-06-20T17:30:00Z', venue: 'Philadelphia' },
  'C-m4': { kickoff: '2026-06-20T03:00:00Z', venue: 'Boston' },
  'C-m5': { kickoff: '2026-06-25T03:00:00Z', venue: 'Miami' },
  'C-m6': { kickoff: '2026-06-25T03:00:00Z', venue: 'Atlanta' },

  // ── Group D ──────────────────────────────────────────────────────────────
  'D-m1': { kickoff: '2026-06-13T18:00:00Z', venue: 'Los Angeles' },
  'D-m2': { kickoff: '2026-06-14T21:00:00Z', venue: 'Vancouver' },
  'D-m3': { kickoff: '2026-06-20T00:00:00Z', venue: 'Seattle' },
  'D-m4': { kickoff: '2026-06-20T20:00:00Z', venue: 'San Francisco' },
  'D-m5': { kickoff: '2026-06-26T19:00:00Z', venue: 'Los Angeles' },
  'D-m6': { kickoff: '2026-06-26T19:00:00Z', venue: 'San Francisco' },

  // ── Group E ──────────────────────────────────────────────────────────────
  'E-m1': { kickoff: '2026-06-14T22:00:00Z', venue: 'Houston' },
  'E-m2': { kickoff: '2026-06-15T16:00:00Z', venue: 'Philadelphia' },
  'E-m3': { kickoff: '2026-06-21T01:00:00Z', venue: 'Toronto' },
  'E-m4': { kickoff: '2026-06-21T17:00:00Z', venue: 'Kansas City' },
  'E-m5': { kickoff: '2026-06-26T01:00:00Z', venue: 'New York/NJ' },
  'E-m6': { kickoff: '2026-06-26T01:00:00Z', venue: 'Philadelphia' },

  // ── Group F ──────────────────────────────────────────────────────────────
  'F-m1': { kickoff: '2026-06-15T01:00:00Z', venue: 'Dallas' },
  'F-m2': { kickoff: '2026-06-15T19:00:00Z', venue: 'Guadalajara' },
  'F-m3': { kickoff: '2026-06-20T22:00:00Z', venue: 'Houston' },
  'F-m4': { kickoff: '2026-06-21T21:00:00Z', venue: 'Guadalajara' },
  'F-m5': { kickoff: '2026-06-26T16:00:00Z', venue: 'Kansas City' },
  'F-m6': { kickoff: '2026-06-26T16:00:00Z', venue: 'Dallas' },

  // ── Group G ──────────────────────────────────────────────────────────────
  'G-m1': { kickoff: '2026-06-16T00:00:00Z', venue: 'Seattle' },
  'G-m2': { kickoff: '2026-06-16T18:00:00Z', venue: 'Los Angeles' },
  'G-m3': { kickoff: '2026-06-22T00:00:00Z', venue: 'Los Angeles' },
  'G-m4': { kickoff: '2026-06-22T18:00:00Z', venue: 'Vancouver' },
  'G-m5': { kickoff: '2026-06-27T20:00:00Z', venue: 'Vancouver' },
  'G-m6': { kickoff: '2026-06-27T20:00:00Z', venue: 'Seattle' },

  // ── Group H ──────────────────────────────────────────────────────────────
  'H-m1': { kickoff: '2026-06-15T21:00:00Z', venue: 'Atlanta' },
  'H-m2': { kickoff: '2026-06-16T03:00:00Z', venue: 'Miami' },
  'H-m3': { kickoff: '2026-06-21T21:00:00Z', venue: 'Atlanta' },
  'H-m4': { kickoff: '2026-06-22T03:00:00Z', venue: 'Miami' },
  'H-m5': { kickoff: '2026-06-27T17:00:00Z', venue: 'Guadalajara' },
  'H-m6': { kickoff: '2026-06-27T17:00:00Z', venue: 'Houston' },

  // ── Group I ──────────────────────────────────────────────────────────────
  'I-m1': { kickoff: '2026-06-17T00:00:00Z', venue: 'New York/NJ' },
  'I-m2': { kickoff: '2026-06-17T03:00:00Z', venue: 'Boston' },
  'I-m3': { kickoff: '2026-06-23T02:00:00Z', venue: 'Philadelphia' },
  'I-m4': { kickoff: '2026-06-23T17:00:00Z', venue: 'Toronto' },
  'I-m5': { kickoff: '2026-06-27T00:00:00Z', venue: 'Boston' },
  'I-m6': { kickoff: '2026-06-27T00:00:00Z', venue: 'Toronto' },

  // ── Group J ──────────────────────────────────────────────────────────────
  'J-m1': { kickoff: '2026-06-17T18:00:00Z', venue: 'Kansas City' },
  'J-m2': { kickoff: '2026-06-17T21:00:00Z', venue: 'San Francisco' },
  'J-m3': { kickoff: '2026-06-22T22:00:00Z', venue: 'Dallas' },
  'J-m4': { kickoff: '2026-06-23T20:00:00Z', venue: 'San Francisco' },
  'J-m5': { kickoff: '2026-06-28T19:00:00Z', venue: 'Dallas' },
  'J-m6': { kickoff: '2026-06-28T19:00:00Z', venue: 'Kansas City' },

  // ── Group K ──────────────────────────────────────────────────────────────
  'K-m1': { kickoff: '2026-06-17T22:00:00Z', venue: 'Houston' },
  'K-m2': { kickoff: '2026-06-18T19:00:00Z', venue: 'Mexico City' },
  'K-m3': { kickoff: '2026-06-23T22:00:00Z', venue: 'Houston' },
  'K-m4': { kickoff: '2026-06-24T19:00:00Z', venue: 'Guadalajara' },
  'K-m5': { kickoff: '2026-06-28T16:30:00Z', venue: 'Miami' },
  'K-m6': { kickoff: '2026-06-28T16:30:00Z', venue: 'Atlanta' },

  // ── Group L ──────────────────────────────────────────────────────────────
  'L-m1': { kickoff: '2026-06-18T01:00:00Z', venue: 'Dallas' },
  'L-m2': { kickoff: '2026-06-18T16:00:00Z', venue: 'Toronto' },
  'L-m3': { kickoff: '2026-06-24T01:00:00Z', venue: 'Boston' },
  'L-m4': { kickoff: '2026-06-24T16:00:00Z', venue: 'Boston' },
  'L-m5': { kickoff: '2026-06-28T02:00:00Z', venue: 'New York/NJ' },
  'L-m6': { kickoff: '2026-06-28T02:00:00Z', venue: 'Philadelphia' },
};
