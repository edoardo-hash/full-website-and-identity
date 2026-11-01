import type { ReactNode } from "react";
import { BRANDS, NON_TOURISTIC_DISCLAIMER } from "@/lib/brand";
import type { OfferRow } from "@/lib/offers";
import { uniqueFeatures } from "@/lib/features";
import type { PhotoGroup } from "@/lib/photo-order";
import "./v2.css";

/**
 * Client offer pages, v2 look (Edo, 1 Nov 2026): the same offer data and rules as /o/<code>, in the editorial design of
 * the v2 company and sales sites. Theme by brand: Invenio Homes (licensed) light, Lila Villas (Non Touristic) dark.
 * White label hides the company name everywhere, as on the current pages. The advisor stays the only contact.
 */
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function longDate(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()];
  return `${wd} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** "4–11 July 2027" (same month) or "28 June – 5 July 2027". */
export function shortRange(from: string, to: string) {
  const a = new Date(from.slice(0, 10) + "T00:00:00Z");
  const b = new Date(to.slice(0, 10) + "T00:00:00Z");
  const m = (d: Date) => MONTHS_LONG[d.getUTCMonth()];
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) return `${a.getUTCDate()}–${b.getUTCDate()} ${m(b)} ${b.getUTCFullYear()}`;
  return `${a.getUTCDate()} ${m(a)} – ${b.getUTCDate()} ${m(b)} ${b.getUTCFullYear()}`;
}
export const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
export const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export function Mark({ offer, className = "" }: { offer: OfferRow; className?: string }) {
  if (offer.white_label) return <span className={`mark mark--plain ${className}`}>Villa selection</span>;
  return <span className={`mark ${className}`}>{BRANDS[offer.brand].label}</span>;
}

export function Shell({ offer, preview, label, back, children }: { offer: OfferRow; preview: boolean; label: string; back?: { href: string; text: string }; children: ReactNode }) {
  return (
    <div className="v2" data-theme={offer.brand === "LV" ? "lv" : "ih"}>
      {preview && <p className="preview">Preview: this visit isn&apos;t counted as an open.</p>}
      <header className="head">
        <div className="wrap">
          <a href={`/o2/${offer.code}${preview ? "?preview=1" : ""}`} aria-label="Back to the selection">
            <Mark offer={offer} />
          </a>
          <span className="label">{label}</span>
          <div className="right">{back && <a className="back" href={back.href}>← {back.text}</a>}</div>
        </div>
      </header>
      {children}
      <footer className="foot">
        <div className="wrap">
          <div>
            <Mark offer={offer} className="mark" />
            <p>Prepared for you by your advisor. To book or ask a question, reply to the advisor who sent you this selection.</p>
          </div>
          <nav aria-label="This selection">
            <a href={`/o2/${offer.code}${preview ? "?preview=1" : ""}`}>The selection</a>
          </nav>
          <div className="legal">
            {offer.brand === "LV" && <span>{NON_TOURISTIC_DISCLAIMER}</span>}
            <span>Availability and prices are subject to confirmation. The exact address is shared once the booking is confirmed.</span>
            {!offer.white_label && <span>© {new Date().getFullYear()} {BRANDS[offer.brand].processingCompany}</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ExpiredV2({ offer }: { offer: OfferRow }) {
  return (
    <Shell offer={offer} preview={false} label="">
      <main className="wrap">
        <div className="expired">
          <h1>This selection has expired</h1>
          <p className="muted">Please ask your advisor for an updated one.</p>
        </div>
      </main>
    </Shell>
  );
}

/**
 * Features in five groups instead of one row of chips (critique, 1 Nov 2026). Internal tags never reach the client
 * (Neighbours, Filming, Private, Events, Weddings: those depend on the owner's answer for each booking).
 */
const GROUPS: [string, RegExp][] = [
  ["Outdoors", /pool|jacuzzi|terrace|garden|lawn|sunlounger|al fresco|outdoor|bbq|barbecue|pizza|tennis|padel|football|basketball|play area|parking|fenced|roof/i],
  ["Indoors", /kitchen|air con|ceiling fan|heating|fireplace|cinema|gym|fitness|bar|wine|tv|music|sound|wifi|wi-fi|office|sauna|steam|library|elevator|lift/i],
  ["Views", /view/i],
  ["Good for", /famil|friend|couple|honeymoon|retreat|group|kids|children/i],
  ["Good to know", /pet|hire car|disabled|accessib|safety|alarm|cctv|staff|concierge|chef|self check|key/i],
];
const INTERNAL = /^(neighbours?|filming|private|events?|weddings?)$/i;
export function featureGroups(features: string[] | null | undefined): [string, string[]][] {
  const out = new Map<string, string[]>(GROUPS.map(([g]) => [g, []]));
  for (const f of uniqueFeatures(features)) {
    if (INTERNAL.test(f.trim())) continue;
    const label = f.length > 3 && f === f.toUpperCase() ? f : f[0].toUpperCase() + f.slice(1).toLowerCase().replace(/\bwifi\b/, "Wi-Fi").replace(/\btv\b/, "TV").replace(/\bbbq\b/, "barbecue");
    const g = GROUPS.find(([, re]) => re.test(f))?.[0] ?? "Good to know";
    out.get(g)!.push(label);
  }
  return [...out.entries()].filter(([, xs]) => xs.length);
}

/** Photo groups under 3 photos go into the nearest group (critique, 1 Nov 2026). */
export function mergeSmallGroups(groups: PhotoGroup[]): PhotoGroup[] {
  const out: PhotoGroup[] = [];
  for (const g of groups) {
    const last = out[out.length - 1];
    if (g.photos.length < 3 && last) {
      last.photos = [...last.photos, ...g.photos];
      if (!last.label.includes("&") && last.photos.length) last.label = `${last.label} & ${g.label.toLowerCase()}`;
    } else out.push({ ...g, photos: [...g.photos] });
  }
  return out;
}
