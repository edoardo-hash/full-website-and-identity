/**
 * Sales rules, copied and adapted from invenio-portal src/lib/sales/rules.ts (30 Oct 2026). Kept in step by hand.
 */
export type SaleStatus = "draft" | "review" | "approved" | "under_offer" | "sold" | "withdrawn";
export type Tone = "neu" | "warn" | "ok" | "acc" | "bad";

import { FEATURE_GROUPS, FEATURE_LABELS, FEATURES, type FeatureGroup, type FeatureSet } from "./features";

export const SALE_STATUSES: { key: SaleStatus; label: string; tone: Tone }[] = [
  { key: "draft", label: "Draft", tone: "neu" },
  { key: "review", label: "Waiting for approval", tone: "warn" },
  { key: "approved", label: "Approved, for sale", tone: "ok" },
  { key: "under_offer", label: "Under offer", tone: "acc" },
  { key: "sold", label: "Sold", tone: "neu" },
  { key: "withdrawn", label: "Withdrawn", tone: "bad" },
];
export const saleStatus = (s: string) => SALE_STATUSES.find((x) => x.key === s) ?? { key: s as SaleStatus, label: s, tone: "neu" as Tone };

export type RequestStatus = "new" | "qualified" | "shortlist" | "viewing" | "offer" | "arras" | "completed" | "lost" | "dormant";
export const REQUEST_STATUSES: { key: RequestStatus; label: string; open: boolean }[] = [
  { key: "new", label: "New request", open: true },
  { key: "qualified", label: "Qualified", open: true },
  { key: "shortlist", label: "Shortlist sent", open: true },
  { key: "viewing", label: "Viewing", open: true },
  { key: "offer", label: "Offer", open: true },
  { key: "arras", label: "Arras signed", open: true },
  { key: "completed", label: "Completed", open: false },
  { key: "lost", label: "Lost", open: false },
  { key: "dormant", label: "Dormant", open: false },
];
export const requestStatusLabel = (s: string) => REQUEST_STATUSES.find((x) => x.key === s)?.label ?? s;
export const isRequestStatus = (s: string): s is RequestStatus => REQUEST_STATUSES.some((x) => x.key === s);

export const REQUEST_SOURCES: Record<string, string> = {
  direct: "Direct",
  collaborator: "Via collaborator",
  website: "Website",
  idealista: "Idealista",
  rental_guest: "Rental guest",
  other: "Other",
};

export interface MatchFields {
  area: string;
  district: string;
  bedrooms: number;
  licence: string | null;
  plotM2: number | null;
  /** Sale features from the portal (yes = present). */
  saleFeatures: FeatureSet;
}

export const isLicensed = (licence: string | null) => !!licence && licence.length >= 4;

/**
 * What a buyer can ask for: the tourist licence (from the licence field, never a feature), a big plot, and every item of
 * the sale features catalog (same as the portal's MUST_HAVES). A listing without one ranks lower, never drops out.
 */
export type MustHaveGroup = FeatureGroup | "licence_land";
export const MUST_HAVES: { key: string; group: MustHaveGroup; match: (v: MatchFields) => boolean }[] = [
  { key: "licence", group: "licence_land", match: (v) => isLicensed(v.licence) },
  { key: "land", group: "licence_land", match: (v) => (v.plotM2 ?? 0) >= 5000 },
  ...FEATURES.map((f) => ({ key: f.key, group: f.group as MustHaveGroup, match: (v: MatchFields) => v.saleFeatures.has(f.key) })),
];
/** Must-haves saved by the old version of the brief, still read on older requests. */
const LEGACY: Record<string, { label: string; match: (v: MatchFields) => boolean }> = {
  privacy: { label: "Privacy", match: (v) => v.saleFeatures.has("gated") || v.saleFeatures.has("fenced") },
};
export const MUST_HAVE_LABELS: Record<string, string> = { licence: "Tourist licence", land: "Big plot or land", ...FEATURE_LABELS };
export const mustHaveLabel = (k: string) => MUST_HAVE_LABELS[k] ?? LEGACY[k]?.label ?? k;
const mustHaveMatch = (k: string, v: MatchFields) => (MUST_HAVES.find((m) => m.key === k)?.match ?? LEGACY[k]?.match)?.(v) ?? false;
/** The few shown first on the public filters and the brief; the rest sit under their group. */
export const POPULAR_MUST_HAVES = ["licence", "sea_view", "sunset", "pool", "walk_beach", "modern", "finca", "land"];
export const MUST_HAVE_GROUPS: MustHaveGroup[] = ["licence_land", ...FEATURE_GROUPS];

/** The due-diligence items David needs before approving ("publish" gate); the "offer" gate has 25 more. */
export const PUBLISH_KEYS = [
  "nota_simple", "escritura", "registered_m2", "ownership", "charges",
  "legal_illegal", "sanctions", "protected_land",
  "licence_copy", "consell_cert", "licence_guests", "licence_transferable", "licence_layout",
  "disputes", "mandate",
];
export const OFFER_TOTAL = 25;

export const PRICE_TOLERANCE = 0.1;

export interface MatchListing extends MatchFields {
  status: string;
  askingPrice: number | null;
  priceOnRequest: boolean;
  legalBedrooms: number | null;
}
export interface MatchBrief {
  budgetMin: number | null;
  budgetMax: number | null;
  areas: string[];
  minBedrooms: number | null;
  mustHaves: string[];
  licenceNeeded: boolean;
}

/** Same logic as the portal: price and bedrooms filter; area and must-haves rank. Best first. */
export function matchRequest<T extends MatchListing>(r: MatchBrief, listings: T[]): { listing: T; score: number; reasons: string[] }[] {
  const out: { listing: T; score: number; reasons: string[]; live: boolean }[] = [];
  for (const v of listings) {
    if (v.status === "sold" || v.status === "withdrawn") continue;
    const reasons: string[] = [];
    let score = 0;
    if (v.askingPrice !== null) {
      if (r.budgetMax !== null && v.askingPrice > r.budgetMax * (1 + PRICE_TOLERANCE)) continue;
      if (r.budgetMin !== null && v.askingPrice < r.budgetMin * 0.5) continue;
      if (r.budgetMax !== null && v.askingPrice > r.budgetMax) reasons.push(`${Math.ceil((v.askingPrice / r.budgetMax - 1) * 100 - 1e-9)}% over budget`);
      else reasons.push("within budget");
      score += 2;
    } else if (v.priceOnRequest) {
      reasons.push("price on request");
      score += 1;
    } else continue;
    const beds = v.legalBedrooms ?? v.bedrooms;
    if (r.minBedrooms !== null) {
      if (beds < r.minBedrooms) continue;
      score += 1;
    }
    if (r.licenceNeeded && !isLicensed(v.licence)) continue;
    if (r.areas.length) {
      if (r.areas.includes(v.area)) { score += 3; reasons.push(`in ${v.area}`); }
      else if (r.areas.includes(v.district)) { score += 2; reasons.push(`in ${v.district}`); }
      else { score -= 1; reasons.push("outside their areas"); }
    }
    const hits = r.mustHaves.filter((k) => mustHaveMatch(k, v));
    score += hits.length * 1.5 - (r.mustHaves.length - hits.length) * 0.5;
    if (hits.length) reasons.push(`has ${hits.map(mustHaveLabel).join(", ").toLowerCase()}`);
    out.push({ listing: v, score, reasons, live: v.status === "approved" || v.status === "under_offer" });
  }
  return out.sort((a, b) => Number(b.live) - Number(a.live) || b.score - a.score);
}

export const eur = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `€${Math.round(n).toLocaleString("en-GB")}`);
export const eurShort = (n: number | null) => (n === null ? "?" : n >= 1e6 ? `€${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M` : `€${Math.round(n / 1e3)}k`);
export const day = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });
};

/** Activity bodies this app writes for the steps the CRM has no table for yet (mandate clause 7). */
export const OWNER_ASKED = "Owner confirmation requested: ";
export const OWNER_CONFIRMED = "Owner confirmed buyer: ";
export const VIEWING_PROPOSED = "Viewing proposed: ";
export const VIEWING_CONFIRMED = "Viewing confirmed by the owner: ";
