import { supabase } from './supabase';
import { INITIAL_GROUPS } from '../data/groups';
import type { Group } from '../types';

export interface MatchResult {
  match_id: string;
  home_score: number;
  away_score: number;
  status: string;
  updated_at: string;
}

export async function fetchActualResults(): Promise<MatchResult[]> {
  const { data } = await supabase.from('match_results').select('*');
  return (data as MatchResult[]) ?? [];
}

export function buildActualGroups(results: MatchResult[]): Group[] {
  const resultMap = new Map(results.map(r => [r.match_id, r]));
  return INITIAL_GROUPS.map(g => ({
    ...g,
    matches: g.matches.map(m => {
      const actual = resultMap.get(m.id);
      return actual
        ? { ...m, homeScore: actual.home_score, awayScore: actual.away_score }
        : m;
    }),
  }));
}

// Fetches from Supabase, triggering a sync from the BSD API if data is stale (>5 min old).
export async function syncAndFetchResults(): Promise<{ results: MatchResult[]; actualGroups: Group[] }> {
  const { data: latest } = await supabase
    .from('match_results')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const stale = !latest || Date.now() - new Date(latest.updated_at).getTime() > 5 * 60 * 1000;

  if (stale) {
    try { await fetch('/api/sync-results'); } catch { /* use cached data */ }
  }

  const results = await fetchActualResults();
  return { results, actualGroups: buildActualGroups(results) };
}
