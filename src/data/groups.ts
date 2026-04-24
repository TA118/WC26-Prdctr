import type { Team, Match, Group } from '../types';

type Fixtures = [number, number, 1 | 2 | 3][];

// Default FIFA fixture order for a group of 4
const DEFAULT_FIXTURES: Fixtures = [
  [0, 1, 1], [2, 3, 1],
  [0, 2, 2], [1, 3, 2],
  [0, 3, 3], [1, 2, 3],
];

function makeMatches(teams: Team[], groupId: string, fixtures: Fixtures = DEFAULT_FIXTURES): Match[] {
  return fixtures.map(([a, b, round], i) => ({
    id: `${groupId}-m${i + 1}`,
    homeTeamId: teams[a].id,
    awayTeamId: teams[b].id,
    homeScore: null,
    awayScore: null,
    round,
  }));
}

function group(id: string, teams: Team[], fixtures?: Fixtures): Group {
  return { id, teams, matches: makeMatches(teams, id, fixtures) };
}

const t = (id: string, name: string, flag: string): Team => ({ id, name, flag });

export const INITIAL_GROUPS: Group[] = [
  // MD1: Mex v Rsa, Kor v Cze | MD2: Cze v Rsa, Mex v Kor | MD3: Cze v Mex, Rsa v Kor
  group('A', [
    t('mex', 'Mexico',      '🇲🇽'),
    t('kor', 'South Korea', '🇰🇷'),
    t('rsa', 'South Africa','🇿🇦'),
    t('cze', 'Czechia',     '🇨🇿'),
  ], [
    [0, 2, 1], [1, 3, 1],
    [3, 2, 2], [0, 1, 2],
    [3, 0, 3], [2, 1, 3],
  ]),
  // MD1: Can v Bih, Qat v Sui | MD2: Sui v Bih, Can v Qat | MD3: Sui v Can, Bih v Qat
  group('B', [
    t('can', 'Canada',             '🇨🇦'),
    t('sui', 'Switzerland',        '🇨🇭'),
    t('qat', 'Qatar',              '🇶🇦'),
    t('bih', 'Bosnia-Herzegovina', '🇧🇦'),
  ], [
    [0, 3, 1], [2, 1, 1],
    [1, 3, 2], [0, 2, 2],
    [1, 0, 3], [3, 2, 3],
  ]),
  group('C', [
    t('bra', 'Brazil',   '🇧🇷'),
    t('mar', 'Morocco',  '🇲🇦'),
    t('hai', 'Haiti',    '🇭🇹'),
    t('sco', 'Scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
  ]),
  group('D', [
    t('usa', 'United States', '🇺🇸'),
    t('par', 'Paraguay',      '🇵🇾'),
    t('aus', 'Australia',     '🇦🇺'),
    t('tur', 'Türkiye',       '🇹🇷'),
  ]),
  // MD1: Ger v Cur, Civ v Ecu | MD2: Ger v Civ, Ecu v Cur | MD3: Ecu v Ger, Cur v Civ
  group('E', [
    t('ger', 'Germany',       '🇩🇪'),
    t('civ', "Côte d'Ivoire", '🇨🇮'),
    t('ecu', 'Ecuador',       '🇪🇨'),
    t('cur', 'Curaçao',       '🇨🇼'),
  ], [
    [0, 3, 1], [1, 2, 1],
    [0, 1, 2], [2, 3, 2],
    [2, 0, 3], [3, 1, 3],
  ]),
  group('F', [
    t('ned', 'Netherlands', '🇳🇱'),
    t('jpn', 'Japan',       '🇯🇵'),
    t('swe', 'Sweden',      '🇸🇪'),
    t('tun', 'Tunisia',     '🇹🇳'),
  ]),
  group('G', [
    t('bel', 'Belgium',     '🇧🇪'),
    t('egy', 'Egypt',       '🇪🇬'),
    t('irn', 'Iran',        '🇮🇷'),
    t('nzl', 'New Zealand', '🇳🇿'),
  ]),
  group('H', [
    t('esp', 'Spain',        '🇪🇸'),
    t('cpv', 'Cape Verde',   '🇨🇻'),
    t('ksa', 'Saudi Arabia', '🇸🇦'),
    t('uru', 'Uruguay',      '🇺🇾'),
  ]),
  group('I', [
    t('fra', 'France',  '🇫🇷'),
    t('sen', 'Senegal', '🇸🇳'),
    t('irq', 'Iraq',    '🇮🇶'),
    t('nor', 'Norway',  '🇳🇴'),
  ]),
  group('J', [
    t('arg', 'Argentina', '🇦🇷'),
    t('alg', 'Algeria',   '🇩🇿'),
    t('aut', 'Austria',   '🇦🇹'),
    t('jor', 'Jordan',    '🇯🇴'),
  ]),
  group('K', [
    t('por', 'Portugal', '🇵🇹'),
    t('cod', 'DR Congo',  '🇨🇩'),
    t('uzb', 'Uzbekistan','🇺🇿'),
    t('col', 'Colombia',  '🇨🇴'),
  ]),
  group('L', [
    t('eng', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
    t('cro', 'Croatia', '🇭🇷'),
    t('gha', 'Ghana',   '🇬🇭'),
    t('pan', 'Panama',  '🇵🇦'),
  ]),
];
