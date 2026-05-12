import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, body, url } = req.body as { title: string; body: string; url?: string };
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const { data: rows } = await supabase.from('push_subscriptions').select('user_id, subscription');
  if (!rows?.length) return res.json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url: url ?? '/' });
  let sent = 0;

  for (const row of rows) {
    try {
      await webpush.sendNotification(row.subscription as webpush.PushSubscription, payload);
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('user_id', row.user_id);
      }
    }
  }

  return res.json({ sent });
}
