
import { authCheck, makeSupabase, sendToUser } from './_push';

function isComplete(data: any): boolean {
  if (!Array.isArray(data?.groups)) return false;
  return data.groups.every((g: any) =>
    Array.isArray(g?.matches) &&
    g.matches.every((m: any) => m?.homeScore !== null && m?.homeScore !== undefined),
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();
  if (!authCheck(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = makeSupabase();

  const { data: subs } = await supabase.from('push_subscriptions').select('user_id');
  if (!subs?.length) return res.json({ sent: 0 });

  const userIds = subs.map((s: any) => s.user_id);
  const { data: preds } = await supabase
    .from('full_predictions')
    .select('user_id, data')
    .in('user_id', userIds);

  const predMap: Record<string, any> = {};
  for (const p of preds ?? []) predMap[p.user_id] = p.data;

  let sent = 0;
  for (const { user_id } of subs) {
    const data = predMap[user_id];
    // Notify if no predictions at all, or predictions are incomplete
    if (data && isComplete(data)) continue;

    const ok = await sendToUser(supabase, user_id, {
      title: '⚽ Last chance to predict!',
      body: data
        ? 'The World Cup kicks off in 1 hour — your predictions are not complete yet!'
        : 'The World Cup kicks off in 1 hour — you haven\'t submitted your predictions yet!',
      url: '/predict',
    });
    if (ok) sent++;
  }

  return res.json({ sent });
}
