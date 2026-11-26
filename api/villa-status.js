/**
 * Which featured villas may be shown on the company site (Edo, 26 Nov 2026): published AND "API" on in IMpulse.
 * This project has no database, so it asks the sales site (sales/src/app/api/villa-status), like api/stats.js.
 * VILLA_STATUS_URL overrides the address. When the answer can't be had, nothing is hidden (the pages keep working).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  const ids = String(req.query.ids || "").split(",").filter((s) => UUID.test(s)).slice(0, 20);
  if (!ids.length) return res.status(400).json({ ok: false, error: "No ids" });
  const base = process.env.VILLA_STATUS_URL || "https://invenio-website-sales.vercel.app/api/villa-status";
  try {
    const r = await fetch(`${base}?ids=${ids.join(",")}`, { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    if (!r.ok || !j.ok) return res.status(503).json({ ok: false, error: "No data" });
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
    return res.status(200).json({ ok: true, show: j.show });
  } catch (e) {
    console.error("villa-status source:", e instanceof Error ? e.message : e);
    return res.status(503).json({ ok: false, error: "Source unavailable" });
  }
}
