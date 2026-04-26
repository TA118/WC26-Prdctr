// UTC kick-off times and venues for all 72 group stage matches.
// Source: official FIFA / Wikipedia match pages (UTC times verified).
export const GROUP_SCHEDULE: Record<string, { kickoff: string; venue: string }> = {
  // ── Group A ──────────────────────────────────────────────────────────────
  'A-m1': { kickoff: '2026-06-11T19:00:00Z', venue: 'Mexico City' },
  'A-m2': { kickoff: '2026-06-12T02:00:00Z', venue: 'Guadalajara' },
  'A-m3': { kickoff: '2026-06-18T16:00:00Z', venue: 'Atlanta' },
  'A-m4': { kickoff: '2026-06-19T01:00:00Z', venue: 'Guadalajara' },
  'A-m5': { kickoff: '2026-06-25T01:00:00Z', venue: 'Mexico City' },
  'A-m6': { kickoff: '2026-06-25T01:00:00Z', venue: 'Guadalajara' },

  // ── Group B ──────────────────────────────────────────────────────────────
  'B-m1': { kickoff: '2026-06-12T19:00:00Z', venue: 'Toronto' },
  'B-m2': { kickoff: '2026-06-13T19:00:00Z', venue: 'San Francisco' },
  'B-m3': { kickoff: '2026-06-18T19:00:00Z', venue: 'Los Angeles' },
  'B-m4': { kickoff: '2026-06-18T22:00:00Z', venue: 'Vancouver' },
  'B-m5': { kickoff: '2026-06-24T19:00:00Z', venue: 'Vancouver' },
  'B-m6': { kickoff: '2026-06-24T19:00:00Z', venue: 'Seattle' },

  // ── Group C ──────────────────────────────────────────────────────────────
  'C-m1': { kickoff: '2026-06-13T22:00:00Z', venue: 'New York/NJ' },
  'C-m2': { kickoff: '2026-06-14T01:00:00Z', venue: 'Boston' },
  'C-m3': { kickoff: '2026-06-20T00:30:00Z', venue: 'Philadelphia' },
  'C-m4': { kickoff: '2026-06-19T22:00:00Z', venue: 'Boston' },
  'C-m5': { kickoff: '2026-06-24T22:00:00Z', venue: 'Miami' },
  'C-m6': { kickoff: '2026-06-24T22:00:00Z', venue: 'Atlanta' },

  // ── Group D ──────────────────────────────────────────────────────────────
  'D-m1': { kickoff: '2026-06-13T01:00:00Z', venue: 'Los Angeles' },
  'D-m2': { kickoff: '2026-06-14T04:00:00Z', venue: 'Vancouver' },
  'D-m3': { kickoff: '2026-06-19T19:00:00Z', venue: 'Seattle' },
  'D-m4': { kickoff: '2026-06-20T03:00:00Z', venue: 'San Francisco' },
  'D-m5': { kickoff: '2026-06-26T02:00:00Z', venue: 'Los Angeles' },
  'D-m6': { kickoff: '2026-06-26T02:00:00Z', venue: 'San Francisco' },

  // ── Group E ──────────────────────────────────────────────────────────────
  'E-m1': { kickoff: '2026-06-14T17:00:00Z', venue: 'Houston' },
  'E-m2': { kickoff: '2026-06-14T23:00:00Z', venue: 'Philadelphia' },
  'E-m3': { kickoff: '2026-06-20T20:00:00Z', venue: 'Toronto' },
  'E-m4': { kickoff: '2026-06-21T00:00:00Z', venue: 'Kansas City' },
  'E-m5': { kickoff: '2026-06-25T20:00:00Z', venue: 'New York/NJ' },
  'E-m6': { kickoff: '2026-06-25T20:00:00Z', venue: 'Philadelphia' },

  // ── Group F ──────────────────────────────────────────────────────────────
  'F-m1': { kickoff: '2026-06-14T20:00:00Z', venue: 'Dallas' },
  'F-m2': { kickoff: '2026-06-15T02:00:00Z', venue: 'Guadalajara' },
  'F-m3': { kickoff: '2026-06-20T17:00:00Z', venue: 'Houston' },
  'F-m4': { kickoff: '2026-06-21T04:00:00Z', venue: 'Guadalajara' },
  'F-m5': { kickoff: '2026-06-25T23:00:00Z', venue: 'Kansas City' },
  'F-m6': { kickoff: '2026-06-25T23:00:00Z', venue: 'Dallas' },

  // ── Group G ──────────────────────────────────────────────────────────────
  'G-m1': { kickoff: '2026-06-15T19:00:00Z', venue: 'Seattle' },
  'G-m2': { kickoff: '2026-06-16T01:00:00Z', venue: 'Los Angeles' },
  'G-m3': { kickoff: '2026-06-21T19:00:00Z', venue: 'Los Angeles' },
  'G-m4': { kickoff: '2026-06-22T01:00:00Z', venue: 'Vancouver' },
  'G-m5': { kickoff: '2026-06-27T03:00:00Z', venue: 'Vancouver' },
  'G-m6': { kickoff: '2026-06-27T03:00:00Z', venue: 'Seattle' },

  // ── Group H ──────────────────────────────────────────────────────────────
  'H-m1': { kickoff: '2026-06-15T16:00:00Z', venue: 'Atlanta' },
  'H-m2': { kickoff: '2026-06-15T22:00:00Z', venue: 'Miami' },
  'H-m3': { kickoff: '2026-06-21T16:00:00Z', venue: 'Atlanta' },
  'H-m4': { kickoff: '2026-06-21T22:00:00Z', venue: 'Miami' },
  'H-m5': { kickoff: '2026-06-27T00:00:00Z', venue: 'Guadalajara' },
  'H-m6': { kickoff: '2026-06-26T00:00:00Z', venue: 'Houston' },

  // ── Group I ──────────────────────────────────────────────────────────────
  'I-m1': { kickoff: '2026-06-16T19:00:00Z', venue: 'New York/NJ' },
  'I-m2': { kickoff: '2026-06-16T22:00:00Z', venue: 'Boston' },
  'I-m3': { kickoff: '2026-06-22T21:00:00Z', venue: 'Philadelphia' },
  'I-m4': { kickoff: '2026-06-22T00:00:00Z', venue: 'New York/NJ' },
  'I-m5': { kickoff: '2026-06-26T19:00:00Z', venue: 'Boston' },
  'I-m6': { kickoff: '2026-06-26T19:00:00Z', venue: 'Toronto' },

  // ── Group J ──────────────────────────────────────────────────────────────
  'J-m1': { kickoff: '2026-06-16T01:00:00Z', venue: 'Kansas City' },
  'J-m2': { kickoff: '2026-06-16T04:00:00Z', venue: 'San Francisco' },
  'J-m3': { kickoff: '2026-06-22T17:00:00Z', venue: 'Dallas' },
  'J-m4': { kickoff: '2026-06-22T03:00:00Z', venue: 'San Francisco' },
  'J-m5': { kickoff: '2026-06-27T01:00:00Z', venue: 'Dallas' },
  'J-m6': { kickoff: '2026-06-27T01:00:00Z', venue: 'Kansas City' },

  // ── Group K ──────────────────────────────────────────────────────────────
  'K-m1': { kickoff: '2026-06-17T17:00:00Z', venue: 'Houston' },
  'K-m2': { kickoff: '2026-06-17T02:00:00Z', venue: 'Mexico City' },
  'K-m3': { kickoff: '2026-06-23T17:00:00Z', venue: 'Houston' },
  'K-m4': { kickoff: '2026-06-23T02:00:00Z', venue: 'Guadalajara' },
  'K-m5': { kickoff: '2026-06-27T23:30:00Z', venue: 'Miami' },
  'K-m6': { kickoff: '2026-06-27T23:30:00Z', venue: 'Atlanta' },

  // ── Group L ──────────────────────────────────────────────────────────────
  'L-m1': { kickoff: '2026-06-17T20:00:00Z', venue: 'Dallas' },
  'L-m2': { kickoff: '2026-06-17T23:00:00Z', venue: 'Toronto' },
  'L-m3': { kickoff: '2026-06-23T20:00:00Z', venue: 'Boston' },
  'L-m4': { kickoff: '2026-06-23T23:00:00Z', venue: 'Toronto' },
  'L-m5': { kickoff: '2026-06-27T21:00:00Z', venue: 'New York/NJ' },
  'L-m6': { kickoff: '2026-06-27T21:00:00Z', venue: 'Philadelphia' },
};
