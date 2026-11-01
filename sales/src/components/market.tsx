import Link from "next/link";
import type { Listing } from "@/lib/data";
import { casafariEnabled, marketCheck } from "@/lib/casafari";
import { eur } from "@/lib/rules";

/**
 * "Market check" panel on a listing (portal admins only). Runs Casafari only when asked (?market=1), because each
 * check costs 25 tokens; nothing is stored. Shows Casafari's price range and the comparables, with the ones that look
 * like the same villa (marketed by other agencies) first.
 */
export async function MarketPanel({ listing, run, sp }: { listing: Listing; run: boolean; sp: Record<string, string | undefined> }) {
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "market" && v !== undefined) as [string, string][]);
  const runHref = `?${new URLSearchParams([...qs, ["market", "1"]]).toString()}#mk-h`;
  const head = (
    <div className="ph2">
      <h2 id="mk-h">Market check</h2>
      <span className="small">Casafari · staff only</span>
    </div>
  );
  if (!casafariEnabled()) {
    return <section className="panel" aria-labelledby="mk-h">{head}<p className="small" style={{ padding: "12px 22px 18px" }}>Casafari is not connected on this site (CASAFARI_API_KEY).</p></section>;
  }
  if (!run) {
    return (
      <section className="panel" aria-labelledby="mk-h">
        {head}
        <div className="pb stack" style={{ gap: 10, paddingTop: 14 }}>
          <p className="small" style={{ lineHeight: 1.5 }}>Is this villa marketed by other agencies, and at what price? Casafari&apos;s estimate from asking prices nearby. Uses 25 Casafari tokens; nothing is saved.</p>
          <div><Link className="btn sm solid" href={runHref}>Run market check</Link></div>
        </div>
      </section>
    );
  }

  const res = await marketCheck(listing);
  if (!res.ok) return <section className="panel" aria-labelledby="mk-h">{head}<p className="small" style={{ padding: "12px 22px 18px" }}>{res.message}</p></section>;
  const m = res.data;
  const ours = listing.askingPrice;
  const diff = ours && m.fairPrice ? Math.round(((ours - m.fairPrice) / m.fairPrice) * 100) : null;
  const same = m.comps.filter((c) => c.same);

  return (
    <section className="panel" aria-labelledby="mk-h">
      {head}
      <div className="pb">
        <div className="kv"><span>Casafari fair price</span><span>{m.fairPrice ? eur(Math.round(m.fairPrice)) : "—"}{diff !== null ? ` · ours is ${diff > 0 ? `${diff}% above` : diff < 0 ? `${-diff}% below` : "in line"}` : ""}</span></div>
        <div className="kv"><span>Range</span><span>{m.fastSellPrice ? eur(Math.round(m.fastSellPrice)) : "—"} (fast sale) – {m.outOfMarketPrice ? eur(Math.round(m.outOfMarketPrice)) : "—"}</span></div>
        <div className="kv"><span>Comparables</span><span>{m.comps.length}{m.comps.length < 4 ? " · too few for a reliable estimate" : ""}{m.avgDaysOnMarket ? ` · ${Math.round(m.avgDaysOnMarket)} days on market on average` : ""}</span></div>
        <div className="kv"><span>Same villa elsewhere</span><span>{same.length ? <b style={{ fontWeight: 500 }}>{same.length} candidate{same.length > 1 ? "s" : ""} below — please confirm</b> : "None found"}</span></div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {m.comps.map((c) => (
            <li key={c.id} className="kv" style={{ flexDirection: "column", gap: 3, alignItems: "stretch" }}>
              <span className="inline" style={{ justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: "var(--ink)" }}>
                  {c.same ? <span className={`st ${c.same === "probably" ? "warn" : "neu"}`} style={{ marginRight: 8 }}>{c.same === "probably" ? "Probably ours" : "Possibly ours"}</span> : null}
                  {c.price ? eur(c.price) : "Price on request"} · {c.bedrooms ?? "?"} bed · {c.builtM2 ?? "?"} / {c.plotM2 ?? "?"} m²
                </span>
                <a className="small" href={c.url} target="_blank" rel="noreferrer">Casafari ↗</a>
              </span>
              <span className="small">
                {c.area} · {c.km} km · {c.status}
                {c.daysOnMarket !== null ? ` · ${c.daysOnMarket} days on market` : ""}
                {c.activeListings ? ` · ${c.activeListings} active listing${c.activeListings > 1 ? "s" : ""}` : ""}
                {c.lastChange ? ` · ${eur(c.lastChange.from)} → ${eur(c.lastChange.to)} on ${c.lastChange.date}` : ""}
              </span>
              {c.agencies.length ? <span className="small">{c.agencies.slice(0, 8).join(", ")}{c.agencies.length > 8 ? ` +${c.agencies.length - 8}` : ""}</span> : null}
            </li>
          ))}
        </ol>
        <p className="small" style={{ padding: "10px 0 4px", lineHeight: 1.5 }}>
          Asking prices, not sale prices. Searched {m.usedAddress ? `around ${listing.area} (by name)` : "around the villa's approximate point"}; the exact location is never sent. &quot;Probably ours&quot; = bedrooms, built area and plot match — check before acting.
        </p>
      </div>
    </section>
  );
}
