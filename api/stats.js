import { neon } from "@neondatabase/serverless";

/**
 * Live figures for the home page and the Owners page (Edo, 1 Nov 2026: "pull real numbers from the database").
 * Read from the portal database (DATABASE_URL, the same Neon as the sales site), whose `invenio` schema is the nightly
 * IMpulse data replicated from the netcup server. Cached by Vercel for a day; the pages keep the figures written in
 * their HTML when this answers nothing.
 *
 * - users: approved accounts still open (agents, owners, partners) — portal_user status active / approved.
 * - villas: every villa published at some point in the season, March to September (Edo, 1 Nov 2026), every
 *   destination: published now, or unpublished on or after 1 March. The season is the current year's from March,
 *   the previous year's in January and February. (The publish history only starts in Oct 2026, so a villa first
 *   published after September counts too: very few.)
 * - "51 offers a day" is NOT here: it is written in the page (offers March–September 2026 = 10,833 / 214 days, from
 *   the IMpulse offers export of 2 Oct 2026; the nightly import keeps only recent offers). Update it by hand each season.
 * - agents: approved external agents (Owners page).
 */
const SQL = `
select
  (select count(*) from invenio.portal_user where not discontinued and status in ('active','approvedwn'))::int as users,
  (select count(*) from invenio.villa where published or unpublished_at >= make_date(extract(year from now() - interval '2 months')::int, 3, 1))::int as villas,
  (select count(*) from invenio.portal_user
     where not discontinued and status in ('active','approvedwn') and role ilike '%AGENT%'
       and coalesce(is_internal, false) = false)::int as agents`;

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, error: "No database connected" });
  try {
    const [row] = await neon(process.env.DATABASE_URL)(SQL);
    // Never show a broken figure: a zero means the data is missing, not that we have no villas.
    if (!row || !row.users || !row.villas) return res.status(503).json({ ok: false, error: "No data" });
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
    return res.status(200).json({ ok: true, ...row, at: new Date().toISOString() });
  } catch (e) {
    console.error("stats:", e instanceof Error ? e.message : e);
    return res.status(503).json({ ok: false, error: "Database unavailable" });
  }
}
