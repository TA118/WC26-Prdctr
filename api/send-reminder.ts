import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const EMAIL_FROM = process.env.EMAIL_FROM!;
const CRON_SECRET = process.env.CRON_SECRET;
const SITE_URL = 'https://wc26prdctr.vercel.app';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (CRON_SECRET) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const type = req.query.type as string;
  if (type !== 'week' && type !== 'day') {
    return res.status(400).json({ error: 'type must be "week" or "day"' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) return res.status(500).json({ error: authErr.message });

  const { data: profiles } = await supabase.from('profiles').select('id, username');
  const profileMap: Record<string, string> = {};
  profiles?.forEach((p: any) => { profileMap[p.id] = p.username; });

  let sent = 0;
  const errors: string[] = [];

  for (const user of authData.users) {
    if (!user.email) continue;
    const username = profileMap[user.id] ?? 'there';
    const { subject, html } = type === 'week' ? weekEmail(username) : dayEmail(username);

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: EMAIL_FROM, to: user.email, subject, html }),
      });
      if (r.ok) sent++;
      else errors.push(`${user.email}: ${await r.text()}`);
    } catch (e: any) {
      errors.push(`${user.email}: ${e.message}`);
    }
  }

  return res.status(200).json({ sent, errors });
}

function weekEmail(username: string): { subject: string; html: string } {
  return {
    subject: '⚽ The World Cup kicks off in 1 week!',
    html: `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0d1117;color:#e2e8f0;padding:36px;border-radius:14px;">
        <h1 style="color:#60a5fa;font-size:22px;margin-bottom:4px;">⚽ WC 2026 Predictor</h1>
        <hr style="border:none;border-top:1px solid #1e2535;margin:16px 0;" />
        <p style="font-size:17px;margin:0 0 12px;">Hey <strong>${username}</strong>,</p>
        <p style="font-size:16px;line-height:1.7;color:#cbd5e1;margin:0 0 20px;">
          Hope you are excited — the World Cup kicks off in
          <strong style="color:#4ade80;">1 week</strong> from now!<br/>
          Don't forget to insert your World Cup Predictions before the deadline.
        </p>
        <a href="${SITE_URL}/prediction"
           style="display:inline-block;padding:14px 32px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:16px;">
          Make My Predictions →
        </a>
        <p style="margin-top:28px;font-size:12px;color:#475569;">
          Predictions for the Full WC game close on <strong>June 11 at 19:00 UTC</strong> when the first match kicks off.
        </p>
      </div>
    `,
  };
}

function dayEmail(username: string): { subject: string; html: string } {
  return {
    subject: '⚽ Last chance — The World Cup kicks off in 24 hours!',
    html: `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0d1117;color:#e2e8f0;padding:36px;border-radius:14px;">
        <h1 style="color:#60a5fa;font-size:22px;margin-bottom:4px;">⚽ WC 2026 Predictor</h1>
        <hr style="border:none;border-top:1px solid #1e2535;margin:16px 0;" />
        <p style="font-size:17px;margin:0 0 12px;">Hey <strong>${username}</strong>,</p>
        <p style="font-size:16px;line-height:1.7;color:#cbd5e1;margin:0 0 20px;">
          The World Cup kicks off in <strong style="color:#facc15;">24 hours</strong> — this is your last chance to submit your predictions!<br/>
          Once the first match starts, predictions are locked.
        </p>
        <a href="${SITE_URL}/prediction"
           style="display:inline-block;padding:14px 32px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:16px;">
          Make My Predictions →
        </a>
        <p style="margin-top:28px;font-size:12px;color:#475569;">
          Predictions close today at <strong>19:00 UTC</strong> when the first match kicks off.
        </p>
      </div>
    `,
  };
}
