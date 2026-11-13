import Link from "next/link";
import { PORTAL_LOGIN_URL } from "@/lib/portal-link";
import { headers } from "next/headers";
import type { Listing } from "@/lib/data";
import type { Dict } from "@/lib/i18n/en";
import { fmt, href, LANG_NAMES, LANGS, type Lang } from "@/lib/i18n";
import { eur } from "@/lib/rules";
import { SiteBehaviour } from "./site-behaviour";

/** The rentals site this one is the sales arm of (the v2 company site while it is on Vercel, inveniohomes.com after). */
export const COMPANY_SITE = process.env.COMPANY_SITE_URL || "https://full-website-and-identity.vercel.app";
export const DAVID = { name: "David Ramiro", email: "david@inveniohomes.com", phone: "+34 671 349 592", tel: "tel:+34671349592" };
export const whatsapp = (text: string) => `https://wa.me/34671349592?text=${encodeURIComponent(text)}`;
/** The general WhatsApp link, with the prefilled message in the visitor's language (it was always English). */
const waGeneral = (t: Dict) => whatsapp(t.home.whatsappText);

export const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
);
export const Icon = {
  mail: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" /><path d="m3 7 9 6 9-6" /></svg>,
  chat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8 8 0 0 1-8.5 8L7 21l1-4.5A8 8 0 1 1 21 11.5z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" /></svg>,
  phone: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>,
  bed: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19v-8m0 4h18v4M3 15V7m18 8v-3a3 3 0 0 0-3-3H9v3" /><circle cx="6.5" cy="10.5" r="1.4" /></svg>,
  bath: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M4 19l-1 2m18-2 1 2" /></svg>,
  built: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 15 6-6 6 6-6 6zM9 9l2 2M12 6l2 2M15 3l2 2M6 12l2 2" /></svg>,
  plot: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16v16H4zM4 10h6v6H4M14 4v6h6" /></svg>,
  licence: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.3 7.8 8 9 4.7-1.2 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  camera: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.4" /></svg>,
  tick: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>,
  lock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
};

export async function SiteHeader({ t, lang, current }: { t: Dict; lang: Lang; current?: "properties" | "sell" }) {
  const path = (await headers()).get("x-path") || "/";
  const items = [
    [href(lang, "/properties"), t.nav.properties, current === "properties"],
    [href(lang, "/sell"), t.nav.sell, current === "sell"],
    [COMPANY_SITE, t.nav.rentals, false],
    [`${href(lang, "/")}#about`, t.nav.about, false],
  ] as const;
  const links = items.map(([h, label, on]) =>
    h.startsWith("http") ? (
      <li key={h}><a href={h} target="_blank" rel="noopener">{label}</a></li>
    ) : (
      <li key={h}><Link href={h} aria-current={on ? "page" : undefined}>{label}</Link></li>
    ),
  );
  const langs = (
    <nav aria-label={t.nav.language} className="langs">
      {LANGS.map((l) => (
        <a key={l} href={href(l, path)} hrefLang={l} lang={l} aria-current={l === lang ? "true" : undefined} title={LANG_NAMES[l]}>{l}</a>
      ))}
    </nav>
  );
  return (
    <>
      <SiteBehaviour />
      <a className="skip-link" href="#main">{t.nav.skip}</a>
      <header className="site-header" data-header>
        <div className="site-header__inner">
          <Link className="brand" href={href(lang, "/")} aria-label={t.nav.homeAria}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand__logo brand__logo--dark" src="/assets/img/invenio-logo.svg" alt="Invenio Homes" width="454" height="111" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand__logo brand__logo--light" src="/assets/img/invenio-logo-light.svg" alt="" aria-hidden="true" width="454" height="111" />
            <span className="brand__rule" aria-hidden="true" />
            <span className="brand__tag">{t.nav.sales}</span>
          </Link>
          <nav className="nav" aria-label="Primary"><ul>{links}</ul></nav>
          <div className="header-actions">
            {langs}
            <a className="header-phone" href={DAVID.tel}>{DAVID.phone}</a>
            {/* A plain link, so the jump to the form on another page always scrolls. */}
            <a className="btn btn--small btn--ghost" href={`${href(lang, "/properties")}#brief`}>{t.nav.sendBrief}</a>
            <button className="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu" data-menu-toggle>
              <span /><span /><span className="sr-only">{t.nav.menu}</span>
            </button>
          </div>
        </div>
      </header>
      <div className="site-menu" id="site-menu" aria-hidden="true">
        <nav className="site-menu__nav" aria-label="Mobile">
          <ul>{links}<li><a href={`${href(lang, "/properties")}#brief`}>{t.nav.sendBrief}</a></li></ul>
          {langs}
        </nav>
        <div className="site-menu__aside">
          <div>
            <p className="eyebrow">{t.home.eyebrow}</p>
            <div className="site-menu__contact">
              <a href={`mailto:${DAVID.email}`}>{DAVID.email}</a>
              <a href={DAVID.tel}>{DAVID.phone}</a>
              <a href={waGeneral(t)} target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </div>
          <div>
            <p className="eyebrow">{t.footer.office}</p>
            <p className="muted" style={{ color: "rgba(246,241,231,.7)", fontSize: 14 }}>Ibiza · Formentera<br />{t.footer.balearics}</p>
          </div>
          <div className="site-menu__socials">
            <a href="https://www.instagram.com/inveniohomes/" target="_blank" rel="noopener">Instagram</a>
            <a href="https://www.linkedin.com/company/invenio-homes/" target="_blank" rel="noopener">LinkedIn</a>
          </div>
        </div>
      </div>
    </>
  );
}

export function SiteFooter({ t, lang }: { t: Dict; lang: Lang }) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <div className="footer-brand__mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="footer-logo footer-logo--light" src="/assets/img/invenio-logo-light.svg" alt="Invenio Homes" width="454" height="111" />
              <span className="brand__tag">{t.nav.sales}</span>
            </div>
            <h2 className="footer-headline">{t.footer.headline}</h2>
            <p className="footer-note">{t.footer.note}</p>
            <div className="footer-contact">
              <a className="footer-address" href="https://www.google.com/maps/search/?api=1&query=C.+San+Lorenzo+y+Molins+de+Rei+12+07840+Santa+Eul%C3%A0ria+des+Riu" target="_blank" rel="noopener">
                <address>C. San Lorenzo y Molins de Rei, 12<br />07840 Santa Eulària des Riu, Ibiza</address>
              </a>
              <a href={`mailto:${DAVID.email}`}>{DAVID.email}</a>
              <a href={DAVID.tel}>{DAVID.phone}</a>
              <a href={waGeneral(t)} target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>{t.footer.sales}</h4>
              <ul>
                <li><Link href={href(lang, "/properties")}>{t.nav.properties}</Link></li>
                <li><Link href={href(lang, "/sell")}>{t.nav.sell}</Link></li>
                <li><a href={`${href(lang, "/properties")}#brief`}>{t.nav.sendBrief}</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t.footer.company}</h4>
              <ul>
                <li><a href={COMPANY_SITE} target="_blank" rel="noopener">{t.footer.villaRentals}</a></li>
                <li><a href={`${COMPANY_SITE}/owners/`} target="_blank" rel="noopener">{t.footer.forOwners}</a></li>
                <li><a href={PORTAL_LOGIN_URL}>{t.nav.agentSignIn}</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t.footer.contact}</h4>
              <ul>
                <li><a href={`mailto:${DAVID.email}`}>{DAVID.email}</a></li>
                <li><a href={waGeneral(t)} target="_blank" rel="noopener">{fmt(t.footer.whatsapp, { phone: DAVID.phone })}</a></li>
                <li><span>Ibiza · Formentera</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-middle">
          <span>Ibiza · Formentera · {t.footer.balearics}</span>
          <span>{t.footer.viewings}</span>
          <div className="site-menu__socials" style={{ margin: 0 }}>
            <a href="https://www.instagram.com/inveniohomes/" target="_blank" rel="noopener">Instagram</a>
            <a href="https://www.linkedin.com/company/invenio-homes/" target="_blank" rel="noopener">LinkedIn</a>
          </div>
        </div>
        <div className="footer-legal">
          <span>Invenio Homes SL · {t.footer.register} · Ibiza · Formentera</span>
          <span>© {new Date().getFullYear()} Invenio Homes Sales. {t.footer.rights}</span>
        </div>
      </div>
    </footer>
  );
}

/** Sales cards show the reference and the area, never the villa's name. */
export const listingTitle = (t: Dict, l: Listing) => (l.bedrooms ? fmt(t.card.titleBeds, { beds: l.bedrooms, area: l.area }) : fmt(t.card.title, { area: l.area }));
export const listingPrice = (t: Dict, l: Listing) => (l.priceOnRequest || l.askingPrice === null ? t.card.priceOnRequest : eur(l.askingPrice));
const m2 = (n: number) => `${Math.round(n).toLocaleString("en-GB")} m²`;

/** The facts strip under a listing: bedrooms, bathrooms, built, plot (what is known). */
export function Specs({ t, l, licence }: { t: Dict; l: Listing; licence?: string | null }) {
  const P = t.property;
  const beds = l.legalBedrooms ?? l.bedrooms;
  return (
    <div className="spec-bar property-specs">
      {beds ? <span className="spec"><Icon.bed /> {beds} {P.bedrooms.toLowerCase()}</span> : null}
      {l.bathrooms ? <span className="spec"><Icon.bath /> {l.bathrooms} {P.bathrooms.toLowerCase()}</span> : null}
      {l.builtM2 ? <span className="spec"><Icon.built /> {m2(l.builtM2)} {P.built.toLowerCase()}</span> : null}
      {l.plotM2 ? <span className="spec"><Icon.plot /> {m2(l.plotM2)} {P.plot.toLowerCase()}</span> : null}
      {licence ? <span className="spec"><Icon.licence /> {licence}</span> : null}
    </div>
  );
}

/** One listing per row, as on the Properties page of the company design (photo left, text right). */
export function ListingRow({ t, lang, l, eager }: { t: Dict; lang: Lang; l: Listing; eager?: boolean }) {
  const title = listingTitle(t, l);
  const to = href(lang, `/properties/${encodeURIComponent(l.ref)}`);
  const under = l.status === "under_offer";
  return (
    <article className="property-row">
      <Link className="property-row__media" href={to}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {l.photos[0] ? <img src={l.photos[0]} alt={`${title}, ${l.area}`} loading={eager ? "eager" : "lazy"} width="1600" height="1200" /> : null}
        <span className="property-badge">{under ? t.card.underOffer : t.property.forSale} · Ref. {l.ref}</span>
      </Link>
      <div className="property-row__body">
        <p className="eyebrow">{l.area}{l.district && l.district !== l.area ? ` · ${l.district}` : ""}</p>
        <h2>{title}</h2>
        {l.publicSummary ? <p className="lede">{firstSentence(l.publicSummary)}</p> : null}
        <Specs t={t} l={l} />
        <div className="property-row__foot">
          <div className="property-price"><span>{t.property.askingPriceLabel}</span><strong>{listingPrice(t, l)}</strong></div>
          <Link className="link" href={to}>{t.card.view}<Arrow /></Link>
        </div>
      </div>
    </article>
  );
}

/** Compact card for three-up grids (similar homes). */
export function ListingCard({ t, lang, l, as: H = "h3" }: { t: Dict; lang: Lang; l: Listing; as?: "h2" | "h3" }) {
  const title = listingTitle(t, l);
  const to = href(lang, `/properties/${encodeURIComponent(l.ref)}`);
  const under = l.status === "under_offer";
  return (
    <article className="villa-card">
      <Link className="villa-card__link" href={to}>
        <div className="villa-card__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.photos[0] ? <img src={l.photos[0]} alt={`${title}, ${l.area}`} loading="lazy" width="1200" height="1500" /> : null}
          <span className="villa-card__tag">{under ? t.card.underOffer : `Ref. ${l.ref}`}</span>
        </div>
        <div className="villa-card__body">
          <div className="villa-card__top">
            <H className="villa-card__name">{title}</H>
            <span className="villa-card__area">{l.area}</span>
          </div>
          <div className="villa-card__meta">
            <span>{l.legalBedrooms ?? l.bedrooms} {t.property.bedrooms.toLowerCase()}</span>
            <span>{l.bathrooms} {t.property.bathrooms.toLowerCase()}</span>
            {l.plotM2 ? <span>{m2(l.plotM2)} {t.property.plot.toLowerCase()}</span> : null}
          </div>
          <div className="villa-card__price"><strong>{listingPrice(t, l)}</strong></div>
        </div>
      </Link>
    </article>
  );
}

/** The first sentence (or 180 characters) of the sale text, for cards. */
export function firstSentence(text: string): string {
  const s = text.replace(/\s+/g, " ").trim();
  const m = s.match(/^.{40,220}?[.!?](\s|$)/);
  const out = m ? m[0].trim() : s.slice(0, 180).trim();
  return out.length < s.length && !/[.!?]$/.test(out) ? `${out}…` : out;
}

/** David's card: the one contact on every page. */
export function ExpertCard({ t, lang, text, cta = true }: { t: Dict; lang: Lang; text?: string; cta?: boolean }) {
  return (
    <div className="expert-card">
      <div className="expert-card__initials" aria-hidden="true">DR</div>
      <div className="expert-card__body">
        <p className="eyebrow">{t.home.contactEyebrow}</p>
        <h3>{DAVID.name}</h3>
        <p className="muted">{t.home.headOfSales}</p>
        {text ? <p className="expert-card__text">{text}</p> : null}
        <div className="expert-card__links">
          <a href={`mailto:${DAVID.email}`}><Icon.mail /> {DAVID.email}</a>
          <a href={waGeneral(t)} target="_blank" rel="noopener"><Icon.chat /> WhatsApp</a>
        </div>
      </div>
      {cta ? <a className="btn btn--ghost" href={`${href(lang, "/properties")}#brief`}>{t.nav.sendBrief}<Arrow /></a> : null}
    </div>
  );
}

/** Public pages: a plain message (the portal shows the technical one). */
export function DbNotice({ reason, message, t }: { reason: "no-db" | "error"; message?: string; t?: Dict }) {
  if (t) return <p className="notice">{reason === "no-db" ? t.db.missing : t.db.error}</p>;
  return (
    <p className="notice">
      {reason === "no-db"
        ? "The database is not connected to this deployment yet. Connect the portal's Neon database to this Vercel project and redeploy."
        : `Could not load from the database${message ? `: ${message}` : "."}`}
    </p>
  );
}
