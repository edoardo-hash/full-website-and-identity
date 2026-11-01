import { hasDb, q } from "@/lib/db";

/**
 * Live figures for the company site (Edo, 1 Nov 2026). Same SQL as the company site's api/stats.js: that project has
 * no database of its own, so it reads these figures from here (STATS_SOURCE_URL). Public, aggregate counts only.
 */
export const revalidate = 86400;

const SQL = `
select
  (select count(*) from invenio.portal_user where not discontinued and status in ('active','approvedwn'))::int as users,
  (select count(*) from invenio.villa where published or unpublished_at >= make_date(extract(year from now() - interval '2 months')::int, 3, 1))::int as villas,
  (select count(*) from invenio.portal_user
     where not discontinued and status in ('active','approvedwn') and role ilike '%AGENT%'
       and coalesce(is_internal, false) = false)::int as agents`;

export async function GET() {
  if (!hasDb()) return Response.json({ ok: false, error: "No database connected" }, { status: 503 });
  try {
    const [row] = await q<{ users: number; villas: number; agents: number }>(SQL);
    if (!row || !row.users || !row.villas) return Response.json({ ok: false, error: "No data" }, { status: 503 });
    return Response.json({ ok: true, ...row, at: new Date().toISOString() }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
    });
  } catch (e) {
    console.error("stats:", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: "Database unavailable" }, { status: 503 });
  }
}
