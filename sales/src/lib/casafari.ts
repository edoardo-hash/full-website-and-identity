import "server-only";
import { q } from "./db";
import type { Listing } from "./data";

/**
 * Casafari market check (Edo, 30 Oct 2026). Read-only enrichment for staff: Casafari's fair-price estimate for a
 * listing and, above all, whether the same villa is marketed by other agencies (price, agencies, days on market).
 *
 * - The key lives only in CASAFARI_API_KEY (Vercel, server-side). Never sent to the browser.
 * - Only the villa's APPROXIMATE point (snapshot approxGps) is sent, never the exact GPS; without one, the area name.
 * - Nothing is stored: Casafari's terms don't allow keeping their data or showing it to third parties without a
 *   custom agreement, so the check runs on demand (25 tokens a call) and is shown to portal admins only.
 */
const URL = "https://platform.casafari.com/v1/comparables/search";
export const casafariEnabled = () => !!process.env.CASAFARI_API_KEY;

export interface MarketComp {
  id: number;
  url: string;
  price: number | null;
  bedrooms: number | null;
  builtM2: number | null;
  plotM2: number | null;
  area: string;
  km: number;
  status: string;
  daysOnMarket: number | null;
  activeListings: number;
  priceChangePct: number;
  lastChange: { date: string; from: number; to: number } | null;
  agencies: string[];
  title: string;
  /** "probably" / "possibly" the same villa as ours (see sameVilla), else null. */
  same: "probably" | "possibly" | null;
}

export interface MarketCheck {
  fairPrice: number | null;
  fastSellPrice: number | null;
  outOfMarketPrice: number | null;
  avgDaysOnMarket: number | null;
  soldLast6Months: number | null;
  comps: MarketComp[];
  usedAddress: boolean;
}

type Raw = {
  results?: {
    property_id: number;
    property_url: string;
    sale_price: number | null;
    bedrooms: number | null;
    total_area: number | null;
    living_area: number | null;
    plot_area: number | null;
    location?: { name?: string };
    distance: number;
    sale_status: string;
    sale_time_on_market?: { days_on_market?: number } | null;
    sale_active_listings_count?: number;
    total_sale_price_change?: number;
    sale_price_last_change?: { change_date: string; old_value: number; new_value: number } | null;
    listing_urls?: string[];
    title?: string;
  }[];
  statistics?: { average_time_on_the_market?: number; sold_or_rented_in_last_six_months?: number };
  estimated_prices?: { fair_market_price?: number; fast_sell_price?: number; out_of_market_price?: number };
};

const near = (a: number | null | undefined, b: number | null | undefined, tol: number) =>
  !!a && !!b && Math.abs(a - b) / Math.max(a, b) <= tol;

/**
 * Same villa? Bedrooms within 1 and built area within 7 % and plot within 12 % → probably; two of the three, or the
 * same asking price within 1.5 km → possibly. Staff confirm it; this only points at candidates.
 */
export function sameVilla(l: Pick<Listing, "bedrooms" | "legalBedrooms" | "builtM2" | "plotM2" | "askingPrice">, c: { bedrooms: number | null; builtM2: number | null; plotM2: number | null; price: number | null; km: number }) {
  const beds = l.legalBedrooms ?? l.bedrooms;
  const bedOk = !!beds && c.bedrooms !== null && Math.abs(beds - c.bedrooms) <= 1;
  const builtOk = near(l.builtM2, c.builtM2, 0.07);
  const plotOk = near(l.plotM2, c.plotM2, 0.12);
  const priceOk = near(l.askingPrice, c.price, 0.005) && c.km <= 1.5;
  if (bedOk && builtOk && plotOk) return "probably" as const;
  if ([bedOk, builtOk, plotOk].filter(Boolean).length >= 2 || priceOk) return "possibly" as const;
  return null;
}

const domain = (u: string) => {
  try {
    return new globalThis.URL(u).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

async function approxPoint(uuid: string): Promise<{ lat: number; lng: number } | null> {
  const rows = await q<{ p: { lat?: unknown; lng?: unknown } | null }>("select data->'approxGps' as p from villa_snapshot where uuid = $1::uuid", [uuid]).catch(() => []);
  const p = rows[0]?.p;
  return p && typeof p.lat === "number" && typeof p.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
}

async function call(body: unknown): Promise<{ ok: true; data: Raw } | { ok: false; status: number; message: string }> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CASAFARI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.ok) return { ok: true, data: (await res.json()) as Raw };
  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, message: text.slice(0, 300) };
}

export async function marketCheck(l: Listing): Promise<{ ok: true; data: MarketCheck } | { ok: false; message: string }> {
  if (!casafariEnabled()) return { ok: false, message: "Casafari is not connected: set CASAFARI_API_KEY on this Vercel project." };
  const base = {
    operation: "sale",
    comparables_types: ["villa", "house", "country_house"],
    comparables_count: 10,
    ...(l.legalBedrooms ?? l.bedrooms ? { bedrooms: l.legalBedrooms ?? l.bedrooms } : {}),
    ...(l.builtM2 ? { total_area: Math.round(l.builtM2) } : {}),
    ...(l.plotM2 ? { plot_area: Math.max(20, Math.round(l.plotM2)) } : {}),
  };
  const byAddress = { ...base, location_boundary: { circle: { distance: 3, target_point: { address: `${l.area}, Ibiza, Spain` } } } };
  const pt = await approxPoint(l.uuid);
  let usedAddress = !pt;
  let r = await call(pt ? { ...base, location_boundary: { circle: { distance: 2, target_point: { coordinates: { latitude: pt.lat, longitude: pt.lng } } } } } : byAddress);
  // Some approximate points fall outside Casafari's permitted region (e.g. at sea): retry once with the area name.
  if (!r.ok && pt && (r.status === 400 || r.status === 422)) {
    usedAddress = true;
    r = await call(byAddress);
  }
  if (!r.ok) {
    const why = r.status === 401 || r.status === 403 ? "the API key was refused" : r.status === 402 ? "no Casafari tokens left (top up in the Casafari console)" : r.status === 429 ? "too many requests, try again in a minute" : `error ${r.status}`;
    return { ok: false, message: `Casafari: ${why}.` };
  }
  const d = r.data;
  const comps: MarketComp[] = (d.results ?? []).map((x) => {
    const c = {
      id: x.property_id,
      url: x.property_url,
      price: x.sale_price || null,
      bedrooms: x.bedrooms ?? null,
      builtM2: x.total_area || x.living_area || null,
      plotM2: x.plot_area || null,
      area: x.location?.name ?? "",
      km: Math.round(x.distance * 100) / 100,
      status: x.sale_status,
      daysOnMarket: x.sale_time_on_market?.days_on_market ?? null,
      activeListings: x.sale_active_listings_count ?? 0,
      priceChangePct: x.total_sale_price_change ?? 0,
      lastChange: x.sale_price_last_change ? { date: x.sale_price_last_change.change_date.slice(0, 10), from: x.sale_price_last_change.old_value, to: x.sale_price_last_change.new_value } : null,
      agencies: [...new Set((x.listing_urls ?? []).map(domain).filter((s): s is string => !!s))],
      title: x.title ?? "",
      same: null as MarketComp["same"],
    };
    c.same = sameVilla(l, c);
    return c;
  });
  comps.sort((a, b) => (a.same === b.same ? 0 : a.same === "probably" ? -1 : b.same === "probably" ? 1 : a.same === "possibly" ? -1 : b.same === "possibly" ? 1 : 0));
  return {
    ok: true,
    data: {
      fairPrice: d.estimated_prices?.fair_market_price ?? null,
      fastSellPrice: d.estimated_prices?.fast_sell_price ?? null,
      outOfMarketPrice: d.estimated_prices?.out_of_market_price ?? null,
      avgDaysOnMarket: d.statistics?.average_time_on_the_market ?? null,
      soldLast6Months: d.statistics?.sold_or_rented_in_last_six_months ?? null,
      comps,
      usedAddress,
    },
  };
}
