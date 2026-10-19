/**
 * Pinged once a day by Vercel Cron (see vercel.json) purely to generate
 * real Supabase API traffic — the free tier auto-pauses a project after 7
 * days with no activity, which this app would otherwise hit easily since
 * it's only actually used in bursts (brew days). A cheap read against the
 * same row api/data.ts serves is enough; nothing here needs to succeed in
 * any interesting way, it just needs to happen regularly.
 *
 * Verifies the request actually came from Vercel's scheduler (which sends
 * `Authorization: Bearer $CRON_SECRET` on cron-triggered invocations) —
 * not because this data is sensitive, but so a random GET from outside
 * can't needlessly spend Supabase's request quota.
 */

const ROW_ID = "main";

function isAuthorized(req: any): boolean {
  const auth = req.headers.authorization;
  return typeof auth === "string" && auth === `Bearer ${process.env.CRON_SECRET}`;
}

export default async function handler(req: any, res: any) {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const baseUrl = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SECRET_KEY as string;

  try {
    const resp = await fetch(`${baseUrl}/rest/v1/app_data?id=eq.${ROW_ID}&select=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    res.status(200).json({ ok: resp.ok, pingedAt: new Date().toISOString() });
  } catch {
    // Doesn't matter why it failed — there's nothing to retry or alert on.
    // Tomorrow's ping tries again regardless.
    res.status(200).json({ ok: false, pingedAt: new Date().toISOString() });
  }
}
