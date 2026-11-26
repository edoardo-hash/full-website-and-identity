import { hasDb, q } from "@/lib/db";

/**
 * Which of the company site's featured villas may be shown (Edo, 26 Nov 2026: "all villas appearing there are published
 * and have API ON"; later the same day: "have all been published in the last 180 days"): the "API" switch on
 * (`invenio.villa.api_enabled`) AND published now or unpublished less than 180 days ago (`unpublished_at`). Answers only yes / no
 * per id; ids that aren't villas are simply "no". Public, no villa data.
 */
export const revalidate = 3600;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const ids = [...new Set((new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter((s) => UUID.test(s)))].slice(0, 20);
  if (!ids.length) return Response.json({ ok: false, error: "No ids" }, { status: 400 });
  if (!hasDb()) return Response.json({ ok: false, error: "No database connected" }, { status: 503 });
  try {
    const rows = await q<{ id: string; show: boolean }>(
      `select bp_uuid::text as id, (coalesce(api_enabled, false) and (coalesce(published, false) or unpublished_at > now() - interval '180 days')) as show
         from invenio.villa where bp_uuid::text = any($1::text[])`,
      [ids],
    );
    const show: Record<string, boolean> = Object.fromEntries(ids.map((id) => [id, false]));
    for (const r of rows) show[r.id] = !!r.show;
    return Response.json({ ok: true, show }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" } });
  } catch (e) {
    console.error("villa-status:", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: "Database unavailable" }, { status: 503 });
  }
}
