import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export type PushPayload = { title: string; body: string; url: string };

export function makeSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function authCheck(req: any): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers['authorization'] === `Bearer ${secret}`;
}

export async function sendToAll(
  supabase: ReturnType<typeof makeSupabase>,
  payload: PushPayload,
): Promise<number> {
  const { data: rows } = await supabase.from('push_subscriptions').select('user_id, subscription');
  if (!rows?.length) return 0;
  const body = JSON.stringify(payload);
  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(row.subscription as webpush.PushSubscription, body);
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('user_id', row.user_id);
      }
    }
  }
  return sent;
}

export async function sendToUser(
  supabase: ReturnType<typeof makeSupabase>,
  userId: string,
  payload: PushPayload,
): Promise<boolean> {
  const { data: row } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .maybeSingle();
  if (!row) return false;
  try {
    await webpush.sendNotification(row.subscription as webpush.PushSubscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    }
    return false;
  }
}
