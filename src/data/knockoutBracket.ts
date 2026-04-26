export type SlotRef =
  | { kind: 'winner'; group: string }
  | { kind: 'runner'; group: string }
  | { kind: 'third'; groups: string[] }
  | { kind: 'match-winner'; id: number }
  | { kind: 'match-loser'; id: number };

export interface MatchDef {
  id: number;
  top: SlotRef;
  bottom: SlotRef;
  kickoff: string; // ISO 8601 UTC
  venue: string;
}

const W  = (g: string): SlotRef => ({ kind: 'winner', group: g });
const R  = (g: string): SlotRef => ({ kind: 'runner', group: g });
const T  = (...gs: string[]): SlotRef => ({ kind: 'third', groups: gs });
const MW = (id: number): SlotRef => ({ kind: 'match-winner', id });
const ML = (id: number): SlotRef => ({ kind: 'match-loser', id });

export const R32: MatchDef[] = [
  { id: 73,  top: R('A'), bottom: R('B'),               kickoff: '2026-06-28T19:00:00Z', venue: 'Los Angeles' },
  { id: 74,  top: W('E'), bottom: T('A','B','C','D','F'), kickoff: '2026-06-29T20:30:00Z', venue: 'Boston' },
  { id: 75,  top: W('F'), bottom: R('C'),                kickoff: '2026-06-30T01:00:00Z', venue: 'Guadalajara' },
  { id: 76,  top: W('C'), bottom: R('F'),                kickoff: '2026-06-29T17:00:00Z', venue: 'Houston' },
  { id: 77,  top: W('I'), bottom: T('C','D','F','G','H'), kickoff: '2026-06-30T21:00:00Z', venue: 'New York/NJ' },
  { id: 78,  top: R('E'), bottom: R('I'),                kickoff: '2026-06-30T17:00:00Z', venue: 'Dallas' },
  { id: 79,  top: W('A'), bottom: T('C','E','F','H','I'), kickoff: '2026-07-01T01:00:00Z', venue: 'Mexico City' },
  { id: 80,  top: W('L'), bottom: T('E','H','I','J','K'), kickoff: '2026-07-01T16:00:00Z', venue: 'Atlanta' },
  { id: 81,  top: W('D'), bottom: T('B','E','F','I','J'), kickoff: '2026-07-02T00:00:00Z', venue: 'San Francisco' },
  { id: 82,  top: W('G'), bottom: T('A','E','H','I','J'), kickoff: '2026-07-01T20:00:00Z', venue: 'Seattle' },
  { id: 83,  top: R('K'), bottom: R('L'),                kickoff: '2026-07-02T23:00:00Z', venue: 'Toronto' },
  { id: 84,  top: W('H'), bottom: R('J'),                kickoff: '2026-07-02T19:00:00Z', venue: 'Los Angeles' },
  { id: 85,  top: W('B'), bottom: T('E','F','G','I','J'), kickoff: '2026-07-03T03:00:00Z', venue: 'Vancouver' },
  { id: 86,  top: W('J'), bottom: R('H'),                kickoff: '2026-07-03T22:00:00Z', venue: 'Miami' },
  { id: 87,  top: W('K'), bottom: T('D','E','I','J','L'), kickoff: '2026-07-04T01:30:00Z', venue: 'Kansas City' },
  { id: 88,  top: R('D'), bottom: R('G'),                kickoff: '2026-07-03T18:00:00Z', venue: 'Dallas' },
];

export const R16: MatchDef[] = [
  { id: 89, top: MW(73), bottom: MW(75), kickoff: '2026-07-04T21:00:00Z', venue: 'Philadelphia' },
  { id: 90, top: MW(74), bottom: MW(77), kickoff: '2026-07-04T17:00:00Z', venue: 'Houston' },
  { id: 91, top: MW(76), bottom: MW(78), kickoff: '2026-07-05T20:00:00Z', venue: 'New York/NJ' },
  { id: 92, top: MW(79), bottom: MW(80), kickoff: '2026-07-05T00:00:00Z', venue: 'Mexico City' },
  { id: 93, top: MW(83), bottom: MW(84), kickoff: '2026-07-06T19:00:00Z', venue: 'Dallas' },
  { id: 94, top: MW(81), bottom: MW(82), kickoff: '2026-07-06T00:00:00Z', venue: 'Seattle' },
  { id: 95, top: MW(86), bottom: MW(88), kickoff: '2026-07-07T16:00:00Z', venue: 'Atlanta' },
  { id: 96, top: MW(85), bottom: MW(87), kickoff: '2026-07-07T20:00:00Z', venue: 'Vancouver' },
];

export const QF: MatchDef[] = [
  { id: 97,  top: MW(89), bottom: MW(90), kickoff: '2026-07-09T20:00:00Z', venue: 'Boston' },
  { id: 98,  top: MW(93), bottom: MW(94), kickoff: '2026-07-10T19:00:00Z', venue: 'Los Angeles' },
  { id: 99,  top: MW(91), bottom: MW(92), kickoff: '2026-07-11T21:00:00Z', venue: 'Miami' },
  { id: 100, top: MW(95), bottom: MW(96), kickoff: '2026-07-11T01:00:00Z', venue: 'Kansas City' },
];

export const SF: MatchDef[] = [
  { id: 101, top: MW(97),  bottom: MW(98),  kickoff: '2026-07-14T18:00:00Z', venue: 'Dallas' },
  { id: 102, top: MW(99),  bottom: MW(100), kickoff: '2026-07-15T19:00:00Z', venue: 'Atlanta' },
];

export const THIRD_PLACE: MatchDef[] = [
  { id: 103, top: ML(101), bottom: ML(102), kickoff: '2026-07-18T21:00:00Z', venue: 'Miami' },
];

export const FINAL: MatchDef[] = [
  { id: 104, top: MW(101), bottom: MW(102), kickoff: '2026-07-19T19:00:00Z', venue: 'New York/NJ' },
];

export const ALL_MATCHES: MatchDef[] = [
  ...R32, ...R16, ...QF, ...SF, ...THIRD_PLACE, ...FINAL,
];
