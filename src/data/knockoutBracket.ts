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
}

const W  = (g: string): SlotRef => ({ kind: 'winner', group: g });
const R  = (g: string): SlotRef => ({ kind: 'runner', group: g });
const T  = (...gs: string[]): SlotRef => ({ kind: 'third', groups: gs });
const MW = (id: number): SlotRef => ({ kind: 'match-winner', id });
const ML = (id: number): SlotRef => ({ kind: 'match-loser', id });

export const R32: MatchDef[] = [
  { id: 73, top: R('A'),  bottom: R('B') },
  { id: 74, top: W('E'),  bottom: T('A','B','C','D','F') },
  { id: 75, top: W('F'),  bottom: R('C') },
  { id: 76, top: W('C'),  bottom: R('F') },
  { id: 77, top: W('I'),  bottom: T('C','D','F','G','H') },
  { id: 78, top: R('E'),  bottom: R('I') },
  { id: 79, top: W('A'),  bottom: T('C','E','F','H','I') },
  { id: 80, top: W('L'),  bottom: T('E','H','I','J','K') },
  { id: 81, top: W('D'),  bottom: T('B','E','F','I','J') },
  { id: 82, top: W('G'),  bottom: T('A','E','H','I','J') },
  { id: 83, top: R('K'),  bottom: R('L') },
  { id: 84, top: W('H'),  bottom: R('J') },
  { id: 85, top: W('B'),  bottom: T('E','F','G','I','J') },
  { id: 86, top: W('J'),  bottom: R('H') },
  { id: 87, top: W('K'),  bottom: T('D','E','I','J','L') },
  { id: 88, top: R('D'),  bottom: R('G') },
];

export const R16: MatchDef[] = [
  { id: 89, top: MW(73), bottom: MW(75) },
  { id: 90, top: MW(74), bottom: MW(77) },
  { id: 91, top: MW(76), bottom: MW(78) },
  { id: 92, top: MW(79), bottom: MW(80) },
  { id: 93, top: MW(83), bottom: MW(84) },
  { id: 94, top: MW(81), bottom: MW(82) },
  { id: 95, top: MW(86), bottom: MW(88) },
  { id: 96, top: MW(85), bottom: MW(87) },
];

export const QF: MatchDef[] = [
  { id: 97,  top: MW(89), bottom: MW(90) },
  { id: 98,  top: MW(93), bottom: MW(94) },
  { id: 99,  top: MW(91), bottom: MW(92) },
  { id: 100, top: MW(95), bottom: MW(96) },
];

export const SF: MatchDef[] = [
  { id: 101, top: MW(97),  bottom: MW(98) },
  { id: 102, top: MW(99),  bottom: MW(100) },
];

export const THIRD_PLACE: MatchDef[] = [
  { id: 103, top: ML(101), bottom: ML(102) },
];

export const FINAL: MatchDef[] = [
  { id: 104, top: MW(101), bottom: MW(102) },
];

export const ALL_MATCHES: MatchDef[] = [
  ...R32, ...R16, ...QF, ...SF, ...THIRD_PLACE, ...FINAL,
];
