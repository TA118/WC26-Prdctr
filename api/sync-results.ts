import { createClient } from '@supabase/supabase-js';

const BSD_TOKEN = process.env.BSD_API_TOKEN!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const WC_TEAMS = new Set([
  'Mexico', 'South Korea', 'South Africa', 'Czechia',
  'Canada', 'Switzerland', 'Qatar', 'Bosnia & Herzegovina',
  'Brazil', 'Morocco', 'Haiti', 'Scotland',
  'USA', 'Paraguay', 'Australia', 'Türkiye',
  'Germany', "Côte d'Ivoire", 'Ecuador', 'Curaçao',
  'Netherlands', 'Japan', 'Sweden', 'Tunisia',
  'Belgium', 'Egypt', 'Iran', 'New Zealand',
  'Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay',
  'France', 'Senegal', 'Iraq', 'Norway',
  'Argentina', 'Algeria', 'Austria', 'Jordan',
  'Portugal', 'DR Congo', 'Uzbekistan', 'Colombia',
  'England', 'Croatia', 'Ghana', 'Panama',
]);

const TEAM_ID: Record<string, string> = {
  'Mexico': 'mex', 'South Korea': 'kor', 'South Africa': 'rsa', 'Czechia': 'cze',
  'Canada': 'can', 'Switzerland': 'sui', 'Qatar': 'qat', 'Bosnia & Herzegovina': 'bih',
  'Brazil': 'bra', 'Morocco': 'mar', 'Haiti': 'hai', 'Scotland': 'sco',
  'USA': 'usa', 'Paraguay': 'par', 'Australia': 'aus', 'Türkiye': 'tur',
  'Germany': 'ger', "Côte d'Ivoire": 'civ', 'Ecuador': 'ecu', 'Curaçao': 'cur',
  'Netherlands': 'ned', 'Japan': 'jpn', 'Sweden': 'swe', 'Tunisia': 'tun',
  'Belgium': 'bel', 'Egypt': 'egy', 'Iran': 'irn', 'New Zealand': 'nzl',
  'Spain': 'esp', 'Cabo Verde': 'cpv', 'Saudi Arabia': 'ksa', 'Uruguay': 'uru',
  'France': 'fra', 'Senegal': 'sen', 'Iraq': 'irq', 'Norway': 'nor',
  'Argentina': 'arg', 'Algeria': 'alg', 'Austria': 'aut', 'Jordan': 'jor',
  'Portugal': 'por', 'DR Congo': 'cod', 'Uzbekistan': 'uzb', 'Colombia': 'col',
  'England': 'eng', 'Croatia': 'cro', 'Ghana': 'gha', 'Panama': 'pan',
};

type MatchEntry = { matchId: string; reversed: boolean };
const MATCH_LOOKUP: Record<string, MatchEntry> = {};

function reg(homeId: string, awayId: string, matchId: string) {
  MATCH_LOOKUP[`${homeId}-${awayId}`] = { matchId, reversed: false };
  MATCH_LOOKUP[`${awayId}-${homeId}`] = { matchId, reversed: true };
}

// Group A — custom fixtures
reg('mex', 'rsa', 'A-m1'); reg('kor', 'cze', 'A-m2');
reg('cze', 'rsa', 'A-m3'); reg('mex', 'kor', 'A-m4');
reg('cze', 'mex', 'A-m5'); reg('rsa', 'kor', 'A-m6');
// Group B — custom fixtures
reg('can', 'bih', 'B-m1'); reg('qat', 'sui', 'B-m2');
reg('sui', 'bih', 'B-m3'); reg('can', 'qat', 'B-m4');
reg('sui', 'can', 'B-m5'); reg('bih', 'qat', 'B-m6');
// Group C — default
reg('bra', 'mar', 'C-m1'); reg('hai', 'sco', 'C-m2');
reg('bra', 'hai', 'C-m3'); reg('mar', 'sco', 'C-m4');
reg('bra', 'sco', 'C-m5'); reg('mar', 'hai', 'C-m6');
// Group D — default
reg('usa', 'par', 'D-m1'); reg('aus', 'tur', 'D-m2');
reg('usa', 'aus', 'D-m3'); reg('par', 'tur', 'D-m4');
reg('usa', 'tur', 'D-m5'); reg('par', 'aus', 'D-m6');
// Group E — custom fixtures
reg('ger', 'cur', 'E-m1'); reg('civ', 'ecu', 'E-m2');
reg('ger', 'civ', 'E-m3'); reg('ecu', 'cur', 'E-m4');
reg('ecu', 'ger', 'E-m5'); reg('cur', 'civ', 'E-m6');
// Group F — default
reg('ned', 'jpn', 'F-m1'); reg('swe', 'tun', 'F-m2');
reg('ned', 'swe', 'F-m3'); reg('jpn', 'tun', 'F-m4');
reg('ned', 'tun', 'F-m5'); reg('jpn', 'swe', 'F-m6');
// Group G — default
reg('bel', 'egy', 'G-m1'); reg('irn', 'nzl', 'G-m2');
reg('bel', 'irn', 'G-m3'); reg('egy', 'nzl', 'G-m4');
reg('bel', 'nzl', 'G-m5'); reg('egy', 'irn', 'G-m6');
// Group H — default
reg('esp', 'cpv', 'H-m1'); reg('ksa', 'uru', 'H-m2');
reg('esp', 'ksa', 'H-m3'); reg('cpv', 'uru', 'H-m4');
reg('esp', 'uru', 'H-m5'); reg('cpv', 'ksa', 'H-m6');
// Group I — default
reg('fra', 'sen', 'I-m1'); reg('irq', 'nor', 'I-m2');
reg('fra', 'irq', 'I-m3'); reg('sen', 'nor', 'I-m4');
reg('fra', 'nor', 'I-m5'); reg('sen', 'irq', 'I-m6');
// Group J — default
reg('arg', 'alg', 'J-m1'); reg('aut', 'jor', 'J-m2');
reg('arg', 'aut', 'J-m3'); reg('alg', 'jor', 'J-m4');
reg('arg', 'jor', 'J-m5'); reg('alg', 'aut', 'J-m6');
// Group K — default
reg('por', 'cod', 'K-m1'); reg('uzb', 'col', 'K-m2');
reg('por', 'uzb', 'K-m3'); reg('cod', 'col', 'K-m4');
reg('por', 'col', 'K-m5'); reg('cod', 'uzb', 'K-m6');
// Group L — default
reg('eng', 'cro', 'L-m1'); reg('gha', 'pan', 'L-m2');
reg('eng', 'gha', 'L-m3'); reg('cro', 'pan', 'L-m4');
reg('eng', 'pan', 'L-m5'); reg('cro', 'gha', 'L-m6');

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const r = await fetch(
      'https://sports.bzzoiro.com/api/matches/?date_from=2026-06-11&date_to=2026-07-19&page_size=200',
      { headers: { Authorization: `Token ${BSD_TOKEN}` } },
    );
    if (!r.ok) throw new Error(`BSD API ${r.status}`);
    const data = await r.json() as { results: any[] };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const rows: any[] = [];

    for (const m of data.results) {
      if (!WC_TEAMS.has(m.home_team) || !WC_TEAMS.has(m.away_team)) continue;
      if (m.home_score === null || m.away_score === null) continue;

      const homeId = TEAM_ID[m.home_team];
      const awayId = TEAM_ID[m.away_team];
      if (!homeId || !awayId) continue;

      const entry = MATCH_LOOKUP[`${homeId}-${awayId}`];
      if (!entry) continue;

      const { matchId, reversed } = entry;
      rows.push({
        match_id: matchId,
        home_score: reversed ? m.away_score : m.home_score,
        away_score: reversed ? m.home_score : m.away_score,
        status: m.status,
        updated_at: new Date().toISOString(),
      });
    }

    if (rows.length > 0) {
      await supabase.from('match_results').upsert(rows);
    }

    return res.status(200).json({ updated: rows.length, results: rows });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
