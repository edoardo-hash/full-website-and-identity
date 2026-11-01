import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findByRef, publicListings } from "@/lib/data";
import { isLicensed, matchRequest } from "@/lib/rules";
import { fmt, href, isLang, type Lang } from "@/lib/i18n";
import { getDict, translateText } from "@/lib/i18n/translate";
import { FEATURE_GROUPS, FEATURES, featureText } from "@/lib/features";
import { Arrow, DAVID, DbNotice, ExpertCard, Icon, ListingCard, listingPrice, listingTitle, SiteFooter, SiteHeader, Specs, whatsapp } from "@/components/site";
import { Gallery } from "@/components/gallery";
import { submitEnquiry } from "@/app/actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string; ref: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;
const L = (s: string): Lang => (isLang(s) ? s : "en");

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ref } = await params;
  return { title: `Ref. ${decodeURIComponent(ref)}` };
}

/**
 * One villa for sale: the same page as the villa of a rental offer (invenio-portal /o2/<code>/<uuid>, 1 Nov 2026) —
 * title and area, gallery, facts, text, features in groups, location as an area, a sticky panel — with sale information
 * in place of dates and stay terms. Reference and area only, never the villa's name; the exact address, the full
 * gallery and the documents come after the owner has confirmed the buyer.
 */
export default async function Property({ params, searchParams }: { params: Params; searchParams: SP }) {
  const p = await params;
  const lang = L(p.lang);
  const sp = await searchParams;
  const [t, res] = await Promise.all([getDict(lang), publicListings()]);
  const P = t.property;
  if (!res.ok) {
    return (
      <>
        <SiteHeader t={t} lang={lang} current="properties" />
        <main id="main" className="wrap thanks"><DbNotice reason={res.reason} t={t} /></main>
        <SiteFooter t={t} lang={lang} />
      </>
    );
  }
  const l = await findByRef(res.data, p.ref);
  if (!l) notFound();
  const summary = await translateText(lang, l.publicSummary);
  const hidePrice = sp.noprice === "1" || l.priceOnRequest || l.askingPrice === null;
  const similar = matchRequest(
    { budgetMin: null, budgetMax: (l.askingPrice ?? 0) * 1.4 || null, areas: [l.area, l.district], minBedrooms: Math.max(1, l.bedrooms - 1), mustHaves: [], licenceNeeded: false },
    res.data.filter((x) => x.uuid !== l.uuid),
  ).slice(0, 3).map((m) => m.listing);
  const licensed = isLicensed(l.licence);
  const title = listingTitle(t, l);
  const status = l.status === "under_offer" ? P.underOffer : P.forSale;
  const licenceLine = licensed ? `${P.touristLicence}: ${(l.licenceTransferable ? P.licenceTransferable : P.yes).toLowerCase()}` : null;
  // Yes only: a buyer sees what the home has, never a list of "no".
  const featureGroups = FEATURE_GROUPS.map((g) => ({
    g,
    items: FEATURES.filter((f) => f.group === g && l.saleFeatures.has(f.key)).map((f) => featureText(t.mustHave, f.key, l.saleFeatures.get(f.key) ?? null)),
  })).filter((x) => x.items.length);
  const km = (n: number | null | undefined) => (n === null || n === undefined ? null : fmt(P.km, { n: n < 10 ? n.toFixed(1) : Math.round(n) }));
  const distances = l.road
    ? ([
        [P.distBeach, l.road.beach?.name ?? null, km(l.road.beach?.km)],
        [P.distVillage, l.road.village?.name ?? null, km(l.road.village?.km)],
        [P.distTown, null, km(l.road.town)],
        [P.distAirport, null, km(l.road.airport)],
      ] as [string, string | null, string | null][]).filter((d) => d[2])
    : [];
  const g = l.approxGps;
  const bbox = g ? [g.lng - 0.012, g.lat - 0.0095, g.lng + 0.012, g.lat + 0.0095].map((n) => n.toFixed(4)).join(",") : null;
  const wa = whatsapp(fmt(P.whatsappText, { ref: l.ref }));

  return (
    <>
      <SiteHeader t={t} lang={lang} current="properties" />
      <main id="main">
        <section className="villa-head">
          <div className="wrap">
            <nav className="breadcrumbs" aria-label={P.breadcrumb}>
              <Link href={href(lang, "/")}>{t.nav.sales}</Link><span>/</span><Link href={href(lang, "/properties")}>{t.nav.properties}</Link><span>/</span><span>{l.ref}</span>
            </nav>
            <div className="villa-head__top">
              <div>
                <p className="eyebrow">{status} · Ref. {l.ref}</p>
                <h1>{title}</h1>
                <p className="villa-head__tagline">{l.area}{l.district && l.district !== l.area ? `, ${l.district}` : ""} · {P.locationLine}</p>
              </div>
              <div className="villa-head__area"><strong>{l.area}</strong>{l.district && l.district !== l.area ? `${l.district}, ` : ""}Ibiza</div>
            </div>
            <Specs t={t} l={l} licence={licenceLine} />
          </div>
        </section>

        <div className="wrap">
          <Gallery photos={l.photos} alts={l.photos.slice(0, 5).map((_, i) => fmt(P.photoAlt, { title, n: i + 1 }))} close={P.close} note={l.photos.length > 5 ? fmt(P.morePhotos, { n: l.photos.length }) : undefined} />
        </div>

        <div className="wrap">
          <div className="villa-layout">
            <div className="villa-main">
              <section className="villa-section">
                <div className="villa-intro">
                  {summary ? summary.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>) : <p className="muted">{P.noText}</p>}
                </div>
              </section>

              {featureGroups.length ? (
                <section className="villa-section">
                  <h2>{P.featuresTitle}</h2>
                  <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>{P.featuresLead}</p>
                  <div className="amenity-groups">
                    {featureGroups.map(({ g, items }) => (
                      <div key={g} className="amenity-group">
                        <h4>{t.featureGroups[g]}</h4>
                        <ul className="amenity-list">{items.map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="villa-section">
                <h2>{P.checkedTitle}</h2>
                <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>{P.checkedLead}</p>
                <ul className="doc-list">{[P.checked1, P.checked2, P.checked3, P.checked4, P.checked5, P.checked6].map((x) => <li key={x}><Icon.tick /><span>{x}</span></li>)}</ul>
              </section>

              <section className="villa-section">
                <h2>{P.sharedTitle}</h2>
                <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>{P.sharedLead}</p>
                <ul className="doc-list doc-list--locked">{[P.shared1, P.shared2, P.shared3, P.shared4, P.shared5, P.shared6].map((x) => <li key={x}><Icon.lock /><span>{x}</span></li>)}</ul>
              </section>

              <section className="villa-section">
                <h2>{P.goodToKnow}</h2>
                <dl className="fact-grid">
                  <div className="fact"><dt>{P.reference}</dt><dd>{l.ref}</dd></div>
                  <div className="fact"><dt>{P.touristLicence}</dt><dd>{licensed ? (l.licenceTransferable ? P.licenceTransferable : P.yes) : P.noLicence}</dd></div>
                  {l.legalBedrooms && l.legalBedrooms !== l.bedrooms ? <div className="fact"><dt>{P.bedroomsLegal}</dt><dd>{fmt(P.bedroomsLegalText, { legal: l.legalBedrooms, described: l.bedrooms })}</dd></div> : null}
                  <div className="fact"><dt>{P.rented}</dt><dd>{l.rentableWhileOnSale === null ? P.askUs : l.rentableWhileOnSale ? P.rentedYes : P.no}</dd></div>
                  <div className="fact"><dt>{P.viewings}</dt><dd>{P.viewingsText}</dd></div>
                  <div className="fact"><dt>{P.cadastral}</dt><dd>{P.afterRegistration}</dd></div>
                  <div className="fact"><dt>{P.signing}</dt><dd>{P.signingText}</dd></div>
                </dl>
              </section>

              <section className="villa-section">
                <h2>{P.location}</h2>
                <p className="muted" style={{ fontSize: 14 }}>{P.locationLead}</p>
                {distances.length ? (
                  <div className="distance-list">
                    {distances.map(([k, name, v]) => (
                      <div key={k} className="distance-row"><span className="distance-row__label">{k}</span><span className="distance-row__name">{name ?? ""}</span><span className="distance-row__km">{v}</span></div>
                    ))}
                  </div>
                ) : null}
                {bbox && g ? (
                  <>
                    <div className="map-frame map-frame--area" style={{ marginTop: 26 }}>
                      <iframe title={fmt(P.mapTitle, { area: l.area })} src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`} loading="lazy" />
                    </div>
                    <div className="map-note">
                      <span>{P.areaOnly} · {l.area}, Ibiza</span>
                      <a className="link" href={`https://www.openstreetmap.org/#map=14/${g.lat.toFixed(4)}/${g.lng.toFixed(4)}`} target="_blank" rel="noopener">{P.openInMaps}</a>
                    </div>
                  </>
                ) : (
                  <p className="map-note" style={{ marginTop: 18 }}><span>{P.areaOnly} · {l.area}, Ibiza</span></p>
                )}
              </section>
            </div>

            <aside>
              <div className="booking property-panel" aria-label={fmt(P.askAbout, { ref: l.ref })}>
                <p className="eyebrow">{fmt(hidePrice ? P.priceLabel : P.askingPrice, { ref: l.ref })}</p>
                <div className="panel-price"><strong>{hidePrice ? P.onRequest : listingPrice(t, l)}</strong><span>{status}</span></div>
                <div className="panel-rows">
                  <div><span>{P.status}</span><strong>{status}</strong></div>
                  <div><span>{P.bedrooms}</span><strong>{l.legalBedrooms ?? l.bedrooms}</strong></div>
                  <div><span>{P.bathrooms}</span><strong>{l.bathrooms}</strong></div>
                  <div><span>{P.touristLicence}</span><strong>{licensed ? P.yes : P.no}</strong></div>
                </div>
                <form id="enquire" action={submitEnquiry} className="panel-form"><div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                  {sp.error ? <p className="note-err" role="alert">{t.brief.error}</p> : null}
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="ref" value={l.ref} />
                  <div className="panel-form__fields">
                    <div className="field"><label htmlFor="e-name">{t.brief.name} <span aria-hidden="true">*</span></label><input id="e-name" name="name" autoComplete="name" required aria-required="true" /></div>
                    <div className="field"><label htmlFor="e-email">{t.brief.email}</label><input id="e-email" name="email" type="email" autoComplete="email" /></div>
                    <div className="field"><label htmlFor="e-phone">{t.brief.phone}</label><input id="e-phone" name="phone" type="tel" autoComplete="tel" /></div>
                  </div>
                  <div className="field"><label htmlFor="e-msg">{P.message}</label><textarea id="e-msg" name="message" rows={3} placeholder={P.messageExample} /></div>
                  <label className="check-line"><input type="checkbox" name="consent" required /><span>{P.consent}</span></label>
                  <button className="btn btn--block" type="submit" name="what" value="details">{P.request}</button>
                  <button className="btn btn--block btn--ghost" type="submit" name="what" value="viewing">{P.viewing}</button>
                  <p className="panel-note" style={{ marginTop: 0 }}>{P.viewingNote}</p>
                </form>
                <div className="booking__contact">
                  <a href={`mailto:${DAVID.email}`}><Icon.mail /> {DAVID.email}</a>
                  <a href={wa} target="_blank" rel="noopener"><Icon.chat /> {t.home.whatsappDavid}</a>
                  <a href={DAVID.tel}><Icon.phone /> {DAVID.phone}</a>
                </div>
                <p className="panel-note">{P.registerNote}</p>
              </div>
            </aside>
          </div>
        </div>

        {similar.length ? (
          <section className="section section--tight" style={{ paddingTop: 0 }}>
            <div className="wrap">
              <div className="section-head">
                <div><p className="eyebrow">{P.alsoLike}</p><h2>{P.similar}</h2></div>
                <div className="section-head__aside"><Link className="link" href={href(lang, "/properties")}>{t.home.allProperties}<Arrow /></Link></div>
              </div>
              <div className="villa-grid">{similar.map((s) => <ListingCard key={s.uuid} t={t} lang={lang} l={s} />)}</div>
            </div>
          </section>
        ) : null}

        <section className="section section--sand section--tight">
          <div className="wrap">
            <div className="brief-layout">
              <div>
                <p className="eyebrow">{P.elseEyebrow}</p>
                <h2>{P.elseTitle}</h2>
                <p>{P.elseText}</p>
              </div>
              <ExpertCard t={t} lang={lang} />
            </div>
          </div>
        </section>
      </main>
      {/* Phones: the price and the enquiry button stay in reach while the page is read (company site's mobile bar). */}
      <div className="mobile-bar">
        <div className="mobile-bar__price">{hidePrice ? P.priceLabel.replace("Ref. {ref} · ", "") : P.askingPriceLabel}<strong>{hidePrice ? P.onRequest : listingPrice(t, l)}</strong></div>
        <a className="btn btn--small" href="#enquire">{P.request}</a>
      </div>
      <SiteFooter t={t} lang={lang} />
    </>
  );
}
