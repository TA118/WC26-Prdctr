import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authCheck, makeSupabase, sendToUser } from './_push';
import { MATCH_TEAMS } from './_data';

// Returns list of match_ids where user's predicted score exactly matches actual
function findPerfectMatches(
  predGroups: any[],
  results: Record<string, { home: number; away: number }>,
): string[] {
  const perfect: string[] = [];
  for (const g of predGroups) {
    if (!Array.isArray(g?.matches)) continue;
    for (const m of g.matches) {
      if (!m?.id || m.homeScore === null || m.homeScore === undefined) continue;
      const actual = results[m.id];
      if (!actual) continue;
      if (m.homeScore === actual.home && m.awayScore === actual.away) {
        perfect.push(m.id);
      }
    }
  }
  return perfect;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();
  if (!authCheck(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = makeSupabase();

  // Load all completed match results
  const { data: resultRows } = await supabase
    .from('match_results')
    .select('match_id, home_score, away_score')
    .not('home_score', 'is', null);

  if (!resultRows?.length) return res.json({ sent: 0 });

  const results: Record<string, { home: number; away: number }> = {};
  for (const r of resultRows) {
    results[r.match_id] = { home: r.home_score, away: r.away_score };
  }

  // Get subscribed users
  const { data: subs } = await supabase.from('push_subscriptions').select('user_id');
  if (!subs?.length) return res.json({ sent: 0 });
  const userIds = subs.map((s: any) => s.user_id);

  // Fetch live and full predictions for all subscribed users
  const [{ data: livePreds }, { data: fullPreds }] = await Promise.all([
    supabase.from('live_predictions').select('user_id, data').in('user_id', userIds),
    supabase.from('full_predictions').select('user_id, data').in('user_id', userIds),
  ]);

  // Already-notified pairs
  const { data: alreadyNotified } = await supabase
    .from('notified_perfect_predictions')
    .select('user_id, match_id')
    .in('user_id', userIds);

  const notifiedSet = new Set<string>();
  for (const n of alreadyNotified ?? []) notifiedSet.add(`${n.user_id}:${n.match_id}`);

  const liveMap: Record<string, any> = {};
  for (const p of livePreds ?? []) liveMap[p.user_id] = p.data;

  const fullMap: Record<string, any> = {};
  for (const p of fullPreds ?? []) fullMap[p.user_id] = p.data;

  let sent = 0;
  const toRecord: { user_id: string; match_id: string }[] = [];

  for (const { user_id } of subs) {
    // Collect perfect predictions from both modes, deduped by match_id
    const perfectSet = new Set<string>();

    const liveGroups = liveMap[user_id]?.groups;
    if (Array.isArray(liveGroups)) {
      for (const id of findPerfectMatches(liveGroups, results)) perfectSet.add(id);
    }

    const fullGroups = fullMap[user_id]?.groups;
    if (Array.isArray(fullGroups)) {
      for (const id of findPerfectMatches(fullGroups, results)) perfectSet.add(id);
    }

    for (const matchId of perfectSet) {
      const key = `${user_id}:${matchId}`;
      if (notifiedSet.has(key)) continue; // already sent

      const teams = MATCH_TEAMS[matchId];
      const actual = results[matchId];
      if (!teams || !actual) continue;

      const scoreStr = `${actual.home}-${actual.away}`;
      const ok = await sendToUser(supabase, user_id, {
        title: '🎯 Perfect prediction!',
        body: `Amazing, you nailed the prediction for ${scoreStr} between ${teams.home} and ${teams.away}!`,
        url: '/live',
      });

      if (ok) {
        sent++;
        toRecord.push({ user_id, match_id: matchId });
        notifiedSet.add(key);
      }
    }
  }

  if (toRecord.length) {
    await supabase.from('notified_perfect_predictions').insert(toRecord);
  }

  return res.json({ sent });
}
