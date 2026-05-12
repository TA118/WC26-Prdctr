
import { authCheck, makeSupabase, sendToUser } from './_push';
import { GROUP_SCHEDULE, MATCH_TEAMS } from './_data';

// Find matches kicking off in the window (now+20min, now+30min]
// With a 10-minute cron each match falls in exactly one run's window
function upcomingMatchIds(now: Date): string[] {
  const lo = now.getTime() + 20 * 60 * 1000;
  const hi = now.getTime() + 30 * 60 * 1000;
  return Object.entries(GROUP_SCHEDULE)
    .filter(([, kickoff]) => {
      const t = new Date(kickoff).getTime();
      return t > lo && t <= hi;
    })
    .map(([id]) => id);
}

// Check if a user has made at least one prediction in live_predictions
function hasAnyPrediction(data: any): boolean {
  if (data?.predWinner || data?.goldenBoot) return true;
  if (!Array.isArray(data?.groups)) return false;
  return data.groups.some((g: any) =>
    Array.isArray(g?.matches) &&
    g.matches.some((m: any) => m?.homeScore !== null && m?.homeScore !== undefined),
  );
}

// Check if a specific match has been predicted
function hasPredictedMatch(data: any, matchId: string): boolean {
  if (!Array.isArray(data?.groups)) return false;
  for (const g of data.groups) {
    if (!Array.isArray(g?.matches)) continue;
    const m = g.matches.find((m: any) => m?.id === matchId);
    if (m && m.homeScore !== null && m.homeScore !== undefined) return true;
  }
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();
  if (!authCheck(req)) return res.status(401).json({ error: 'Unauthorized' });

  const now = new Date();
  const matchIds = upcomingMatchIds(now);
  if (!matchIds.length) return res.json({ sent: 0, matches: [] });

  const supabase = makeSupabase();

  // Get all subscribed users
  const { data: subs } = await supabase.from('push_subscriptions').select('user_id');
  if (!subs?.length) return res.json({ sent: 0, matches: matchIds });

  // Get live predictions for all subscribed users in one query
  const userIds = subs.map((s: any) => s.user_id);
  const { data: preds } = await supabase
    .from('live_predictions')
    .select('user_id, data')
    .in('user_id', userIds);

  const predMap: Record<string, any> = {};
  for (const p of preds ?? []) predMap[p.user_id] = p.data;

  let sent = 0;
  for (const matchId of matchIds) {
    const teams = MATCH_TEAMS[matchId];
    if (!teams) continue;

    for (const { user_id } of subs) {
      const data = predMap[user_id];
      if (!data) continue;                        // no live predictions at all
      if (!hasAnyPrediction(data)) continue;      // hasn't started predicting
      if (hasPredictedMatch(data, matchId)) continue; // already predicted this match

      const ok = await sendToUser(supabase, user_id, {
        title: '⏰ Match starting soon!',
        body: `${teams.home} vs ${teams.away} kicks off in 30 minutes — you haven't predicted this one yet!`,
        url: '/live',
      });
      if (ok) sent++;
    }
  }

  return res.json({ sent, matches: matchIds });
}
