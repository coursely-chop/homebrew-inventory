/**
 * Pinged once a day by Vercel Cron (see vercel.json) purely to generate
 * real Supabase activity — the free tier auto-pauses a project after 7
 * days with no activity, which this app would otherwise hit easily since
 * it's only actually used in bursts (brew days).
 *
 * Writes (not just reads) a timestamp into its own row, separate from the
 * "main" row api/data.ts owns — two reasons: a write is a more
 * unambiguous activity signal than a plain read for whatever heuristic
 * decides a project is "unused," and it leaves a durable, queryable
 * record of the last successful ping. That second part matters because
 * Vercel's own cron-execution logs are only retained for an hour on the
 * Hobby plan — without this, there'd be no way to confirm after the fact
 * whether the cron actually ran. Each response reports the *previous*
 * stored timestamp (read before this call overwrites it) alongside the
 * new one, so a single manual check can answer "has this actually been
 * firing on its own" without that check being its own only evidence.
 *
 * Verifies the request actually came from Vercel's scheduler (which sends
 * `Authorization: Bearer $CRON_SECRET` on cron-triggered invocations) —
 * not because this data is sensitive, but so a random GET from outside
 * can't needlessly spend Supabase's request quota.
 */

const ROW_ID = "keepalive";

function isAuthorized(req: any): boolean {
  const auth = req.headers.authorization;
  return typeof auth === "string" && auth === `Bearer ${process.env.CRON_SECRET}`;
}

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export default async function handler(req: any, res: any) {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const baseUrl = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SECRET_KEY as string;
  const now = new Date().toISOString();

  try {
    const getResp = await fetch(`${baseUrl}/rest/v1/app_data?id=eq.${ROW_ID}&select=data,updated_at`, {
      headers: supabaseHeaders(key),
    });
    const rows = getResp.ok ? ((await getResp.json()) as { data: { pingedAt?: string }; updated_at: string }[]) : [];
    const previousPingedAt = rows[0]?.data?.pingedAt ?? null;

    const postResp = await fetch(`${baseUrl}/rest/v1/app_data`, {
      method: "POST",
      headers: { ...supabaseHeaders(key), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([{ id: ROW_ID, data: { pingedAt: now }, updated_at: now }]),
    });

    res.status(200).json({ ok: postResp.ok, pingedAt: now, previousPingedAt });
  } catch {
    // Doesn't matter why it failed — there's nothing to retry or alert on.
    // Tomorrow's ping tries again regardless.
    res.status(200).json({ ok: false, pingedAt: now, previousPingedAt: null });
  }
}
