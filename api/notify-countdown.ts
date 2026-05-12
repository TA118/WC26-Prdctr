import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authCheck, makeSupabase, sendToAll } from './_push';

const WC_START = new Date('2026-06-11T19:00:00Z');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();
  if (!authCheck(req)) return res.status(401).json({ error: 'Unauthorized' });

  const now = new Date();
  if (now >= WC_START) return res.json({ skipped: 'World Cup has already started' });

  const msLeft = WC_START.getTime() - now.getTime();
  const weeksLeft = Math.ceil(msLeft / (7 * 24 * 60 * 60 * 1000));

  const supabase = makeSupabase();
  const sent = await sendToAll(supabase, {
    title: `⚽ ${weeksLeft} week${weeksLeft === 1 ? '' : 's'} to go!`,
    body: `The World Cup begins in ${weeksLeft} week${weeksLeft === 1 ? '' : 's'}. Don't forget to complete your predictions!`,
    url: '/predict',
  });

  return res.json({ sent, weeksLeft });
}
